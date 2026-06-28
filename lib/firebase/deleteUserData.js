import { getAdmin } from './admin'
import { FieldValue } from 'firebase-admin/firestore'

// Firestore batch สูงสุด 500 ops — ตัดเป็น chunk 499 เพื่อความปลอดภัย
async function commitInChunks(db, ops) {
  for (let i = 0; i < ops.length; i += 499) {
    const batch = db.batch()
    ops.slice(i, i + 499).forEach((fn) => fn(batch))
    await batch.commit()
  }
}

/**
 * ลบข้อมูลทั้งหมดของ user ตาม PDPA (ใช้ Admin SDK — bypass Firestore Rules)
 * - ลบ users, cars, notifications ทันที
 * - Anonymize bookings + repairs (อู่ยังต้องเก็บบันทึกธุรกิจ)
 * - รองรับ user ที่มี record เยอะ (chunking batch ทุก 499 ops)
 */
export async function deleteAllUserData(uid) {
  const { db } = await getAdmin()
  const ops = []

  // 1. ลบ user document
  ops.push((batch) => batch.delete(db.doc(`users/${uid}`)))

  // 2. ลบรถทุกคัน
  const carsSnap = await db.collection('cars').where('userId', '==', uid).get()
  carsSnap.forEach((d) => ops.push((batch) => batch.delete(d.ref)))

  // 3. Anonymize bookings — ไม่ลบ (ข้อมูลธุรกิจของอู่ เก็บ 1 ปี)
  const bookingsSnap = await db.collection('bookings').where('userId', '==', uid).get()
  bookingsSnap.forEach((d) =>
    ops.push((batch) =>
      batch.update(d.ref, {
        userId:    '[deleted]',
        carPlate:  '[deleted]',
        carName:   '[deleted]',
        note:      '',
        updatedAt: FieldValue.serverTimestamp(),
      })
    )
  )

  // 4. Anonymize repairs — ไม่ลบ (เก็บ 3 ปี)
  const repairsSnap = await db.collection('repairs').where('userId', '==', uid).get()
  repairsSnap.forEach((d) =>
    ops.push((batch) =>
      batch.update(d.ref, {
        userId:    '[deleted]',
        updatedAt: FieldValue.serverTimestamp(),
      })
    )
  )

  // 5. ลบ notifications ทั้งหมด
  const notifsSnap = await db.collection('notifications').where('userId', '==', uid).get()
  notifsSnap.forEach((d) => ops.push((batch) => batch.delete(d.ref)))

  // 6. Commit ทีละ 499 ops เพื่อไม่เกิน Firestore limit
  await commitInChunks(db, ops)

  // หมายเหตุ: Firebase Auth account ถูกลบโดย API route (api/users/delete)
  // ผ่าน Admin SDK ที่ route นั้นโดยตรง
}
