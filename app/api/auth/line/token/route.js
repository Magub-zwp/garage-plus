import { NextResponse } from 'next/server'

/**
 * GET /api/auth/line/token
 * อ่าน custom token จาก HttpOnly cookie (_lt) คืนให้หน้า login แล้วลบ cookie ทิ้งทันที (ใช้ครั้งเดียว)
 */
export async function GET(request) {
  const token = request.cookies.get('_lt')?.value
  if (!token) return NextResponse.json({ error: 'no_token' }, { status: 404 })

  const res = NextResponse.json({ token })
  res.cookies.set('_lt', '', { httpOnly: true, path: '/', maxAge: 0 })   // ลบทิ้ง
  return res
}
