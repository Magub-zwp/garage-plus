import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

/**
 * GET /api/auth/line/token
 * อ่าน LINE custom token จาก http-only cookie แล้วลบทิ้งทันที (one-time use)
 * client เรียกหลังจาก callback redirect มาที่ /login?line_auth=1
 */
export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get('_lt')?.value
  if (!token) {
    return NextResponse.json({ error: 'no_token' }, { status: 401 })
  }
  const response = NextResponse.json({ token })
  response.cookies.delete('_lt')
  return response
}
