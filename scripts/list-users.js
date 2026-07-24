// scripts/list-users.js
// ใช้หา uid ของบัญชีที่ต้องการ merge — แสดงรายชื่อ user ทั้งหมดพร้อม provider/email/phone/lineId
//
// วิธีรัน (Node 20.6+ รองรับ --env-file ในตัว ไม่ต้องลง dotenv เพิ่ม):
//   node --env-file=.env.local scripts/list-users.js
//
// ⚠️ ต้องรันจากเครื่อง local ที่มีไฟล์ .env.local ของโปรเจกต์ (มี FIREBASE_ADMIN_* ครบ)

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

async function main() {
  let nextPageToken
  const rows = []
  do {
    const result = await auth.listUsers(1000, nextPageToken)
    for (const u of result.users) {
      const snap = await db.doc(`users/${u.uid}`).get()
      const d = snap.exists ? snap.data() : {}
      rows.push({
        uid:        u.uid,
        providers:  u.providerData.map(p => p.providerId).join(',') || 'custom(LINE)',
        email:      u.email || d.email || '',
        phone:      d.phone || '',
        name:       d.name || u.displayName || '',
        lineId:     d.lineId || '',
        createdAt:  u.metadata.creationTime,
      })
    }
    nextPageToken = result.pageToken
  } while (nextPageToken)

  rows.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))

  console.log('uid'.padEnd(30), '| providers'.padEnd(24), '| email'.padEnd(28), '| phone'.padEnd(14), '| name'.padEnd(16), '| lineId'.padEnd(14), '| createdAt')
  console.log('-'.repeat(150))
  for (const r of rows) {
    console.log(
      r.uid.padEnd(30), '|',
      r.providers.padEnd(22), '|',
      r.email.padEnd(26), '|',
      r.phone.padEnd(12), '|',
      r.name.padEnd(14), '|',
      r.lineId.padEnd(12), '|',
      r.createdAt
    )
  }
  console.log(`\nรวม ${rows.length} บัญชี`)
  console.log('หา 2 บัญชีที่เป็นของคุณ (ดูจาก email/name) แล้วใช้ uid ไปรัน:')
  console.log('  node --env-file=.env.local scripts/merge-users.js <primaryUid> <secondaryUid>')
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })
