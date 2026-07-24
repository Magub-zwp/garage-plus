import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { verifyToken, authErrorResponse } from '@/lib/api/verifyAuth'

/**
 * GET /api/auth/line/link-init
 * เรียกตอน user ที่ login อยู่แล้ว (Google/อีเมล) กด "เชื่อมบัญชี LINE" ในหน้า settings
 * ออก state ที่เซ็นด้วย HMAC (ผูกกับ uid ปัจจุบัน + หมดอายุ 5 นาที) กันคนอื่นปลอม state
 * มาเชื่อม LINE เข้ากับ uid ของคนอื่นโดยไม่ได้รับอนุญาต (account takeover)
 */
export async function GET(request) {
  try {
    const decoded = await verifyToken(request)
    const uid = decoded.uid

    const channelId = process.env.NEXT_PUBLIC_LINE_CHANNEL_ID
    const secret     = process.env.LINE_CHANNEL_SECRET
    if (!channelId || !secret) {
      return NextResponse.json({ error: 'LINE Login ยังไม่ได้ตั้งค่า' }, { status: 500 })
    }

    const expiry  = Date.now() + 5 * 60 * 1000 // ticket หมดอายุใน 5 นาที
    const payload = `${uid}.${expiry}`
    const sig     = crypto.createHmac('sha256', secret).update(payload).digest('hex')
    const csrf    = crypto.randomBytes(8).toString('hex')
    const state   = `link.${payload}.${sig}.${csrf}`

    const { origin } = new URL(request.url)
    const redirectUri = `${origin}/api/auth/line/callback`
    const url = `https://access.line.me/oauth2/v2.1/authorize?` +
      `response_type=code&client_id=${channelId}&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&state=${encodeURIComponent(state)}&scope=profile%20openid`

    return NextResponse.json({ url })
  } catch (err) {
    return authErrorResponse(err) || NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 })
  }
}
