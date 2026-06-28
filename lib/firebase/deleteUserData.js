import {
  writeBatch, doc, collection, query, where,
  getDocs, serverTimestamp,
} from 'firebase/firestore'
import { db } from './config'

// Firestore batch สูงสุด 500 ops — ตัดเป็น chunk 499 เพื่อความปลอดภัย
async function commitInChunks(ops) {
  for (let i = 0; i < ops.length; i += 499) {
    const batch = writeBatch(db)
    ops.slice(i, i + 499).forEach((fn) => fn(batch))
    await batch.commit()
  }
}

/**
 * ลบข้อมูลทั้งหมดของ user ตาม PDPA
 * - ลบ users, cars, notifications ทันที
 * - Anonymize bookings + repairs (อู่ยังต้องเก็บบันทึกธุรกิจ)
 * - รองรับ user ที่มี record เยอะ (chunking batch ทุก 499 ops)
 */
export async function deleteAllUserData(uid) {
  const ops = []

  // 1. ลบ user document
  ops.push((batch) => batch.delete(doc(db, 'users', uid)))

  // 2. ลบรถทุกคัน
  const carsSnap = await getDocs(
    query(collection(db, 'cars'), where('userId', '==', uid))
  )
  carsSnap.forEach((d) => ops.push((batch) => batch.delete(d.ref)))

  // 3. Anonymize bookings — ไม่ลบ (ข้อมูลธุรกิจของอู่ เก็บ 1 ปี)
  const bookingsSnap = await getDocs(
    query(collection(db, 'bookings'), where('userId', '==', uid))
  )
  bookingsSnap.forEach((d) =>
    ops.push((batch) =>
      batch.update(d.ref, {
        userId:    '[deleted]',
        carPlate:  '[deleted]',
        carName:   '[deleted]',
        note:      '',
        updatedAt: serverTimestamp(),
      })
    )
  )

  // 4. Anonymize repairs — ไม่ลบ (เก็บ 3 ปี)
  const repairsSnap = await getDocs(
    query(collection(db, 'repairs'), where('userId', '==', uid))
  )
  repairsSnap.forEach((d) =>
    ops.push((batch) =>
      batch.update(d.ref, {
        userId:    '[deleted]',
        updatedAt: serverTimestamp(),
      })
    )
  )

  // 5. ลบ notifications ทั้งหมด
  const notifsSnap = await getDocs(
    query(collection(db, 'notifications'), where('userId', '==', uid))
  )
  notifsSnap.forEach((d) => ops.push((batch) => batch.delete(d.ref)))

  // 6. Commit ทีละ 499 ops เพื่อไม่เกิน Firestore limit
  await commitInChunks(ops)

  // หมายเหตุ: Firebase Auth account ถูกลบโดย API route (api/users/delete)
  // ผ่าน Admin SDK — ไม่ทำที่นี่เพราะ client SDK ไม่มี auth.currentUser บน server
}
