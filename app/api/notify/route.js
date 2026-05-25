import { NextResponse } from 'next/server'

/**
 * POST /api/notify
 * ใช้ firebase-admin (server-side) — ไม่ใช้ client SDK
 */

const REPAIR_MSGS = {
  waiting:    { title: 'รับรถเข้าอู่แล้ว 🚗',       body: 'รถของคุณถูกรับเข้าอู่เรียบร้อยแล้ว',        icon: '🔧' },
  diagnosing: { title: 'กำลังตรวจวินิจฉัย 🔍',       body: 'ช่างกำลังตรวจสอบสภาพรถของคุณ',              icon: '🔧' },
  repairing:  { title: 'กำลังดำเนินการซ่อม 🔧',      body: 'ช่างกำลังซ่อมรถของคุณ',                     icon: '🔧' },
  qc:         { title: 'ตรวจคุณภาพเสร็จแล้ว ✨',     body: 'รถผ่าน QC แล้ว ใกล้จะได้รับรถคืนแล้ว!',    icon: '✨' },
  done:       { title: 'รถซ่อมเสร็จแล้ว ✅',         body: 'รถของคุณพร้อมรับได้แล้ว มาได้เลยครับ/ค่ะ',  icon: '✅' },
}
const BOOKING_MSGS = {
  confirmed: { title: 'ยืนยันการจองแล้ว ✅', icon: '📅' },
  cancelled: { title: 'ยกเลิกการจอง',        icon: '📅' },
}

let _db = null
let _messaging = null

async function getAdmin() {
  if (_db) return { db: _db, messaging: _messaging }
  const { initializeApp, getApps, cert } = await import('firebase-admin/app')
  const { getFirestore }                 = await import('firebase-admin/firestore')
  const { getMessaging }                 = await import('firebase-admin/messaging')

  if (!getApps().length) {
    const cfg = process.env.FIREBASE_ADMIN_PRIVATE_KEY
      ? { credential: cert({ projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL, privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n') }) }
      : { projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID }
    initializeApp(cfg)
  }
  _db        = getFirestore()
  _messaging = getMessaging()
  return { db: _db, messaging: _messaging }
}

export async function POST(request) {
  try {
    const { type, userId, status, plate, date, time } = await request.json()
    if (!userId || !status) return NextResponse.json({ error: 'userId and status required' }, { status: 400 })

    const { db, messaging } = await getAdmin()
    const userSnap = await db.doc(`users/${userId}`).get()
    if (!userSnap.exists) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const { fcmToken, notifPrefs, lineId, name } = userSnap.data()
    const msgs = type === 'booking_status' ? BOOKING_MSGS : REPAIR_MSGS
    const msg  = msgs[status]
    if (!msg) return NextResponse.json({ ok: true, skipped: 'no message for status' })

    const body = type === 'booking_status'
      ? `การจองวันที่ ${date} เวลา ${time} น. ${status === 'confirmed' ? 'ยืนยันแล้ว' : 'ถูกยกเลิก'}`
      : msg.body
    const href = type === 'booking_status' ? '/my-bookings' : '/status'
    const results = {}

    // 1. บันทึก Firestore notification
    await db.collection('notifications').add({ userId, icon: msg.icon, bg: 'rgba(232,134,58,.12)', title: msg.title, body, href, unread: true, createdAt: new Date() })
    results.firestore = 'saved'

    // 2. FCM Push
    if (fcmToken && notifPrefs?.status !== false) {
      try {
        await messaging.send({ token: fcmToken, notification: { title: msg.title, body }, data: { href }, webpush: { fcmOptions: { link: href }, notification: { icon: '/icon-192.png' } } })
        results.fcm = 'sent'
      } catch (e) {
        if (['messaging/invalid-registration-token','messaging/registration-token-not-registered'].includes(e.code)) {
          await db.doc(`users/${userId}`).update({ fcmToken: '' })
          results.fcm = 'token_expired_cleared'
        } else { results.fcm = `failed: ${e.message}` }
      }
    }

    // 3. LINE message เมื่อรถเสร็จ
    if (status === 'done' && lineId && notifPrefs?.line !== false) {
      const tok = process.env.LINE_CHANNEL_ACCESS_TOKEN
      if (tok) {
        const r = await fetch('https://api.line.me/v2/bot/message/push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tok}` },
          body: JSON.stringify({ to: lineId, messages: [{ type: 'flex', altText: `รถ ${plate||''} ซ่อมเสร็จแล้ว — 179 Auto`, contents: { type:'bubble', header:{ type:'box', layout:'vertical', contents:[{ type:'text', text:'✅ รถซ่อมเสร็จแล้ว!', weight:'bold', size:'lg', color:'#ffffff' }], backgroundColor:'#E8863A', paddingAll:'16px' }, body:{ type:'box', layout:'vertical', spacing:'sm', contents:[{ type:'text', text:`สวัสดี คุณ${name||''}`, size:'sm', color:'#888888' },{ type:'separator', margin:'md' },{ type:'box', layout:'horizontal', margin:'sm', contents:[{ type:'text', text:'ทะเบียน', size:'sm', color:'#888888', flex:2 },{ type:'text', text:plate||'-', size:'sm', weight:'bold', flex:3 }] }] }, footer:{ type:'box', layout:'vertical', contents:[{ type:'button', style:'primary', color:'#E8863A', action:{ type:'uri', label:'ดูรายละเอียด', uri:`${process.env.NEXT_PUBLIC_APP_URL||'http://localhost:3000'}/status` } }] } } }] })
        })
        results.line = r.ok ? 'sent' : `failed: ${r.status}`
      }
    }

    return NextResponse.json({ ok: true, results })
  } catch (err) {
    console.error('[POST /api/notify]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
