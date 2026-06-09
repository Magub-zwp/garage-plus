'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import DashboardShell from '@/components/staff/DashboardShell'
import { db } from '@/lib/firebase/config'
import { doc, getDoc, updateDoc, addDoc, getDocs, collection, query, where, orderBy, limit, deleteDoc, arrayUnion, serverTimestamp } from 'firebase/firestore'
import Link from 'next/link'
import { STEPS, STATUS_MAP, ACTIVE_STATUSES, statusIndex, canTransition, REPAIRING_IDX } from '@/lib/repairStatus'
import { notifyRepairStatus, syncBookingStatus } from '@/lib/notify'

export default function RepairsPage() {
  const params   = useSearchParams()
  const repairId = params.get('id')

  const [repair,    setRepair]    = useState(null)
  const [repairs,   setRepairs]   = useState([])
  const [done,      setDone]      = useState(new Set())
  const [itemName,  setItemName]  = useState('')
  const [qty,       setQty]       = useState('')
  const [note,      setNote]      = useState('')   // TC-X03: บันทึกจริง
  const [saving,    setSaving]    = useState(false)
  const [msg,       setMsg]       = useState('')
  const [loading,   setLoading]   = useState(true)
  const [err,       setErr]       = useState('')   // TC-X02
  const [showCreate, setShowCreate] = useState(false)
  const [newRepair,  setNewRepair]  = useState({ bookingId:'', plate:'', carName:'', mechanicName:'', jobDetail:'' })
  const [creating,   setCreating]   = useState(false)
  const [createMsg,  setCreateMsg]  = useState('')

  const fetchRepairs = useCallback(async () => {
    setErr('')
    try {
      const q = query(
        collection(db, 'repairs'),
        where('status', 'in', ACTIVE_STATUSES),
        orderBy('createdAt', 'desc'),
        limit(20)
      )
      const snap = await getDocs(q)
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setRepairs(list)

      if (repairId) {
        const found = list.find(r => r.id === repairId) || null
        if (found) selectRepair(found)
        else {
          const single = await getDoc(doc(db, 'repairs', repairId))
          if (single.exists()) selectRepair({ id: single.id, ...single.data() })
        }
      } else if (list.length > 0) {
        selectRepair(list[0])
      }
    } catch (e) {
      console.error('[fetchRepairs]', e)
      setErr(e.code === 'failed-precondition'
        ? 'ต้อง deploy Firestore index ก่อน (ดู firestore.indexes.json)'
        : e.code === 'permission-denied'
          ? 'ไม่มีสิทธิ์อ่านข้อมูล (ตรวจสอบการล็อกอิน staff)'
          : 'โหลดข้อมูลไม่สำเร็จ: ' + e.message)
    } finally {
      setLoading(false)
    }
  }, [repairId])

  useEffect(() => { fetchRepairs() }, [fetchRepairs])

  const selectRepair = (r) => {
    setRepair(r)
    const stepIdx = statusIndex(r.status)
    const doneSet = new Set()
    for (let i = 0; i <= stepIdx && stepIdx >= 0; i++) doneSet.add(i)
    setDone(doneSet)
    setItemName(''); setQty(''); setNote(''); setMsg('')
  }

  // TC-S01: ทีละขั้น ห้ามย้อน ห้ามข้าม
  const toggleStep = (i) => {
    if (!repair) return
    const currentIdx = statusIndex(repair.status)
    if (i < currentIdx) return
    if (i > currentIdx + 1) return
    setDone(prev => {
      const n = new Set(prev)
      if (n.has(i)) { for (let j = i; j < STATUS_MAP.length; j++) n.delete(j) }
      else           { for (let j = 0; j <= i; j++) n.add(j) }
      return n
    })
  }

  const cur       = Math.max(-1, ...[...done]) + 1
  const newStatus = STATUS_MAP[Math.max(...[...done], 0)] || 'waiting'
  const approval     = repair?.approval
  const needApproval = statusIndex(newStatus) >= REPAIRING_IDX && approval?.state !== 'approved'

  const handleSave = async () => {
    if (!repair) return
    const check = canTransition(repair.status, newStatus, approval)
    if (!check.ok) { setMsg('❌ ' + check.reason); return }

    setSaving(true); setMsg('')
    try {
      const updates = {
        status:    newStatus,
        updatedAt: serverTimestamp(),
        timeline:  arrayUnion({ status: newStatus, at: Date.now(), by: 'admin', note: note || '' }), // TC-X04
      }
      if (itemName) updates.proposedJobs = arrayUnion({ name: itemName, qty: parseInt(qty) || 1 }) // ไม่มีราคา
      if (note) updates.lastNote = note

      await updateDoc(doc(db, 'repairs', repair.id), updates)
      await notifyRepairStatus({ ...repair }, newStatus)   // TC-S02/C09
      await syncBookingStatus(repair.bookingId, newStatus) // TC-S08

      setRepair(prev => ({ ...prev, status: newStatus }))
      setRepairs(prev => prev.map(r => r.id === repair.id ? { ...r, status: newStatus } : r))
      setMsg('✅ บันทึกสถานะแล้ว — แจ้งเตือนลูกค้าเรียบร้อย')
      setItemName(''); setQty(''); setNote('')
    } catch (e) {
      setMsg(`❌ ${e.code === 'permission-denied' ? 'ไม่มีสิทธิ์บันทึก (ตรวจสอบการล็อกอิน staff)' : e.message}`)
    } finally {
      setSaving(false)
    }
  }

  // TC-S06 + TC-C11: duplicate check + เก็บ entryTime + ผูก userId จาก booking
  const handleCreateRepair = async () => {
    if (!newRepair.plate.trim()) { setCreateMsg('กรุณากรอกทะเบียนรถ'); return }
    setCreating(true); setCreateMsg('')
    try {
      const dupCheck = await getDocs(query(
        collection(db, 'repairs'),
        where('plate', '==', newRepair.plate.trim()),
        where('status', 'in', ACTIVE_STATUSES)
      ))
      if (!dupCheck.empty) {
        setCreateMsg(`⚠️ ทะเบียน ${newRepair.plate} มีในคิวซ่อมอยู่แล้ว`)
        setCreating(false)
        return
      }

      const repairData = {
        ...newRepair,
        userId:     '',
        mechanicId: '',
        status:     'waiting',
        approval:   { state: 'none', approvedBy: null, approvedAt: null, note: '' },
        timeline:   [{ status: 'waiting', at: Date.now(), by: 'admin', note: 'รับรถเข้าอู่' }],
        proposedJobs: [],
        entryTime:  serverTimestamp(),   // TC-C11
        createdAt:  serverTimestamp(),
        updatedAt:  serverTimestamp(),
      }
      if (newRepair.bookingId.trim()) {
        try {
          const bSnap = await getDoc(doc(db, 'bookings', newRepair.bookingId.trim()))
          if (bSnap.exists()) {
            repairData.userId    = bSnap.data().userId || ''
            repairData.bookingId = newRepair.bookingId.trim()
          }
        } catch {}
      }
      if (!repairData.userId) {
        // เตือน: ถ้าไม่ผูก userId ลูกค้าจะไม่เห็นสถานะ/แจ้งเตือน (TC-S01 root cause)
        console.warn('[handleCreateRepair] ไม่มี userId — ลูกค้าจะไม่เห็นสถานะนี้')
      }
      await addDoc(collection(db, 'repairs'), repairData)
      await fetchRepairs()
      setShowCreate(false)
      setNewRepair({ bookingId:'', plate:'', carName:'', mechanicName:'', jobDetail:'' })
      setCreateMsg('')
    } catch(e) {
      setCreateMsg('❌ ' + e.message)
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteRepair = async (rid, plate) => {
    if (!confirm(`ลบรายการซ่อม "${plate}"?\nใช้เฉพาะกรณีบันทึกผิดพลาดเท่านั้น`)) return
    try {
      await deleteDoc(doc(db, 'repairs', rid))
      setRepairs(prev => prev.filter(r => r.id !== rid))
      if (repair?.id === rid) setRepair(null)
    } catch(e) {
      alert('ลบไม่สำเร็จ: ' + e.message)
    }
  }

  const handleCloseCreate = () => {
    setShowCreate(false)
    setNewRepair({ bookingId:'', plate:'', carName:'', mechanicName:'', jobDetail:'' })
    setCreateMsg('')
  }

  return (
    <DashboardShell requiredRole="admin">
      <div className="flex justify-between items-center mb-5">
        <h1 className="font-syne text-xl font-bold text-t1">อัปเดตสถานะงานซ่อม</h1>
        <button onClick={() => { setShowCreate(true); setCreateMsg('') }}
          className="px-4 py-2 rounded-full text-xs font-bold text-white border-none cursor-pointer"
          style={{ background:'var(--acc)' }}>
          + รับรถเข้าอู่
        </button>
      </div>

      {err && <div className="mb-4 p-3 rounded-xl text-xs text-err bg-errdim">{err}</div>}

      {loading ? (
        <div className="flex justify-center pt-20">
          <span className="inline-block w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: 'var(--acc)', borderTopColor: 'transparent' }} />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div>
            <h2 className="font-syne text-sm font-bold text-t1 mb-3">กำลังซ่อม ({repairs.length} คัน)</h2>
            {repairs.length === 0 ? (
              <div className="card p-6 text-center text-t2 text-sm">ไม่มีรถในอู่ขณะนี้</div>
            ) : (
              <div className="flex flex-col gap-2">
                {repairs.map(r => (
                  <div key={r.id} onClick={() => selectRepair(r)}
                    className="card p-3 cursor-pointer active:opacity-80 transition-opacity"
                    style={{ border: repair?.id === r.id ? '1.5px solid var(--acc)' : undefined }}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <p className="font-syne text-sm font-bold text-t1">{r.plate || r.carPlate || '-'}</p>
                        <p className="text-xs text-t2 mt-0.5">{r.mechanicName || 'ยังไม่มอบหมาย'}</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="bdg bdg-rep text-xs">{r.status}</span>
                        <button onClick={e => { e.stopPropagation(); handleDeleteRepair(r.id, r.plate || r.carPlate) }}
                          className="text-xs px-1.5 py-0.5 rounded-lg border-none cursor-pointer"
                          style={{ background:'var(--errdim)', color:'var(--err)' }} title="ลบรายการนี้">✕</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {repair ? (
            <div className="lg:col-span-2 card overflow-hidden">
              <div className="flex justify-between items-start p-4" style={{ borderBottom: '0.5px solid var(--brd)' }}>
                <div>
                  <p className="font-syne text-sm font-bold text-t1">{repair.carName || repair.carBrand || 'รถลูกค้า'}</p>
                  <p className="text-xs text-t2 mt-0.5">{repair.plate || repair.carPlate} · {repair.mechanicName || 'ยังไม่มอบหมาย'}</p>
                </div>
                <span className="bdg bdg-rep">{repair.status}</span>
              </div>

              <div className="p-4">
                {[
                  ['งานซ่อม', repair.jobDetail || '-'],
                  ['เวลาเข้า', repair.entryTime ? new Date(repair.entryTime?.toDate?.() || repair.entryTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.' : '-'],
                  ['อนุมัติ', repair.approval ? (repair.approval.state === 'approved' ? '✅ อนุมัติแล้ว' : repair.approval.state === 'rejected' ? '❌ ปฏิเสธ' : repair.approval.state === 'pending' ? '⏳ รออนุมัติ' : '—') : '—'],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between py-1.5" style={{ borderBottom: '0.5px solid var(--brd)' }}>
                    <span className="text-xs text-t2">{k}</span>
                    <span className="text-xs font-semibold text-t1">{v}</span>
                  </div>
                ))}

                <div className="flex rounded-xl overflow-hidden mt-4 mb-2" style={{ border: '0.5px solid var(--brd)' }}>
                  {STEPS.map((s, i) => {
                    const currentIdx = statusIndex(repair.status)
                    const isPast     = i < currentIdx
                    const isDoneStep = done.has(i)
                    const isCur      = i === cur
                    const locked     = i < currentIdx || i > currentIdx + 1
                    return (
                      <button key={s} onClick={() => toggleStep(i)} disabled={locked}
                        className="flex-1 py-2 font-semibold text-center border-none cursor-pointer"
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

                <p className="text-xs text-t3 mb-3">
                  สถานะที่จะบันทึก: <strong className="text-acc">{newStatus}</strong>
                  {needApproval && <span className="text-err ml-2">⚠️ ต้องรอลูกค้าอนุมัติก่อนซ่อม</span>}
                </p>

                <input className="input-field mb-2" placeholder="รายการ / อะไหล่ (ถ้ามี)" style={{ fontSize: 12 }}
                  value={itemName} onChange={e => setItemName(e.target.value)} />
                <input className="input-field mb-2" style={{ width: 96, fontSize: 12 }} placeholder="จำนวน"
                  value={qty} onChange={e => setQty(e.target.value)} type="number" />
                <textarea className="input-field resize-none mb-3" style={{ height: 50, fontSize: 12 }}
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
                    style={{ background: msg.startsWith('✅') ? 'var(--gdim)' : 'var(--errdim)', color: msg.startsWith('✅') ? 'var(--grn)' : 'var(--err)' }}>
                    {msg}
                  </div>
                )}

                <button onClick={handleSave}
                  disabled={saving || needApproval || statusIndex(newStatus) === statusIndex(repair.status)}
                  className="w-full py-2.5 rounded-xl text-sm font-bold text-white border-none cursor-pointer flex items-center justify-center gap-2"
                  style={{ background: needApproval ? 'var(--s3)' : 'var(--acc)', color: needApproval ? 'var(--t3)' : '#fff', opacity: saving ? 0.7 : 1 }}>
                  {saving
                    ? <><span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />บันทึก...</>
                    : needApproval ? 'รอลูกค้าอนุมัติก่อน' : 'บันทึก + แจ้งเตือน'}
                </button>
              </div>
            </div>
          ) : (
            <div className="lg:col-span-2 card p-10 flex items-center justify-center text-t2 text-sm">
              เลือกรถที่ต้องการอัปเดตจากรายการซ้าย
            </div>
          )}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="rounded-2xl p-6 w-full max-w-md" style={{ background:'var(--surf)' }}>
            <h3 className="font-syne text-base font-bold text-t1 mb-4">รับรถเข้าอู่ใหม่</h3>
            {createMsg && (
              <div className="mb-3 p-2.5 rounded-xl text-xs"
                style={{ background: createMsg.startsWith('⚠️') ? 'var(--adim)' : 'var(--errdim)', color: createMsg.startsWith('⚠️') ? 'var(--acc)' : 'var(--err)' }}>
                {createMsg}
              </div>
            )}
            {[
              { k:'plate',        label:'ทะเบียนรถ *',    placeholder:'เช่น ชม 1234' },
              { k:'carName',      label:'รุ่นรถ',          placeholder:'เช่น Toyota Fortuner 2022' },
              { k:'mechanicName', label:'ช่างรับผิดชอบ',  placeholder:'ชื่อช่าง' },
              { k:'jobDetail',    label:'งานที่ต้องซ่อม',  placeholder:'เช่น เปลี่ยนน้ำมัน, เบรก' },
              { k:'bookingId',    label:'เลขจอง (ผูกลูกค้า)', placeholder:'Booking ID — ถ้ามี ลูกค้าจะเห็นสถานะ' },
            ].map(f => (
              <div key={f.k} className="mb-3">
                <label className="field-label">{f.label}</label>
                <input className="input-field" placeholder={f.placeholder}
                  value={newRepair[f.k]||''} onChange={e => setNewRepair({...newRepair,[f.k]:e.target.value})} />
              </div>
            ))}
            <div className="flex gap-2 mt-2">
              <button onClick={handleCloseCreate}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-t1 border-none cursor-pointer" style={{ background:'var(--s2)' }}>
                ยกเลิก
              </button>
              <button onClick={handleCreateRepair} disabled={creating}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-white border-none cursor-pointer flex items-center justify-center gap-2"
                style={{ background:'var(--acc)' }}>
                {creating
                  ? <><span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />กำลังบันทึก...</>
                  : 'บันทึก + เข้าคิวซ่อม'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  )
}
