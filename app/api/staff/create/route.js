import { NextResponse } from 'next/server'
import { getAdmin, requireAdmin, authErrorResponse } from '@/lib/api/verifyAuth'

/**
 * POST /api/staff/create
 * สร้าง Firebase Auth account + /staff/{uid} document สำหรับพนักงานใหม่
 * เฉพาะ admin เท่านั้น (กันคนนอกสร้างไอดี staff เอง)
 */
export async function POST(request) {
  try {
    await requireAdmin(request)   // ต้องเป็น admin

    const { name, email, password, role } = await request.json()

    if (!name?.trim() || !email?.trim() || !password || !role) {
      return NextResponse.json({ error: 'กรุณากรอกข้อมูลให้ครบ' }, { status: 400 })
    }
    if (!['admin','mechanic'].includes(role)) {
      return NextResponse.json({ error: 'role ต้องเป็น admin หรือ mechanic' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัว' }, { status: 400 })
    }

    const { auth, db } = await getAdmin()

    const newUser = await auth.createUser({
      email:       email.trim(),
      password,
      displayName: name.trim(),
    })

    await db.doc(`staff/${newUser.uid}`).set({
      name:      name.trim(),
      email:     email.trim(),
      role,
      createdAt: new Date(),
    })

    return NextResponse.json({ uid: newUser.uid, message: 'สร้างพนักงานสำเร็จ' }, { status: 201 })

  } catch(err) {
    const authErr = authErrorResponse(err)
    if (authErr) return authErr
    console.error('[POST /api/staff/create]', err)
    const msgs = {
      'auth/email-already-exists': 'อีเมลนี้มีบัญชีอยู่แล้ว',
      'auth/invalid-email':        'รูปแบบอีเมลไม่ถูกต้อง',
      'auth/weak-password':        'รหัสผ่านต้องมีอย่างน้อย 6 ตัว',
    }
    return NextResponse.json(
      { error: msgs[err.code] || err.message },
      { status: err.code?.startsWith('auth/') ? 400 : 500 }
    )
  }
}
