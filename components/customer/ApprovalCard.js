'use client'
// components/customer/ApprovalCard.js
// การ์ดให้ลูกค้า "อนุมัติ / ไม่อนุมัติ" งานซ่อมก่อนช่างเริ่มซ่อม (แพลนข้อ 02 — consent gate)
// วางในหน้า /status หรือการ์ด "รถของฉัน": <ApprovalCard repair={repair} uid={uid} />
//
// เขียนเฉพาะ field approval/timeline/updatedAt -> ตรงกับ firestore.rules ที่อนุญาตเจ้าของรถแก้ได้
import { useState } from 'react'
import { db } from '@/lib/firebase/config'
import { doc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore'

export default function ApprovalCard({ repair, uid }) {
  const [saving, setSaving] = useState(false)
  const [msg,    setMsg]    = useState('')

  // แสดงเฉพาะตอนรออนุมัติ และเป็นรถของผู้ใช้คนนี้
  if (!repair || repair.status !== 'awaiting_approval' || repair.approval?.state !== 'pending') return null
  if (uid && repair.userId && repair.userId !== uid) return null

  const respond = async (approved) => {
    setSaving(true); setMsg('')
    try {
      await updateDoc(doc(db, 'repairs', repair.id), {
        approval: {
          state:      approved ? 'approved' : 'rejected',
          approvedBy: uid || repair.userId || null,
          approvedAt: Date.now(),
          note:       approved ? '' : 'ลูกค้าไม่อนุมัติ',
        },
        timeline:  arrayUnion({ status: repair.status, at: Date.now(), by: 'customer', note: approved ? 'อนุมัติ' : 'ไม่อนุมัติ' }),
        updatedAt: serverTimestamp(),
      })
      setMsg(approved ? '✅ ยืนยันการซ่อมแล้ว' : 'รับทราบ — แจ้งช่างว่าไม่อนุมัติ')
    } catch (e) {
      setMsg('❌ ' + (e.code === 'permission-denied' ? 'ไม่มีสิทธิ์ (ต้องเป็นเจ้าของรถ)' : e.message))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-4 mb-3 p-4 rounded-2xl" style={{ background:'var(--adim)', border:'0.5px solid var(--abrd)' }}>
      <p className="font-syne text-sm font-bold text-t1 mb-1">📋 มีงานซ่อมรอคุณอนุมัติ</p>
      <p className="text-xs text-t2 mb-2">ช่างประเมินงานเสร็จแล้ว กรุณายืนยันเพื่อเริ่มซ่อม</p>

      {(repair.proposedJobs || []).length > 0 && (
        <div className="mb-3 p-3 rounded-xl" style={{ background:'var(--surf)' }}>
          {repair.proposedJobs.map((j, i) => (
            <div key={i} className="flex justify-between text-xs py-0.5">
              <span className="text-t2">{j.name}</span>
              <span className="font-semibold text-t1">×{j.qty}</span>
            </div>
          ))}
        </div>
      )}

      {msg ? (
        <div className="text-xs font-semibold" style={{ color: msg.startsWith('✅') ? 'var(--grn)' : msg.startsWith('❌') ? 'var(--err)' : 'var(--t2)' }}>{msg}</div>
      ) : (
        <div className="flex gap-2">
          <button onClick={() => respond(false)} disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold border-none cursor-pointer"
            style={{ background:'var(--s2)', color:'var(--t1)' }}>
            ไม่อนุมัติ
          </button>
          <button onClick={() => respond(true)} disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white border-none cursor-pointer"
            style={{ background:'var(--acc)', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'กำลังบันทึก...' : 'อนุมัติให้ซ่อม'}
          </button>
        </div>
      )}
    </div>
  )
}
