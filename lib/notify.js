import { db } from '@/lib/firebase/config'
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore'

/**
 * เขียน notification doc 1 รายการ (no-op ถ้าไม่มี userId)
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
    // กันแจ้งเตือนerror แล้วflow หลักพัง 
    console.warn('[pushNotification]', e.message)
  }
}

// ข้อความมาตรฐานตามสถานะงานซ่อม (ใช้กับ notifyRepairStatus)
const REPAIR_MSG = {
  awaiting_approval: { title: 'มีงานซ่อมรอคุณอนุมัติ', body: 'ช่างประเมินงานเสร็จแล้ว กรุณายืนยันเพื่อเริ่มซ่อม' },
  repairing:         { title: 'เริ่มซ่อมรถของคุณแล้ว',  body: 'ช่างกำลังดำเนินการซ่อม' },
  qc:                { title: 'กำลังตรวจสอบคุณภาพ (QC)', body: 'รถของคุณกำลังตรวจสอบขั้นสุดท้าย' },
  done:              { title: 'รถของคุณซ่อมเสร็จแล้ว',   body: 'พร้อมให้เข้ารับรถได้' },
}

/**
 * แจ้งเตือนลูกค้าเมื่อสถานะงานซ่อมเปลี่ยน
 */
export async function notifyRepairStatus(repair, newStatus) {
  const m = REPAIR_MSG[newStatus]
  if (!m || !repair?.userId) return
  const plate = repair.plate || repair.carPlate || ''
  await pushNotification({
    userId: repair.userId,
    title: m.title,
    body: plate ? `${m.body} · ${plate}` : m.body,
    type: 'repair',
    link: '/status',
  })
}

/**
 * sync สถานะงานซ่อม -> สถานะ booking 
 * Dashboard/หน้าคิว นับ repairing/done จาก bookings — ถ้าไม่ sync ตัวเลขจะเป็น 0 ตลอด
 * map: repairing -> 'repairing', qc -> 'repairing', done -> 'done'
 */
export async function syncBookingStatus(bookingId, repairStatus) {
  if (!bookingId) return
  const map = { repairing: 'repairing', qc: 'repairing', done: 'done' }
  const target = map[repairStatus]
  if (!target) return
  try {
    await updateDoc(doc(db, 'bookings', bookingId), {
      status: target,
      updatedAt: serverTimestamp(),
    })
  } catch (e) {
    console.warn('[syncBookingStatus]', e.message)
  }
}
