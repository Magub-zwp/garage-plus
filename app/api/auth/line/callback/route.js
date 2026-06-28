import { NextResponse } from 'next/server'
import { getAdmin } from '@/lib/api/verifyAuth'

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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || origin

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
