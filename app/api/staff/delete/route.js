import { NextResponse } from 'next/server'
import { getAdmin } from '@/lib/firebase/admin'
import { requireAdmin } from '@/lib/api/verifyAuth'

/**
 * DELETE /api/staff/delete
 * ลบ Firebase Auth account + /staff/{uid} document
 * ต้องการ role=admin เท่านั้น
 */
export async function DELETE(request) {
  const caller = await requireAdmin(request)
  if (!caller) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { uid } = await request.json()
    if (!uid) return NextResponse.json({ error: 'uid required' }, { status: 400 })

    const { auth, db } = await getAdmin()

    try { await auth.deleteUser(uid) } catch (e) {
      if (e.code !== 'auth/user-not-found') throw e
    }

    await db.doc(`staff/${uid}`).delete()

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/staff/delete]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
