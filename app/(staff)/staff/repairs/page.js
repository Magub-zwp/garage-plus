'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import DashboardShell from '@/components/staff/DashboardShell'
import { db } from '@/lib/firebase/config'
import { doc, getDoc, updateDoc, addDoc, getDocs, collection, query, where, orderBy, limit, deleteDoc, serverTimestamp } from 'firebase/firestore'
import Link from 'next/link'

const STEPS     = ['รับรถ', 'ตรวจ', 'ซ่อม', 'QC', 'ส่งมอบ']
const STATUS_MAP = ['waiting', 'diagnosing', 'repairing', 'qc', 'done']

export default function RepairsPage() {
  const params   = useSearchParams()
  const repairId = params.get('id')

  const [repair,    setRepair]    = useState(null)
  const [repairs,   setRepairs]   = useState([])
  const [done,      setDone]      = useState(new Set())
  const [itemName,  setItemName]  = useState('')
  const [qty,       setQty]       = useState('')
  const [price,     setPrice]     = useState('')
  const [note,      setNote]      = useState('')
  const [saving,    setSaving]    = useState(false)
  const [msg,       setMsg]       = useState('')
  const [loading,   setLoading]   = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newRepair,  setNewRepair]  = useState({ bookingId:'', plate:'', carName:'', mechanicName:'', jobDetail:'' })
  const [creating,   setCreating]   = useState(false)
  const [createMsg,  setCreateMsg]  = useState('')

  const fetchRepairs = useCallback(async () => {
    try {
      const q = query(
        collection(db, 'repairs'),
        where('status', 'in', ['waiting', 'diagnosing', 'repairing', 'qc']),
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
    } finally {
      setLoading(false)
    }
  }, [repairId])

  useEffect(() => { fetchRepairs() }, [fetchRepairs])

  const selectRepair = (r) => {
    setRepair(r)
    const stepIdx = STATUS_MAP.indexOf(r.status)
    const doneSet = new Set()
    for (let i = 0; i <= stepIdx && stepIdx >= 0; i++) doneSet.add(i)
    setDone(doneSet)
    setItemName(''); setQty(''); setPrice(''); setNote(''); setMsg('')
  }

 // ป้องกันการกดขั้นตอนย้อนกลับไปสถานะก่อนหน้า
  const toggleStep = (i) => {
    if (!repair) return
    const currentIdx = STATUS_MAP.indexOf(repair.status)
    // ห้ามย้อนกลับต่ำกว่า status ปัจจุบัน
    if (i < currentIdx) return
    setDone(prev => {
      const n = new Set(prev)
      if (n.has(i)) { for (let j = i; j < 5; j++) n.delete(j) }
      else           { for (let j = 0; j <= i; j++) n.add(j) }
      return n
    })
  }

  const cur       = Math.max(-1, ...[...done]) + 1
  const newStatus = STATUS_MAP[Math.max(...[...done], 0)] || 'waiting'

  const handleSave = async () => {
    if (!repair) return

   
    const prevIdx = STATUS_MAP.indexOf(repair.status)
    const nextIdx = STATUS_MAP.indexOf(newStatus)
    if (nextIdx < prevIdx) {
      setMsg('❌ ไม่สามารถย้อนสถานะกลับได้ กรุณาติดต่อ Admin')
      return
    }

    setSaving(true); setMsg('')
    try {
      await updateDoc(doc(db, 'repairs', repair.id), {
        status:    newStatus,
        updatedAt: serverTimestamp(),
        ...(itemName ? {
          costItems: [...(repair.costItems || []), {
            name:  itemName,
            qty:   parseInt(qty) || 1,
            price: parseFloat(price) || 0,
          }]
        } : {}),
      })
    
      setRepair(prev => ({ ...prev, status: newStatus }))
      setRepairs(prev => prev.map(r => r.id === repair.id ? { ...r, status: newStatus } : r))
      setMsg('✅ บันทึกสถานะแล้ว')
      setItemName(''); setQty(''); setPrice(''); setNote('')
    } catch (e) {
      setMsg(`❌ เกิดข้อผิดพลาด: ${e.message}`)
    } finally {
      setSaving(false)
    }
  }


  const handleCreateRepair = async () => {
    if (!newRepair.plate.trim()) { setCreateMsg('กรุณากรอกทะเบียนรถ'); return }
    setCreating(true); setCreateMsg('')
    try {
      // ตรวจ plate ซ้ำ
      const dupCheck = await getDocs(query(
        collection(db, 'repairs'),
        where('plate', '==', newRepair.plate.trim()),
        where('status', 'in', ['waiting','diagnosing','repairing','qc'])
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
        timeline:   [],
        costItems:  [],
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
// ฟังก์ชันลบรายการซ่อม — ใช้เฉพาะกรณีบันทึกผิดพลาดเท่านั้น เพราะจะมีผลกระทบกับสถิติและการแจ้งเตือนลูกค้า
  const handleDeleteRepair = async (repairId, plate) => {
    if (!confirm(`ลบรายการซ่อม "${plate}"?\nใช้เฉพาะกรณีบันทึกผิดพลาดเท่านั้น`)) return
    try {
      await deleteDoc(doc(db, 'repairs', repairId))
      setRepairs(prev => prev.filter(r => r.id !== repairId))
      if (repair?.id === repairId) setRepair(null)
    } catch(e) {
      alert('ลบไม่สำเร็จ: ' + e.message)
    }
  }
// ฟังก์ชันปิดฟอร์มสร้างรายการซ่อมใหม่ และรีเซ็ตข้อมูลในฟอร์ม
  const handleCloseCreate = () => {
    setShowCreate(false)
    setNewRepair({ bookingId:'', plate:'', carName:'', mechanicName:'', jobDetail:'' })
    setCreateMsg('')
  }

  return (
    <DashboardShell requiredRole="admin">
      <div className="flex justify-between items-center mb-5">
        <h1 className="font-syne text-xl font-bold text-t1">อัปเดตสถานะงานซ่อม</h1>
        <button
          onClick={() => { setShowCreate(true); setCreateMsg('') }}
          className="px-4 py-2 rounded-full text-xs font-bold text-white border-none cursor-pointer"
          style={{ background:'var(--acc)' }}>
          + รับรถเข้าอู่
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center pt-20">
          <span className="inline-block w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: 'var(--acc)', borderTopColor: 'transparent' }} />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* รายการรถที่กำลังซ่อม */}
          <div>
            <h2 className="font-syne text-sm font-bold text-t1 mb-3">
              กำลังซ่อม ({repairs.length} คัน)
            </h2>
            {repairs.length === 0 ? (
              <div className="card p-6 text-center text-t2 text-sm">ไม่มีรถในอู่ขณะนี้</div>
            ) : (
              <div className="flex flex-col gap-2">
                {repairs.map(r => (
                  <div key={r.id}
                    onClick={() => selectRepair(r)}
                    className="card p-3 cursor-pointer active:opacity-80 transition-opacity"
                    style={{ border: repair?.id === r.id ? '1.5px solid var(--acc)' : undefined }}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <p className="font-syne text-sm font-bold text-t1">{r.plate || r.carPlate || '-'}</p>
                        <p className="text-xs text-t2 mt-0.5">{r.mechanicName || 'ยังไม่มอบหมาย'}</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="bdg bdg-rep text-xs">{r.status}</span>
                        <button
                          onClick={e => { e.stopPropagation(); handleDeleteRepair(r.id, r.plate || r.carPlate) }}
                          className="text-xs px-1.5 py-0.5 rounded-lg border-none cursor-pointer"
                          style={{ background:'var(--errdim)', color:'var(--err)' }}
                          title="ลบรายการนี้">
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* อัปเดตสถานะ */}
          {repair ? (
            <div className="lg:col-span-2 card overflow-hidden">
              <div className="flex justify-between items-start p-4" style={{ borderBottom: '0.5px solid var(--brd)' }}>
                <div>
                  <p className="font-syne text-sm font-bold text-t1">
                    {repair.carName || repair.carBrand || 'รถลูกค้า'}
                  </p>
                  <p className="text-xs text-t2 mt-0.5">
                    {repair.plate || repair.carPlate} · {repair.mechanicName || 'ยังไม่มอบหมาย'}
                  </p>
                </div>
                <span className="bdg bdg-rep">{repair.status}</span>
              </div>

              <div className="p-4">
                {[
                  ['งานซ่อม', repair.jobDetail || '-'],
                  ['เวลาเข้า', repair.entryTime ? new Date(repair.entryTime?.toDate?.() || repair.entryTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.' : '-'],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between py-1.5" style={{ borderBottom: '0.5px solid var(--brd)' }}>
                    <span className="text-xs text-t2">{k}</span>
                    <span className="text-xs font-semibold text-t1">{v}</span>
                  </div>
                ))}

                {/* แถบขั้นตอน */}
                <div className="flex rounded-xl overflow-hidden mt-4 mb-2" style={{ border: '0.5px solid var(--brd)' }}>
                  {STEPS.map((s, i) => {
                    const currentIdx = STATUS_MAP.indexOf(repair.status)
                    const isPast     = i < currentIdx
                    const isDoneStep = done.has(i)
                    const isCur      = i === cur
                    return (
                      <button key={s} onClick={() => toggleStep(i)}
                        disabled={isPast}
                        className="flex-1 py-2 text-xs font-semibold text-center border-none cursor-pointer"
                        style={{
                          borderRight: i < 4 ? '0.5px solid var(--brd)' : 'none',
                          background:  isPast ? 'var(--gdim)' : isDoneStep ? 'var(--gdim)' : isCur ? 'var(--acc)' : 'var(--s2)',
                          color:       isPast ? 'var(--grn)'  : isDoneStep ? 'var(--grn)'  : isCur ? '#fff' : 'var(--t3)',
                          cursor:      isPast ? 'not-allowed' : 'pointer',
                          opacity:     isPast ? 0.6 : 1,
                        }}>
                        {(isPast || isDoneStep) ? '✓ ' : ''}{s}
                      </button>
                    )
                  })}
                </div>

                <p className="text-xs text-t3 mb-3">
                  สถานะที่จะบันทึก: <strong className="text-acc">{newStatus}</strong>
                  {STATUS_MAP.indexOf(newStatus) < STATUS_MAP.indexOf(repair.status) && (
                    <span className="text-err ml-2">⚠️ ไม่สามารถย้อนกลับได้</span>
                  )}
                </p>

                <input className="input-field mb-2" placeholder="รายการ / อะไหล่ (ถ้ามี)" style={{ fontSize: 12 }}
                  value={itemName} onChange={e => setItemName(e.target.value)} />
                <div className="flex gap-2 mb-2">
                  <input className="input-field" style={{ width: 72, fontSize: 12 }} placeholder="จำนวน"
                    value={qty} onChange={e => setQty(e.target.value)} type="number" />
                  <input className="input-field flex-1" style={{ fontSize: 12 }} placeholder="ราคา (บาท)"
                    value={price} onChange={e => setPrice(e.target.value)} type="number" />
                </div>
                <textarea className="input-field resize-none mb-3" style={{ height: 50, fontSize: 12 }}
                  placeholder="หมายเหตุ..." value={note} onChange={e => setNote(e.target.value)} />

                {(repair.costItems||[]).length > 0 && (
                  <div className="mb-3 p-3 rounded-xl" style={{ background:'var(--s2)' }}>
                    <p className="text-xs font-bold text-t2 mb-2">รายการที่บันทึกไว้แล้ว</p>
                    {repair.costItems.map((ci, idx) => (
                      <div key={idx} className="flex justify-between text-xs py-0.5">
                        <span className="text-t2">{ci.name} ×{ci.qty}</span>
                        <span className="font-semibold text-t1">฿{(ci.price||0).toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-xs pt-1 mt-1"
                      style={{ borderTop:'0.5px solid var(--brd)' }}>
                      <span className="font-bold text-t1">รวม</span>
                      <span className="font-extrabold text-acc">
                        ฿{repair.costItems.reduce((s,i)=>s+(i.price||0),0).toLocaleString()}
                      </span>
                    </div>
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

                <button
                  onClick={handleSave}
                  disabled={saving || STATUS_MAP.indexOf(newStatus) < STATUS_MAP.indexOf(repair.status)}
                  className="w-full py-2.5 rounded-xl text-sm font-bold text-white border-none cursor-pointer flex items-center justify-center gap-2"
                  style={{ background: 'var(--acc)', opacity: saving ? 0.7 : 1 }}>
                  {saving
                    ? <><span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />บันทึก...</>
                    : 'บันทึก + แจ้งเตือน'}
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

      {/* Create repair modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="rounded-2xl p-6 w-full max-w-md" style={{ background:'var(--surf)' }}>
            <h3 className="font-syne text-base font-bold text-t1 mb-4">รับรถเข้าอู่ใหม่</h3>

            {createMsg && (
              <div className="mb-3 p-2.5 rounded-xl text-xs"
                style={{
                  background: createMsg.startsWith('⚠️') ? 'var(--adim)' : 'var(--errdim)',
                  color:      createMsg.startsWith('⚠️') ? 'var(--acc)'  : 'var(--err)',
                }}>
                {createMsg}
              </div>
            )}

            {[
              { k:'plate',        label:'ทะเบียนรถ *',    placeholder:'เช่น ชม 1234' },
              { k:'carName',      label:'รุ่นรถ',          placeholder:'เช่น Toyota Fortuner 2022' },
              { k:'mechanicName', label:'ช่างรับผิดชอบ',  placeholder:'ชื่อช่าง' },
              { k:'jobDetail',    label:'งานที่ต้องซ่อม',  placeholder:'เช่น เปลี่ยนน้ำมัน, เบรก' },
              { k:'bookingId',    label:'เลขจอง (ถ้ามี)', placeholder:'Booking ID จาก Firestore' },
            ].map(f => (
              <div key={f.k} className="mb-3">
                <label className="field-label">{f.label}</label>
                <input className="input-field" placeholder={f.placeholder}
                  value={newRepair[f.k]||''} onChange={e => setNewRepair({...newRepair,[f.k]:e.target.value})} />
              </div>
            ))}

            <div className="flex gap-2 mt-2">
              <button onClick={handleCloseCreate}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-t1 border-none cursor-pointer"
                style={{ background:'var(--s2)' }}>
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
