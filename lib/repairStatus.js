// lib/repairStatus.js
// แหล่งความจริงเดียว (single source of truth) ของลำดับสถานะงานซ่อม
// ใช้ไฟล์นี้ที่เดียวเพื่อกันโค้ดหน้าซ่อม (admin/ช่าง) เขียนลำดับ/label ซ้ำกันแล้วไม่ตรงกัน
//
// ลำดับสถานะ: แทรก 'awaiting_approval' (รออนุมัติ) คั่นระหว่าง "ตรวจ" กับ "ซ่อม"
// เป็น consent gate — ซ่อมต่อไม่ได้จนกว่าลูกค้าจะกดยินยอม

export const STEPS      = ['รับรถ', 'ตรวจ', 'รออนุมัติ', 'ซ่อม', 'QC', 'ส่งมอบ']
export const STATUS_MAP = ['waiting', 'diagnosing', 'awaiting_approval', 'repairing', 'qc', 'done']

// สถานะที่ถือว่า "ยังอยู่ในอู่/กำลังดำเนินการ" (ใช้กับ query where status in [...])
export const ACTIVE_STATUSES = ['waiting', 'diagnosing', 'awaiting_approval', 'repairing', 'qc']

// index ของขั้น "ซ่อม" — ห้ามเข้าขั้นนี้ขึ้นไปถ้ายังไม่ได้รับอนุมัติ
export const REPAIRING_IDX = STATUS_MAP.indexOf('repairing')

export const statusIndex = (s) => STATUS_MAP.indexOf(s)

// label ไทยสำหรับแสดงผล
export const STATUS_LABEL = {
  waiting:           'รับรถ',
  diagnosing:        'ตรวจ/ประเมิน',
  awaiting_approval: 'รอลูกค้าอนุมัติ',
  repairing:         'กำลังซ่อม',
  qc:                'ตรวจสอบ (QC)',
  done:              'เสร็จ/ส่งมอบ',
  cancelled:         'ยกเลิก',
}

/**
 * ตรวจว่าเปลี่ยนสถานะได้ไหม (กันย้อน + กัน skip ข้ามขั้น + บังคับ consent)
 * @returns {{ ok:boolean, reason?:string }}
 */
export function canTransition(current, next, approval) {
  const ci = statusIndex(current)
  const ni = statusIndex(next)
  if (ni === -1) return { ok: false, reason: 'สถานะไม่ถูกต้อง' }
  if (ni < ci)   return { ok: false, reason: 'ไม่สามารถย้อนสถานะกลับได้' }
  if (ni > ci + 1) return { ok: false, reason: 'ต้องทำทีละขั้น ห้ามข้ามขั้นตอน' }
  // consent gate: จะเข้าขั้น "ซ่อม" ขึ้นไปได้ ต้องได้รับอนุมัติก่อน
  if (ni >= REPAIRING_IDX && approval?.state !== 'approved') {
    return { ok: false, reason: 'ต้องรอลูกค้าอนุมัติก่อนเริ่มซ่อม' }
  }
  return { ok: true }
}
