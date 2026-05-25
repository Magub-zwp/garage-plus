import {
  writeBatch, doc, collection, query, where,
  getDocs, serverTimestamp,
} from 'firebase/firestore'
import { deleteUser } from 'firebase/auth'
import { db, auth } from './config'

/**
 * ลบข้อมูลทั้งหมดของ user ตาม PDPA
 * - ลบ users, cars, notifications ทันที
 * - Anonymize bookings + repairs (อู่ยังต้องเก็บบันทึกธุรกิจ)
 * - ลบ Firebase Auth account สุดท้าย
 */
export async function deleteAllUserData(uid) {
  const batch = writeBatch(db)

  // 1. ลบ user document
  batch.delete(doc(db, 'users', uid))

  // 2. ลบรถทุกคัน
  const carsSnap = await getDocs(
    query(collection(db, 'cars'), where('userId', '==', uid))
  )
  carsSnap.forEach((d) => batch.delete(d.ref))

  // 3. Anonymize bookings — ไม่ลบ (ข้อมูลธุรกิจของอู่ เก็บ 1 ปี)
  const bookingsSnap = await getDocs(
    query(collection(db, 'bookings'), where('userId', '==', uid))
  )
  bookingsSnap.forEach((d) =>
    batch.update(d.ref, {
      userId:    '[deleted]',
      carPlate:  '[deleted]',
      carName:   '[deleted]',
      note:      '',
      updatedAt: serverTimestamp(),
    })
  )

  // 4. Anonymize repairs — ไม่ลบ (เก็บ 3 ปี)
  const repairsSnap = await getDocs(
    query(collection(db, 'repairs'), where('userId', '==', uid))
  )
  repairsSnap.forEach((d) =>
    batch.update(d.ref, {
      userId:   '[deleted]',
      updatedAt: serverTimestamp(),
    })
  )

  // 5. ลบ notifications ทั้งหมด
  const notifsSnap = await getDocs(
    query(collection(db, 'notifications'), where('userId', '==', uid))
  )
  notifsSnap.forEach((d) => batch.delete(d.ref))

  // 6. Commit ทั้งหมด atomic
  await batch.commit()

  // 7. ลบ Firebase Auth account (ต้องทำหลังสุด)
  const currentUser = auth.currentUser
  if (currentUser && currentUser.uid === uid) {
    await deleteUser(currentUser)
  }
}
