'use client'
// components/customer/ApprovalCard.js
// การ์ดให้ลูกค้า "อนุมัติ / ไม่อนุมัติ" งานซ่อมก่อนช่างเริ่มซ่อม (แพลนข้อ 02 — consent gate)
// วางในหน้า /status หรือการ์ด "รถของฉัน": <ApprovalCard repair={repair} uid={uid} />
//
// เขียนเฉพาะ field approval/timeline/updatedAt -> ตรงกับ firestore.rules ที่อนุญาตเจ้าของรถแก้ได้
import { useState } from 'react'
import Link from 'next/link'
import { db } from '@/lib/firebase/config'
import { doc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore'
import { syncBookingStatus } from '@/lib/notify'

export default function ApprovalCard({ repair, uid }) {
  const [saving, setSaving] = useState(false)
  const [msg,    setMsg]    = useState('')

  // แสดงเมื่ออยู่ในสถานะรออนุมัติ และยังไม่ได้อนุมัติ
  if (!repair || repair.status !== 'awaiting_approval' || repair.approval?.state === 'approved') return null
  if (uid && repair.userId && repair.userId !== uid) return null

  const respond = async (approved) => {
    setSaving(true); setMsg('')
    try {
      const nextStatus = approved ? 'repairing' : 'diagnosing'
      await updateDoc(doc(db, 'repairs', repair.id), {
        approval: {
          state:      approved ? 'approved' : 'rejected',
          approvedBy: uid || repair.userId || null,
          approvedAt: Date.now(),
          note:       approved ? 'ลูกค้ายืนยันอนุมัติการซ่อม' : 'ลูกค้าไม่อนุมัติการซ่อม',
        },
        status: nextStatus,
        timeline: arrayUnion({
          status: nextStatus,
          at: Date.now(),
          by: 'customer',
          note: approved ? 'ลูกค้ายืนยันอนุมัติการซ่อม' : 'ลูกค้าไม่อนุมัติการซ่อม'
        }),
        updatedAt: serverTimestamp(),
      })

      if (approved && repair.bookingId) {
        await syncBookingStatus(repair.bookingId, 'repairing')
      }
      setMsg(approved ? '✅ ยืนยันการซ่อมแล้ว เริ่มดำเนินการซ่อม' : 'รับทราบ — แจ้งช่างว่าไม่อนุมัติ')
    } catch (e) {
      setMsg('❌ ' + (e.code === 'permission-denied' ? 'ไม่มีสิทธิ์ (ต้องเป็นเจ้าของรถ)' : e.message))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mb-4 p-4 rounded-3xl shadow-sm" style={{ background:'var(--adim)', border:'1px solid var(--abrd)' }}>
      <div className="flex items-center justify-between mb-1.5">
        <p className="font-syne text-sm font-bold text-t1 flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-acc animate-ping inline-block" />
          📋 มีงานซ่อมรอคุณอนุมัติ
        </p>
        <Link href="/status" className="text-xs font-bold text-acc hover:underline">
          ดูรายละเอียด ›
        </Link>
      </div>
      <p className="text-xs text-t2 mb-3">
        ช่างประเมินรายการซ่อมเสร็จแล้ว กรุณาตรวจสอบและกดยืนยันเพื่อให้อู่เริ่มดำเนินการซ่อม
      </p>

      {(repair.proposedJobs || []).length > 0 && (
        <div className="mb-3 p-3 rounded-2xl border border-token" style={{ background:'var(--surf)' }}>
          <p className="text-[11px] font-bold text-t3 uppercase tracking-wider mb-1.5">รายการที่ช่างตรวจพบ</p>
          {repair.proposedJobs.map((j, i) => (
            <div key={i} className="flex justify-between text-xs py-1 border-b border-token last:border-none">
              <span className="text-t1 font-medium">{j.name}</span>
              <span className="font-semibold text-acc">×{j.qty || 1}</span>
            </div>
          ))}
        </div>
      )}

      {msg ? (
        <div className="p-3 rounded-xl text-xs font-bold text-center" style={{ background: 'var(--surf)', color: msg.startsWith('✅') ? 'var(--grn)' : msg.startsWith('❌') ? 'var(--err)' : 'var(--t2)' }}>
          {msg}
        </div>
      ) : (
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={() => respond(false)}
            disabled={saving}
            className="flex-1 py-3 rounded-2xl text-xs font-bold border border-token cursor-pointer transition-opacity"
            style={{ backgroundColor: 'var(--s2)', color: 'var(--err)' }}
          >
            ไม่อนุมัติ
          </button>
          <button
            type="button"
            onClick={() => respond(true)}
            disabled={saving}
            className="flex-[2] py-3 rounded-2xl text-xs font-bold text-white shadow-md cursor-pointer transition-opacity"
            style={{ backgroundColor: 'var(--acc)', color: '#ffffff', opacity: saving ? 0.75 : 1 }}
          >
            {saving ? 'กำลังบันทึก...' : 'อนุมัติให้ซ่อม ✓'}
          </button>
        </div>
      )}
    </div>
  )
}
