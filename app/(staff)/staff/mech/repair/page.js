'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import DashboardShell from '@/components/staff/DashboardShell'
import { db } from '@/lib/firebase/config'
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'

const STEPS     = ['รับรถ', 'ตรวจ', 'ซ่อม', 'QC', 'เสร็จ']
const STATUS_MAP = ['waiting', 'diagnosing', 'repairing', 'qc', 'done']

export default function MechRepairPage() {
  const params   = useSearchParams()
  const repairId = params.get('id')

  const [repair,   setRepair]   = useState(null)
  const [done,     setDone]     = useState(new Set())
  const [item,     setItem]     = useState('')
  const [qty,      setQty]      = useState('')
  const [price,    setPrice]    = useState('')
  const [note,     setNote]     = useState('')
  const [saving,   setSaving]   = useState(false)
  const [msg,      setMsg]      = useState('')
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    if (!repairId) { setLoading(false); return }
    getDoc(doc(db, 'repairs', repairId)).then(snap => {
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() }
        setRepair(data)
        const stepIdx = STATUS_MAP.indexOf(data.status)
        const s = new Set()
        for (let i = 0; i <= stepIdx && stepIdx >= 0; i++) s.add(i)
        setDone(s)
      }
    }).catch(console.error).finally(() => setLoading(false))
  }, [repairId])

  //ป้องกันการกดขั้นตอนย้อนกลับไปสถานะก่อนหน้า
  const toggleStep = (i) => {
    if (!repair) return
    const currentIdx = STATUS_MAP.indexOf(repair.status)
    if (i < currentIdx) return 
    setDone(prev => {
      const n = new Set(prev)
      if (n.has(i)) { for (let j = i; j < 5; j++) n.delete(j) }
      else          { for (let j = 0; j <= i; j++) n.add(j) }
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
      setMsg('❌ ไม่สามารถย้อนสถานะกลับได้')
      return
    }

    setSaving(true); setMsg('')
    try {
      await updateDoc(doc(db, 'repairs', repair.id), {
        status:    newStatus,
        updatedAt: serverTimestamp(),
        ...(item ? {
          costItems: [...(repair.costItems||[]), {
            name: item, qty: parseInt(qty)||1, price: parseFloat(price)||0,
          }]
        } : {}),
      })
      // แจ้งเตือนลูกค้าด้วยผ่าน Cloud Function ที่ฟังการเปลี่ยนแปลงของ repair.status
      setRepair(prev => ({ ...prev, status: newStatus }))
      // รีเซ็ต done set ให้ตรงกับสถานะใหม่
      const newIdx = STATUS_MAP.indexOf(newStatus)
      const newDone = new Set()
      for (let i = 0; i <= newIdx; i++) newDone.add(i)
      setDone(newDone)
      setMsg('✅ บันทึกสถานะแล้ว')
      setItem(''); setQty(''); setPrice(''); setNote('')
    } catch(e) {
      setMsg(`❌ ${e.message}`)
    } finally { setSaving(false) }
  }

  return (
    <DashboardShell requiredRole="mechanic">
      <div className="flex items-center gap-3 mb-5">
        <Link href="/staff/mech/queue" className="text-t2 text-sm">‹ กลับ</Link>
        <h1 className="font-syne text-xl font-bold text-t1">บันทึกงานซ่อม</h1>
      </div>

      {!repairId ? (
        <div className="card p-10 text-center">
          <span className="text-4xl mb-3 block">🔧</span>
          <p className="font-syne text-sm font-bold text-t1 mb-2">ไม่ได้เลือกงานซ่อม</p>
          <Link href="/staff/mech/queue" className="text-xs text-acc font-semibold">
            ← กลับไปที่คิว
          </Link>
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
            ].map(([k,v]) => (
              <div key={k} className="flex justify-between py-1.5"
                style={{ borderBottom:'0.5px solid var(--brd)' }}>
                <span className="text-xs text-t2">{k}</span>
                <span className="text-xs font-semibold text-t1">{v}</span>
              </div>
            ))}
          </div>

          {/* Step bar */}
          <div className="card p-4">
            <p className="text-xs text-t3 mb-2">อัปเดตขั้นตอน</p>
            <div className="flex rounded-xl overflow-hidden" style={{ border:'0.5px solid var(--brd)' }}>
              {STEPS.map((s, i) => {
                const currentIdx = STATUS_MAP.indexOf(repair.status)
                const isPast     = i < currentIdx
                const isDoneStep = done.has(i)
                const isCur      = i === cur
                return (
                  <button key={s} onClick={() => toggleStep(i)}
                    disabled={isPast}
                    className="flex-1 py-2 text-xs font-semibold text-center border-none"
                    style={{
                      borderRight: i < 4 ? '0.5px solid var(--brd)' : 'none',
                      background:  isPast ? 'var(--gdim)' : isDoneStep ? 'var(--gdim)' : isCur ? 'var(--acc)' : 'var(--s2)',
                      color:       isPast ? 'var(--grn)'  : isDoneStep ? 'var(--grn)'  : isCur ? '#fff' : 'var(--t3)',
                      cursor:      isPast ? 'not-allowed' : 'pointer',
                      opacity:     isPast ? 0.7 : 1,
                    }}>
                    {(isPast || isDoneStep) ? '✓ ' : ''}{s}
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-t3 mt-2">
              จะบันทึกสถานะ: <strong className="text-acc">{newStatus}</strong>
            </p>
          </div>

          {/* Input */}
          <div className="card p-4">
            <p className="text-xs font-bold text-t3 uppercase tracking-widest mb-3">เพิ่มรายการ/อะไหล่</p>
            <input className="input-field mb-2" placeholder="ชื่ออะไหล่ / รายการ"
              value={item} onChange={e => setItem(e.target.value)} style={{ fontSize:12 }} />
            <div className="flex gap-2 mb-2">
              <input className="input-field" style={{ width:72, fontSize:12 }}
                placeholder="จำนวน" value={qty} onChange={e => setQty(e.target.value)} type="number" />
              <input className="input-field flex-1" style={{ fontSize:12 }}
                placeholder="ราคา (บาท)" value={price} onChange={e => setPrice(e.target.value)} type="number" />
            </div>
            <textarea className="input-field resize-none mb-3" style={{ height:50, fontSize:12 }}
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

            <button onClick={handleSave} disabled={saving || STATUS_MAP.indexOf(newStatus) < STATUS_MAP.indexOf(repair.status)}
              className="w-full py-3 rounded-xl text-sm font-bold text-white border-none cursor-pointer flex items-center justify-center gap-2"
              style={{ background:'var(--acc)', opacity: saving ? 0.7 : 1 }}>
              {saving
                ? <><span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />บันทึก...</>
                : 'บันทึก + แจ้งลูกค้า'}
            </button>
          </div>
        </div>
      )}
    </DashboardShell>
  )
}
