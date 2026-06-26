'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import DashboardShell from '@/components/staff/DashboardShell'
import { db } from '@/lib/firebase/config'
import { doc, getDoc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore'
import { STEPS, STATUS_MAP, statusIndex, canTransition, REPAIRING_IDX } from '@/lib/repairStatus'
import { notifyRepairStatus, syncBookingStatus, pushNotification } from '@/lib/notify'

export default function MechRepairPage() {
  const params   = useSearchParams()
  const repairId = params.get('id')

  const [repair,   setRepair]   = useState(null)
  const [done,     setDone]     = useState(new Set())
  const [item,     setItem]     = useState('')
  const [qty,      setQty]      = useState('')
  const [note,     setNote]     = useState('')   // โน้ตที่ช่างกรอก จะถูกบันทึกลง Firestore จริงตอนกดบันทึก
  const [saving,   setSaving]   = useState(false)
  const [msg,      setMsg]      = useState('')
  const [loading,  setLoading]  = useState(true)
  const [err,      setErr]      = useState('')   // ข้อความ error ที่จะแสดงให้ผู้ใช้เห็น

  const loadRepair = () => {
    if (!repairId) { setLoading(false); return }
    getDoc(doc(db, 'repairs', repairId)).then(snap => {
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() }
        setRepair(data)
        const stepIdx = statusIndex(data.status)
        const s = new Set()
        for (let i = 0; i <= stepIdx && stepIdx >= 0; i++) s.add(i)
        setDone(s)
      }
    }).catch(e => setErr('โหลดข้อมูลไม่สำเร็จ: ' + e.message)).finally(() => setLoading(false))
  }
  useEffect(loadRepair, [repairId])

  // สลับสถานะของขั้นตอนซ่อม: กดได้แค่ "ขั้นถัดไป" ทีละขั้น ห้ามย้อนขั้นที่ผ่านไปแล้ว และห้ามข้ามขั้น
  const toggleStep = (i) => {
    if (!repair) return
    const currentIdx = statusIndex(repair.status)
    if (i < currentIdx) return            // ห้ามย้อน
    if (i > currentIdx + 1) return        // ห้ามข้ามขั้น
    setDone(prev => {
      const n = new Set(prev)
      if (n.has(i)) { for (let j = i; j < STATUS_MAP.length; j++) n.delete(j) }
      else          { for (let j = 0; j <= i; j++) n.add(j) }
      return n
    })
  }

  const cur       = Math.max(-1, ...[...done]) + 1
  const newStatus = STATUS_MAP[Math.max(...[...done], 0)] || 'waiting'

  const approval     = repair?.approval
  const isApproved   = approval?.state === 'approved'
  const needApproval = statusIndex(newStatus) >= REPAIRING_IDX && !isApproved

  const handleSave = async () => {
    if (!repair) return
    const check = canTransition(repair.status, newStatus, approval)
    if (!check.ok) { setMsg('❌ ' + check.reason); return }

    setSaving(true); setMsg('')
    try {
      const updates = {
        status:    newStatus,
        updatedAt: serverTimestamp(),
        // เก็บประวัติการเปลี่ยนสถานะไว้ใน timeline ทุกครั้งที่บันทึก
        timeline:  arrayUnion({ status: newStatus, at: Date.now(), by: 'mechanic', note: note || '' }),
      }
      // เก็บเฉพาะชื่อ+จำนวน (ตัดราคาออกตามขอบเขต v.นี้)
      if (item) updates.proposedJobs = arrayUnion({ name: item, qty: parseInt(qty) || 1 })
      if (note) updates.lastNote = note

      await updateDoc(doc(db, 'repairs', repair.id), updates)

      // แจ้งเตือนลูกค้าจริง (เขียน notification doc ลง Firestore)
      await notifyRepairStatus({ ...repair }, newStatus)
      // sync สถานะนี้กลับไปที่ booking ด้วย เพื่อให้หน้า dashboard/คิวของ staff นับตัวเลขถูกต้อง
      await syncBookingStatus(repair.bookingId, newStatus)

      setRepair(prev => ({ ...prev, status: newStatus }))
      const newIdx = statusIndex(newStatus)
      const newDone = new Set()
      for (let i = 0; i <= newIdx; i++) newDone.add(i)
      setDone(newDone)
      setMsg('✅ บันทึกสถานะแล้ว — แจ้งเตือนลูกค้าเรียบร้อย')
      setItem(''); setQty(''); setNote('')
    } catch(e) {
      setMsg(`❌ ${e.code === 'permission-denied' ? 'ไม่มีสิทธิ์บันทึก (ตรวจสอบการล็อกอิน staff)' : e.message}`)
    } finally { setSaving(false) }
  }

  // ส่งคำขออนุมัติให้ลูกค้า: เปลี่ยนสถานะเป็น "รออนุมัติ" และตั้ง approval เป็น pending
  // จะซ่อมต่อไม่ได้จนกว่าลูกค้าจะกดยินยอม (consent gate)
  const handleRequestApproval = async () => {
    if (!repair) return
    setSaving(true); setMsg('')
    try {
      await updateDoc(doc(db, 'repairs', repair.id), {
        status:   'awaiting_approval',
        approval: { state: 'pending', approvedBy: null, approvedAt: null, note: '' },
        updatedAt: serverTimestamp(),
        timeline: arrayUnion({ status: 'awaiting_approval', at: Date.now(), by: 'mechanic', note: note || '' }),
      })
      await pushNotification({
        userId: repair.userId,
        title:  'มีงานซ่อมรอคุณอนุมัติ',
        body:   'ช่างประเมินงานเสร็จแล้ว กรุณายืนยันเพื่อเริ่มซ่อม',
        type:   'approval',
        link:   '/status',
      })
      setRepair(prev => ({ ...prev, status: 'awaiting_approval', approval: { state: 'pending' } }))
      setMsg('✅ ส่งให้ลูกค้าอนุมัติแล้ว — รอลูกค้ายืนยัน')
    } catch(e) {
      setMsg('❌ ' + e.message)
    } finally { setSaving(false) }
  }

  return (
    <DashboardShell requiredRole="mechanic">
      <div className="flex items-center gap-3 mb-5">
        <Link href="/staff/mech/queue" className="text-t2 text-sm">‹ กลับ</Link>
        <h1 className="font-syne text-xl font-bold text-t1">บันทึกงานซ่อม</h1>
      </div>

      {err && <div className="mb-4 p-3 rounded-xl text-xs text-err bg-errdim">{err}</div>}

      {!repairId ? (
        <div className="card p-10 text-center">
          <span className="text-4xl mb-3 block">🔧</span>
          <p className="font-syne text-sm font-bold text-t1 mb-2">ไม่ได้เลือกงานซ่อม</p>
          <Link href="/staff/mech/queue" className="text-xs text-acc font-semibold">← กลับไปที่คิว</Link>
        </div>
      ) : loading ? (
        <div className="flex justify-center pt-20">
          <span className="inline-block w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor:'var(--acc)', borderTopColor:'transparent' }}/>
        </div>
      ) : !repair ? (
        <div className="card p-10 text-center text-t2">ไม่พบข้อมูลงานซ่อม</div>
      ) : (
        <div className="max-w-lg flex flex-col gap-4">
          {/* Info */}
          <div className="card p-4">
            {[
              ['รถ',      `${repair.carName||''} ${repair.plate||repair.carPlate||''}`],
              ['งาน',     repair.jobDetail||'-'],
              ['สถานะ',   repair.status],
              ['อนุมัติ', approval ? (approval.state === 'approved' ? '✅ อนุมัติแล้ว' : approval.state === 'rejected' ? '❌ ลูกค้าปฏิเสธ' : '⏳ รอลูกค้าอนุมัติ') : '— ยังไม่ส่ง'],
            ].map(([k,v]) => (
              <div key={k} className="flex justify-between py-1.5" style={{ borderBottom:'0.5px solid var(--brd)' }}>
                <span className="text-xs text-t2">{k}</span>
                <span className="text-xs font-semibold text-t1">{v}</span>
              </div>
            ))}
          </div>

          {/* Step bar */}
          <div className="card p-4">
            <p className="text-xs text-t3 mb-2">อัปเดตขั้นตอน (ทีละขั้น)</p>
            <div className="flex rounded-xl overflow-hidden" style={{ border:'0.5px solid var(--brd)' }}>
              {STEPS.map((s, i) => {
                const currentIdx = statusIndex(repair.status)
                const isPast     = i < currentIdx
                const isDoneStep = done.has(i)
                const isCur      = i === cur
                const locked     = i < currentIdx || i > currentIdx + 1
                return (
                  <button key={s} onClick={() => toggleStep(i)} disabled={locked}
                    className="flex-1 py-2 font-semibold text-center border-none"
                    style={{
                      fontSize: 10,
                      borderRight: i < STEPS.length-1 ? '0.5px solid var(--brd)' : 'none',
                      background:  (isPast||isDoneStep) ? 'var(--gdim)' : isCur ? 'var(--acc)' : 'var(--s2)',
                      color:       (isPast||isDoneStep) ? 'var(--grn)'  : isCur ? '#fff' : 'var(--t3)',
                      cursor:      locked ? 'not-allowed' : 'pointer',
                      opacity:     locked && !isDoneStep ? 0.55 : 1,
                    }}>
                    {(isPast || isDoneStep) ? '✓ ' : ''}{s}
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-t3 mt-2">
              จะบันทึกสถานะ: <strong className="text-acc">{newStatus}</strong>
              {needApproval && <span className="text-err ml-2">⚠️ ต้องรออนุมัติก่อน</span>}
            </p>
          </div>

          {/* Consent gate — ส่งให้ลูกค้าอนุมัติ */}
          {repair.status === 'diagnosing' && (!approval || approval.state !== 'approved') && (
            <div className="card p-4" style={{ border:'0.5px solid var(--abrd)' }}>
              <p className="text-xs font-bold text-t1 mb-1">📋 ส่งให้ลูกค้าอนุมัติก่อนซ่อม</p>
              <p className="text-xs text-t2 mb-3">เพิ่มรายการงานที่จะทำ แล้วกดส่งให้ลูกค้ายืนยัน (ซ่อมต่อไม่ได้จนกว่าลูกค้าจะอนุมัติ)</p>
              <button onClick={handleRequestApproval} disabled={saving}
                className="w-full py-2.5 rounded-xl text-sm font-bold text-white border-none cursor-pointer"
                style={{ background:'var(--acc)' }}>
                ส่งให้ลูกค้าอนุมัติ
              </button>
            </div>
          )}

          {/* Input — เฉพาะชื่อ/จำนวน (ไม่มีราคา) */}
          <div className="card p-4">
            <p className="text-xs font-bold text-t3 uppercase tracking-widest mb-3">เพิ่มรายการ/อะไหล่</p>
            <input className="input-field mb-2" placeholder="ชื่ออะไหล่ / รายการ"
              value={item} onChange={e => setItem(e.target.value)} style={{ fontSize:12 }} />
            <input className="input-field mb-2" style={{ width:96, fontSize:12 }}
              placeholder="จำนวน" value={qty} onChange={e => setQty(e.target.value)} type="number" />
            <textarea className="input-field resize-none mb-3" style={{ height:50, fontSize:12 }}
              placeholder="หมายเหตุ..." value={note} onChange={e => setNote(e.target.value)} />

            {(repair.proposedJobs||[]).length > 0 && (
              <div className="mb-3 p-3 rounded-xl" style={{ background:'var(--s2)' }}>
                <p className="text-xs font-bold text-t2 mb-2">รายการงานที่บันทึกไว้</p>
                {repair.proposedJobs.map((ci, idx) => (
                  <div key={idx} className="flex justify-between text-xs py-0.5">
                    <span className="text-t2">{ci.name}</span>
                    <span className="font-semibold text-t1">×{ci.qty}</span>
                  </div>
                ))}
              </div>
            )}

            {msg && (
              <div className="mb-3 p-2.5 rounded-xl text-xs"
                style={{
                  background: msg.startsWith('✅') ? 'var(--gdim)' : 'var(--errdim)',
                  color:      msg.startsWith('✅') ? 'var(--grn)'  : 'var(--err)',
                }}>
                {msg}
              </div>
            )}

            <button onClick={handleSave} disabled={saving || needApproval || statusIndex(newStatus) === statusIndex(repair.status)}
              className="w-full py-3 rounded-xl text-sm font-bold text-white border-none cursor-pointer flex items-center justify-center gap-2"
              style={{ background: needApproval ? 'var(--s3)' : 'var(--acc)', color: needApproval ? 'var(--t3)' : '#fff', opacity: saving ? 0.7 : 1 }}>
              {saving
                ? <><span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />บันทึก...</>
                : needApproval ? 'รอลูกค้าอนุมัติก่อน' : 'บันทึก + แจ้งเตือนลูกค้า'}
            </button>
          </div>
        </div>
      )}
    </DashboardShell>
  )
}
