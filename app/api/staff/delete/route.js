import { NextResponse } from 'next/server'
import { getAdmin, requireAdmin, authErrorResponse } from '@/lib/api/verifyAuth'

/**
 * DELETE /api/staff/delete
 * ลบ Firebase Auth account + /staff/{uid} document — เฉพาะ admin
 */
export async function DELETE(request) {
  try {
    const { decoded } = await requireAdmin(request)   // ต้องเป็น admin

    const { uid } = await request.json()
    if (!uid) return NextResponse.json({ error: 'uid required' }, { status: 400 })
    if (uid === decoded.uid) return NextResponse.json({ error: 'ลบบัญชีตัวเองไม่ได้' }, { status: 400 })

    const { auth, db } = await getAdmin()

    try { await auth.deleteUser(uid) } catch(e) {
      if (e.code !== 'auth/user-not-found') throw e   // ไม่มี account ก็ข้าม
    }
    await db.doc(`staff/${uid}`).delete()

    return NextResponse.json({ ok: true })
  } catch(err) {
    const authErr = authErrorResponse(err)
    if (authErr) return authErr
    console.error('[DELETE /api/staff/delete]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
