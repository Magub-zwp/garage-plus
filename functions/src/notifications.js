const { onDocumentUpdated } = require('firebase-functions/v2/firestore')
const { initializeApp }     = require('firebase-admin/app')
const { getFirestore }      = require('firebase-admin/firestore')
const { getMessaging }      = require('firebase-admin/messaging')

// ป้องกัน initialize ซ้ำ
try { initializeApp() } catch {}

const db = getFirestore()

const REGION = 'asia-southeast3'  // Bangkok — ตรงกับ Firestore

// ── ข้อความสำหรับแต่ละสถานะ 
const STATUS_MESSAGES = {
  waiting:    { title: 'รับรถเข้าอู่แล้ว 🚗',          body: 'รถของคุณถูกรับเข้าอู่เรียบร้อยแล้ว' },
  diagnosing: { title: 'กำลังตรวจวินิจฉัย 🔍',         body: 'ช่างกำลังตรวจสอบสภาพรถของคุณ' },
  repairing:  { title: 'กำลังดำเนินการซ่อม 🔧',        body: 'ช่างกำลังซ่อมรถของคุณ คาดว่าจะแล้วเสร็จเร็วๆ นี้' },
  qc:         { title: 'ตรวจคุณภาพเสร็จแล้ว ✨',       body: 'รถผ่าน QC แล้ว ใกล้จะได้รับรถคืนแล้ว!' },
  done:       { title: 'รถซ่อมเสร็จแล้ว ✅',           body: 'รถของคุณพร้อมรับได้แล้ว มาได้เลยครับ/ค่ะ' },
}

// ── Helper: ส่ง Push Notification 
async function sendPushNotification(fcmToken, title, body, href = '/status') {
  try {
    await getMessaging().send({
      token: fcmToken,
      notification: { title, body },
      data:    { href },
      webpush: {
        fcmOptions: { link: href },
        notification: { icon: '/icon-192.png', badge: '/icon-72.png' },
      },
      android: { notification: { icon: 'ic_notification', color: '#E8863A' } },
    })
  } catch (err) {
    console.error('[sendPush]', err.code, err.message)
    // ถ้า token หมดอายุ ลบออกจาก Firestore
    if (['messaging/invalid-registration-token', 'messaging/registration-token-not-registered'].includes(err.code)) {
      // ดึง uid จาก user ที่มี token นี้แล้วล้าง
      console.warn('[sendPush] Token expired — should clear from Firestore')
    }
  }
}

// ── Helper: บันทึก notification ใน Firestore 
async function saveNotification(userId, data) {
  await db.collection('notifications').add({
    userId,
    ...data,
    unread:    true,
    createdAt: new Date(),
  })
}

// สถานะงานซ่อมเปลี่ยน → Push Notification
exports.onRepairStatusChange = onDocumentUpdated(
  { document: 'repairs/{repairId}', region: REGION },
  async (event) => {
    const before = event.data.before.data()
    const after  = event.data.after.data()

    // ออกถ้า status ไม่เปลี่ยน
    if (before.status === after.status) return null

    const msg = STATUS_MESSAGES[after.status]
    if (!msg) return null

    // ดึงข้อมูล user
    const userSnap = await db.doc(`users/${after.userId}`).get()
    if (!userSnap.exists) return null

    const { fcmToken, notifPrefs } = userSnap.data()

    // บันทึก notification ใน Firestore เสมอ
    await saveNotification(after.userId, {
      icon:  '🔧',
      bg:    'rgba(232,134,58,.12)',
      title: msg.title,
      body:  msg.body,
      href:  '/status',
      time:  'เมื่อกี้',
    })

    // ส่ง Push Notification เฉพาะถ้าลูกค้ายินยอม
    if (fcmToken && notifPrefs?.status !== false) {
      await sendPushNotification(fcmToken, msg.title, msg.body, '/status')
    }

    return null
  }
)

//Function 2: สถานะการจองเปลี่ยน → Push Notification

exports.onBookingStatusChange = onDocumentUpdated(
  { document: 'bookings/{bookingId}', region: REGION },
  async (event) => {
    const before = event.data.before.data()
    const after  = event.data.after.data()

    if (before.status === after.status) return null
    if (after.userId === '[deleted]')   return null

    // Map booking status → message
    const BOOKING_MSGS = {
      confirmed:  { title: 'ยืนยันการจองแล้ว ✅', body: `จองคิว ${after.date} เวลา ${after.time} น. ยืนยันแล้ว`, href: '/my-bookings' },
      cancelled:  { title: 'ยกเลิกการจอง',        body: `การจองวันที่ ${after.date} ถูกยกเลิก`,                   href: '/my-bookings' },
    }

    const msg = BOOKING_MSGS[after.status]
    if (!msg) return null

    const userSnap = await db.doc(`users/${after.userId}`).get()
    if (!userSnap.exists) return null

    const { fcmToken, notifPrefs } = userSnap.data()

    await saveNotification(after.userId, {
      icon:  '📅',
      bg:    'rgba(45,158,101,.10)',
      title: msg.title,
      body:  msg.body,
      href:  msg.href,
      time:  'เมื่อกี้',
    })

    if (fcmToken && notifPrefs?.status !== false) {
      await sendPushNotification(fcmToken, msg.title, msg.body, msg.href)
    }

    return null
  }
)
