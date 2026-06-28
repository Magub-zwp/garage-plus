import { NextResponse } from 'next/server'
import { getAdmin } from '@/lib/firebase/admin'

/**
 * GET /api/auth/line/callback?code=...&state=...
 *
 * Flow:
 *   1. Exchange code → LINE access_token
 *   2. ดึง LINE profile
 *   3. สร้างหรือหา Firebase user (Admin SDK)
 *   4. สร้าง Firebase custom token
 *   5. เก็บ token ใน http-only cookie → redirect /login?line_auth=1&state=<state>
 *      (ไม่ส่ง token ใน URL เพื่อป้องกัน token leak ใน browser history / server log)
 */
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const code  = searchParams.get('code')
  const error = searchParams.get('error')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || origin

  if (error) {
    return NextResponse.redirect(`${appUrl}/login?error=line_denied`)
  }
  if (!code) {
    return NextResponse.redirect(`${appUrl}/login`)
  }

  try {
    // ─── 1. Exchange code → LINE access token 
    const channelId     = process.env.NEXT_PUBLIC_LINE_CHANNEL_ID
    const channelSecret = process.env.LINE_CHANNEL_SECRET

    if (!channelId || !channelSecret) {
      console.error('[LINE callback] Missing LINE_CHANNEL_SECRET in env')
      return NextResponse.redirect(`${appUrl}/login?error=config_missing`)
    }

    // redirect_uri ที่ส่งไป LINE ต้องตรงกับที่ลงทะเบียนใน LINE Console
    const redirectUri = `${appUrl}/api/auth/line/callback`

    const tokenRes = await fetch('https://api.line.me/oauth2/v2.1/token', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    new URLSearchParams({
        grant_type:    'authorization_code',
        code,
        redirect_uri:  redirectUri,
        client_id:     channelId,
        client_secret: channelSecret,
      }),
    })

    const tokenData = await tokenRes.json()
    if (!tokenData.access_token) {
      console.error('[LINE callback] Token exchange failed:', tokenData)
      return NextResponse.redirect(`${appUrl}/login?error=line_failed`)
    }

    // ─── 2. ดึง LINE Profile ด้วย access token
    const profileRes = await fetch('https://api.line.me/v2/profile', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    const profile = await profileRes.json()

    if (!profile.userId) {
      return NextResponse.redirect(`${appUrl}/login?error=line_failed`)
    }

    const lineUid = profile.userId
    const name    = profile.displayName || 'ผู้ใช้ LINE'
    const picture = profile.pictureUrl  || ''

    // ─── 3. Admin SDK — หาหรือสร้าง Firebase user
    const { auth: adminAuth, db: adminDb } = await getAdmin()

    let firebaseUid

    // ลองหา user เดิมจาก LINE uid (เก็บใน Firestore users.lineId)
    const existingSnap = await adminDb
      .collection('users')
      .where('lineId', '==', lineUid)
      .limit(1)
      .get()

    if (!existingSnap.empty) {
      firebaseUid = existingSnap.docs[0].id
    } else {
      // สร้าง Firebase user ใหม่
      const newUser = await adminAuth.createUser({
        displayName: name,
        photoURL:    picture || undefined,
      })
      firebaseUid = newUser.uid

      // สร้าง Firestore user document
      // H5 FIX: consentAccepted = false เพื่อบังคับให้ user เห็นหน้า consent ก่อน
      // (ไม่ตั้งเป็น true อัตโนมัติ — ขัดกับ PDPA)
      await adminDb.doc(`users/${firebaseUid}`).set({
        name,
        lineId:           lineUid,
        email:            '',
        phone:            '',
        birthday:         '',
        points:           0,
        usageCount:       0,
        memberSince:      new Date(),
        notifPrefs:       { status: true, promo: true, maintenance: true, line: true },
        darkMode:         true,
        language:         'th',
        fcmToken:         '',
        consentAccepted:  false,
        consentDate:      null,
        consentVersion:   '1.0',
        marketingConsent: false,
        isNewLineUser:    true,
      })
    }

    // ─── 4. สร้าง Firebase custom token
    const customToken = await adminAuth.createCustomToken(firebaseUid)

    // ─── 5. เก็บ token ใน http-only cookie แล้ว redirect โดยไม่ใส่ token ใน URL
    const state = searchParams.get('state') || ''
    const response = NextResponse.redirect(`${appUrl}/login?line_auth=1&state=${state}`)
    response.cookies.set('_lt', customToken, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge:   60, // 60 วินาที — พอสำหรับ redirect flow
      path:     '/',
    })
    return response

  } catch (err) {
    console.error('[LINE callback] Error:', err)
    return NextResponse.redirect(`${appUrl}/login?error=line_failed`)
  }
}
