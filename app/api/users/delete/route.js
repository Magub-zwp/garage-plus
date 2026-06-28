import { NextResponse } from 'next/server'
import { deleteAllUserData } from '@/lib/firebase/deleteUserData'
import { getAdmin } from '@/lib/firebase/admin'
import { verifyToken } from '@/lib/api/verifyAuth'

/**
 * DELETE /api/users/delete
 * Body: { uid: string }
 * ลบข้อมูลทั้งหมดของ user ตาม PDPA
 * ต้องการ Firebase ID token และ uid ต้องตรงกับ caller (เจ้าของเท่านั้นลบตัวเองได้)
 */
export async function DELETE(request) {
  const decoded = await verifyToken(request)
  if (!decoded) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { uid } = await request.json()
    if (!uid) return NextResponse.json({ error: 'uid required' }, { status: 400 })

    // ตรวจว่า caller คือเจ้าของบัญชีนั้นจริง
    if (decoded.uid !== uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // ลบข้อมูล Firestore (batch: users, cars, bookings, repairs, notifications)
    await deleteAllUserData(uid)

    // ลบ Firebase Auth account ด้วย Admin SDK (client SDK ทำบน server ไม่ได้)
    const { auth } = await getAdmin()
    try { await auth.deleteUser(uid) } catch (e) {
      if (e.code !== 'auth/user-not-found') throw e
    }

    return NextResponse.json({ ok: true, message: 'ลบข้อมูลสำเร็จ' })
  } catch (err) {
    console.error('[DELETE /api/users/delete]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
