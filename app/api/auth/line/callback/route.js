import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { getAdmin } from '@/lib/api/verifyAuth'

// ตรวจ state ที่ออกโดย /api/auth/line/link-init (รูปแบบ "link.<uid>.<expiry>.<sig>.<csrf>")
// คืน uid ถ้า signature ถูกต้องและยังไม่หมดอายุ, คืน null ถ้าไม่ใช่ link-mode หรือปลอมมา
function verifyLinkState(state, secret) {
  if (!state || !state.startsWith('link.')) return null
  const parts = state.split('.')
  if (parts.length < 5) return null
  const [, uid, expiryStr, sig] = parts
  const expiry  = Number(expiryStr)
  const payload = `${uid}.${expiryStr}`
  const expectedSig = crypto.createHmac('sha256', secret).update(payload).digest('hex')
  if (sig !== expectedSig) return null            // signature ไม่ตรง — ปลอมมา
  if (!expiry || Date.now() > expiry) return null // หมดอายุ
  return uid
}

/**
 * GET /api/auth/line/callback?code=...&state=...
 * LINE OAuth: แลก code → สร้าง/หา Firebase user → custom token
 * แล้วส่ง token กลับผ่าน HttpOnly cookie (_lt) ไม่ใส่ใน URL เพื่อกัน token หลุด
 */
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const code  = searchParams.get('code')
  const state = searchParams.get('state') || ''   // echo กลับให้ client ตรวจ CSRF
  const error = searchParams.get('error')

  // ใช้ origin จริงที่ผู้ใช้เข้ามาเสมอ — ต้องตรงกับ redirect_uri ที่หน้า login ส่งไป (window.location.origin)
  // ไม่งั้น LINE จะปฏิเสธตอนแลก token เพราะ redirect_uri ไม่ตรง
  // บน Cloud Run/Firebase App Hosting, request.url เป็น internal URL (เช่น 0.0.0.0:8080)
  // เพราะ request ผ่าน reverse proxy มาก่อน ต้องอ่าน host จริงจาก x-forwarded-* header แทน
  const fwdProto = request.headers.get('x-forwarded-proto')
  const fwdHost  = request.headers.get('x-forwarded-host') || request.headers.get('host')
  const appUrl = fwdHost ? `${fwdProto || 'https'}://${fwdHost}` : origin

  if (error) return NextResponse.redirect(`${appUrl}/login?error=line_denied`)
  if (!code)  return NextResponse.redirect(`${appUrl}/login`)

  try {
    // ─── 1. แลก code → LINE access token
    const channelId     = process.env.NEXT_PUBLIC_LINE_CHANNEL_ID
    const channelSecret = process.env.LINE_CHANNEL_SECRET
    if (!channelId || !channelSecret) {
      console.error('[LINE callback] Missing LINE_CHANNEL_SECRET in env')
      return NextResponse.redirect(`${appUrl}/login?error=config_missing`)
    }
    const redirectUri = `${appUrl}/api/auth/line/callback`

    const tokenRes = await fetch('https://api.line.me/oauth2/v2.1/token', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    new URLSearchParams({
        grant_type: 'authorization_code', code, redirect_uri: redirectUri,
        client_id: channelId, client_secret: channelSecret,
      }),
    })
    const tokenData = await tokenRes.json()
    if (!tokenData.access_token) {
      console.error('[LINE callback] Token exchange failed:', tokenData)
      return NextResponse.redirect(`${appUrl}/login?error=line_failed`)
    }

    // ─── 2. ดึง LINE profile
    const profileRes = await fetch('https://api.line.me/v2/profile', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    const profile = await profileRes.json()
    if (!profile.userId) return NextResponse.redirect(`${appUrl}/login?error=line_failed`)

    const lineUid = profile.userId
    const name    = profile.displayName || 'ผู้ใช้ LINE'
    const picture = profile.pictureUrl  || ''

    // ─── 3. หา/สร้าง Firebase user ผ่าน Admin SDK
    const { auth: adminAuth, db: adminDb } = await getAdmin()
    let firebaseUid

    const existingSnap = await adminDb.collection('users').where('lineId', '==', lineUid).limit(1).get()

    // ─── โหมด "เชื่อมบัญชี": user ที่ login อยู่แล้ว (Google/อีเมล) มาผูก LINE เพิ่มเข้าบัญชีเดิม
    // (state ถูกเซ็นมาจาก /api/auth/line/link-init แล้ว ต้องผ่านการ verify signature ก่อนเชื่อถือ)
    const linkUid = verifyLinkState(state, channelSecret)
    if (linkUid) {
      if (!existingSnap.empty && existingSnap.docs[0].id !== linkUid) {
        // LINE บัญชีนี้ผูกกับ Firebase user คนอื่นไปแล้ว ห้ามแย่งมาผูกซ้ำ
        return NextResponse.redirect(`${appUrl}/settings?lineLinkError=already_linked`)
      }
      await adminDb.doc(`users/${linkUid}`).set({ lineId: lineUid }, { merge: true })
      return NextResponse.redirect(`${appUrl}/settings?lineLinked=1`)
    }

    if (!existingSnap.empty) {
      firebaseUid = existingSnap.docs[0].id
    } else {
      const newUser = await adminAuth.createUser({ displayName: name, photoURL: picture || undefined })
      firebaseUid = newUser.uid
      await adminDb.doc(`users/${firebaseUid}`).set({
        name, lineId: lineUid, email: '', phone: '', birthday: '',
        points: 0, usageCount: 0, memberSince: new Date(),
        notifPrefs: { status: true, promo: true, maintenance: true, line: true },
        darkMode: true, language: 'th', fcmToken: '',
        // PDPA: ต้องให้ลูกค้ายอมรับเองเสมอ ห้าม default เป็น true
        consentAccepted: false,
        consentDate: null,
        consentVersion: '1.0',
        marketingConsent: false,
      })
    }

    // ─── 4. custom token → ส่งผ่าน HttpOnly cookie (อายุ 2 นาที, ใช้ครั้งเดียว)
    const customToken = await adminAuth.createCustomToken(firebaseUid)
    const res = NextResponse.redirect(`${appUrl}/login?line=1&state=${encodeURIComponent(state)}`)
    res.cookies.set('_lt', customToken, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path:     '/',
      maxAge:   120,
    })
    return res

  } catch (err) {
    console.error('[LINE callback] Error:', err)
    return NextResponse.redirect(`${appUrl}/login?error=line_failed`)
  }
}
