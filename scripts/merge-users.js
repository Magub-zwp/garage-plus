// scripts/merge-users.js
// รวมบัญชี "secondaryUid" เข้ากับ "primaryUid" — ใช้ครั้งเดียวสำหรับ user ที่มีหลายบัญชีจากการ
// login คนละช่องทาง (Google/LINE/อีเมล) ก่อนที่ระบบจะมีการเชื่อมบัญชีอัตโนมัติ
//
// สิ่งที่สคริปต์นี้ทำ:
//   1. รวมข้อมูลใน users/{uid} — primary เป็นหลัก เติมเฉพาะช่องที่ primary ว่างแต่ secondary มีค่า
//   2. บวกคะแนน/usageCount ของทั้งสองบัญชีเข้าด้วยกัน
//   3. ย้าย bookings / repairs / notifications / cars ที่ userId == secondaryUid ให้เป็น primaryUid
//   4. ลบ Firestore user doc และ Firebase Auth user ของ secondaryUid (ลบถาวร ย้อนกลับไม่ได้)
//
// วิธีรัน (Node 20.6+ รองรับ --env-file ในตัว):
//   1. รัน scripts/list-users.js ก่อนเพื่อหา uid ของทั้ง 2 บัญชี
//   2. node --env-file=.env.local scripts/merge-users.js <primaryUid> <secondaryUid>
//
// ⚠️ primaryUid = บัญชีที่จะ "เก็บไว้ใช้ต่อ" (แนะนำเลือกอันที่มีประวัติจอง/ข้อมูลสำคัญมากกว่า)
// ⚠️ secondaryUid = บัญชีที่จะถูกลบทิ้งหลัง merge เสร็จ

const { initializeApp, cert } = require('firebase-admin/app')
const { getAuth } = require('firebase-admin/auth')
const { getFirestore } = require('firebase-admin/firestore')

initializeApp({
  credential: cert({
    projectId:   process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey:  process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }),
})

const auth = getAuth()
const db   = getFirestore()

const [, , primaryUid, secondaryUid] = process.argv
if (!primaryUid || !secondaryUid) {
  console.error('Usage: node --env-file=.env.local scripts/merge-users.js <primaryUid> <secondaryUid>')
  process.exit(1)
}
if (primaryUid === secondaryUid) {
  console.error('primaryUid และ secondaryUid ต้องไม่ใช่ uid เดียวกัน')
  process.exit(1)
}

const COLLECTIONS_WITH_USERID = ['bookings', 'repairs', 'notifications', 'cars']

async function main() {
  const primarySnap   = await db.doc(`users/${primaryUid}`).get()
  const secondarySnap = await db.doc(`users/${secondaryUid}`).get()
  if (!primarySnap.exists)   throw new Error(`ไม่พบ user doc ของ primary: ${primaryUid}`)
  if (!secondarySnap.exists) throw new Error(`ไม่พบ user doc ของ secondary: ${secondaryUid}`)

  const primary   = primarySnap.data()
  const secondary = secondarySnap.data()

  const merged = { ...primary }
  for (const key of ['name', 'email', 'phone', 'lineId', 'birthday']) {
    if (!merged[key] && secondary[key]) merged[key] = secondary[key]
  }
  merged.points     = (primary.points     || 0) + (secondary.points     || 0)
  merged.usageCount = (primary.usageCount || 0) + (secondary.usageCount || 0)

  console.log('=== ข้อมูล user doc หลัง merge ===')
  console.log(merged)
  console.log('==================================\n')

  await db.doc(`users/${primaryUid}`).set(merged, { merge: true })
  console.log(`✓ อัปเดต users/${primaryUid} แล้ว`)

  for (const col of COLLECTIONS_WITH_USERID) {
    const snap = await db.collection(col).where('userId', '==', secondaryUid).get()
    if (snap.size) {
      const batch = db.batch()
      snap.docs.forEach(d => batch.update(d.ref, { userId: primaryUid }))
      await batch.commit()
    }
    console.log(`✓ ย้าย ${snap.size} เอกสารใน "${col}" ไปเป็น userId=${primaryUid}`)
  }

  await db.doc(`users/${secondaryUid}`).delete()
  console.log(`✓ ลบ users/${secondaryUid}`)

  await auth.deleteUser(secondaryUid)
  console.log(`✓ ลบ Firebase Auth user ${secondaryUid}`)

  console.log(`\nเสร็จแล้ว — รวมบัญชี ${secondaryUid} เข้ากับ ${primaryUid} เรียบร้อย ใช้ ${primaryUid} login ต่อได้เลย`)
}

main().then(() => process.exit(0)).catch(e => { console.error('เกิดข้อผิดพลาด:', e); process.exit(1) })
