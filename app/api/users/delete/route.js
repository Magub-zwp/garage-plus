import { NextResponse } from 'next/server'
import { getAdmin, verifyToken, authErrorResponse } from '@/lib/api/verifyAuth'

/**
 * DELETE /api/users/delete
 * ลบข้อมูลของผู้ใช้ที่ล็อกอินอยู่ (uid มาจาก token เท่านั้น) ตาม PDPA
 * - ลบ users, cars, notifications + ลบ Auth account
 * - Anonymize bookings/repairs (อู่ต้องเก็บบันทึกธุรกิจ)
 * ทำผ่าน Admin SDK บน server เท่านั้น
 */

// ลบเอกสารทีละชุด 400 กัน batch เกินลิมิต Firestore (500 ops/batch)
async function deleteQuery(db, q) {
  const snap = await q.get()
  for (let i = 0; i < snap.docs.length; i += 400) {
    const batch = db.batch()
    snap.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref))
    await batch.commit()
  }
}

// อัปเดต (anonymize) ทีละชุด 400 ด้วยเหตุผลเดียวกัน
async function updateQuery(db, q, data) {
  const snap = await q.get()
  for (let i = 0; i < snap.docs.length; i += 400) {
    const batch = db.batch()
    snap.docs.slice(i, i + 400).forEach((d) => batch.update(d.ref, data))
    await batch.commit()
  }
}

export async function DELETE(request) {
  try {
    const { uid } = await verifyToken(request)   // เชื่อ uid จาก token เท่านั้น
    const { auth, db } = await getAdmin()
    const now = new Date()

    await db.doc(`users/${uid}`).delete()
    await deleteQuery(db, db.collection('cars').where('userId', '==', uid))
    await deleteQuery(db, db.collection('notifications').where('userId', '==', uid))
    await updateQuery(db, db.collection('bookings').where('userId', '==', uid),
      { userId: '[deleted]', carPlate: '[deleted]', carName: '[deleted]', note: '', updatedAt: now })
    await updateQuery(db, db.collection('repairs').where('userId', '==', uid),
      { userId: '[deleted]', updatedAt: now })

    await auth.deleteUser(uid).catch(() => {})  // ลบ Auth account สุดท้าย (ไม่มีก็ข้าม)

    return NextResponse.json({ ok: true, message: 'ลบข้อมูลสำเร็จ' })
  } catch (err) {
    const authErr = authErrorResponse(err)
    if (authErr) return authErr
    console.error('[DELETE /api/users/delete]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
