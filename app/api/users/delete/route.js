import { NextResponse } from 'next/server'
import { deleteAllUserData } from '@/lib/firebase/deleteUserData'

/**
 * DELETE /api/users/delete
 * Body: { uid: string }
 * ลบข้อมูลทั้งหมดของ user ตาม PDPA
 */
export async function DELETE(request) {
  try {
    const { uid } = await request.json()
    if (!uid) return NextResponse.json({ error: 'uid required' }, { status: 400 })
    await deleteAllUserData(uid)
    return NextResponse.json({ ok: true, message: 'ลบข้อมูลสำเร็จ' })
  } catch (err) {
    console.error('[DELETE /api/users/delete]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
