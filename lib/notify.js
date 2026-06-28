// lib/notify.js
// ตัวช่วยส่งการแจ้งเตือนจากฝั่ง client (staff pages)
//
// notifyRepairStatus — เรียก /api/notify เพื่อส่งครบทั้ง 3 ช่องทาง:
//   1. Firestore doc (กระดิ่งในแอพ)
//   2. FCM Push notification (แม้แอพปิดอยู่)
//   3. LINE message (เฉพาะสถานะ done)
//
// pushNotification — fallback เขียน Firestore โดยตรง (สำหรับ booking status ที่ไม่ต้องการ Push/LINE)

import { db } from '@/lib/firebase/config'
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore'

/**
 * เขียน notification doc 1 รายการ (no-op ถ้าไม่มี userId)
 * ใช้สำหรับ booking status — ไม่ต้อง Push/LINE
 */
export async function pushNotification({ userId, title, body, type = 'general', link = '' }) {
  if (!userId) return
  try {
    await addDoc(collection(db, 'notifications'), {
      userId,
      title,
      body: body || '',
      type,
      link,
      unread: true,
      createdAt: serverTimestamp(),
    })
  } catch (e) {
    console.warn('[pushNotification]', e.message)
  }
}

// ข้อความมาตรฐานตามสถานะงานซ่อม
const REPAIR_MSG = {
  awaiting_approval: { title: 'มีงานซ่อมรอคุณอนุมัติ', body: 'ช่างประเมินงานเสร็จแล้ว กรุณายืนยันเพื่อเริ่มซ่อม' },
  repairing:         { title: 'เริ่มซ่อมรถของคุณแล้ว',  body: 'ช่างกำลังดำเนินการซ่อม' },
  qc:                { title: 'กำลังตรวจสอบคุณภาพ (QC)', body: 'รถของคุณกำลังตรวจสอบขั้นสุดท้าย' },
  done:              { title: 'รถของคุณซ่อมเสร็จแล้ว',   body: 'พร้อมให้เข้ารับรถได้' },
}

/**
 * แจ้งเตือนลูกค้าเมื่อสถานะงานซ่อมเปลี่ยน
 * เรียก /api/notify ด้วย staff ID token → Firestore + FCM Push + LINE (ครบทุกช่องทาง)
 * fallback เป็น pushNotification (Firestore only) ถ้าไม่มี auth token
 */
export async function notifyRepairStatus(repair, newStatus) {
  const m = REPAIR_MSG[newStatus]
  if (!m || !repair?.userId) return
  const plate = repair.plate || repair.carPlate || ''

  try {
    const { getAuth } = await import('firebase/auth')
    const token = await getAuth().currentUser?.getIdToken()
    if (token) {
      // Delegate ทุกอย่างให้ /api/notify — Firestore + FCM Push + LINE
      await fetch('/api/notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          type:   'repair_status',
          userId: repair.userId,
          status: newStatus,
          plate,
        }),
      })
      return
    }
  } catch (e) {
    console.warn('[notifyRepairStatus] /api/notify failed:', e.message)
  }

  // Fallback: in-app notification เท่านั้น (ถ้าไม่มี auth token)
  await pushNotification({
    userId: repair.userId,
    title:  m.title,
    body:   plate ? `${m.body} · ${plate}` : m.body,
    type:   'repair',
    link:   '/status',
  })
}

/**
 * sync สถ�