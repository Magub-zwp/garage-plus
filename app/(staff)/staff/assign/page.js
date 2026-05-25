'use client'
import { useState, useEffect } from 'react'
import DashboardShell from '@/components/staff/DashboardShell'
import { db } from '@/lib/firebase/config'
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore'

export default function AssignPage() {
  const [unassigned, setUnassigned] = useState([])
  const [mechanics,  setMechanics]  = useState([])
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState({})
  const [msg,        setMsg]        = useState('')
  const [err,        setErr]        = useState('')
// Function to fetch unassigned repairs and mechanics on duty
  const fetchAll = async () => {
    setLoading(true); setErr('')
    try {
      // B08 FIX: ลบ r1 query ที่ไม่ได้ใช้ผลลัพธ์ออก — ประหยัด 1 Firestore read
      const [r2, staffSnap] = await Promise.all([
        getDocs(query(collection(db,'repairs'),
          where('status','in',['waiting','diagnosing']))),
        getDocs(collection(db,'staff')),
      ])

      const noMech = r2.docs
        .map(d => ({ id:d.id,...d.data() }))
        .filter(r => !r.mechanicId || r.mechanicId === '' || r.mechanicId === null)

      setUnassigned(noMech)
      setMechanics(
        staffSnap.docs.map(d => ({ uid:d.id,...d.data() }))
          .filter(s => s.role === 'mechanic')
      )
    } catch(e) {
      console.error('[Assign]', e)
      setErr('โหลดข้อมูลไม่สำเร็จ: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [])
// Function to handle assigning a repair job to a mechanic
  const handleAssign = async (repairId, mech) => {
    setSaving(prev => ({...prev,[repairId]:true}))
    try {
      await updateDoc(doc(db,'repairs',repairId), {
        mechanicId:   mech.uid,
        mechanicName: mech.name,
        updatedAt:    serverTimestamp(),
      })
      setUnassigned(prev => prev.filter(r => r.id !== repairId))
      setMsg(`✅ มอบหมายงานให้ ${mech.name} แล้ว`)
      setTimeout(() => setMsg(''), 3000)
    } catch(e) { setMsg(`❌ ${e.message}`) }
    finally { setSaving(prev => ({...prev,[repairId]:false})) }
  }
// Main render function with loading, error, and empty states
  return (
    <DashboardShell requiredRole="admin">
      <div className="flex justify-between items-center mb-5">
        <div>
          <h1 className="font-syne text-xl font-bold text-t1">มอบหมายงาน</h1>
          <p className="text-xs text-t2 mt-0.5">{unassigned.length} งานรอมอบหมาย</p>
        </div>
        <button onClick={fetchAll}
          className="text-xs text-acc font-semibold cursor-pointer border-none bg-transparent">
          🔄 รีเฟรช
        </button>
      </div>

      {err && (
        <div className="mb-4 p-3 rounded-xl text-xs text-err bg-errdim">{err}</div>
      )}
      {msg && (
        <div className="mb-4 p-3 rounded-xl text-xs"
          style={{ background:msg.startsWith('✅')?'var(--gdim)':'var(--errdim)', color:msg.startsWith('✅')?'var(--grn)':'var(--err)' }}>
          {msg}
        </div>
      )}

      {/* Mechanics on duty */}
      {mechanics.length > 0 && (
        <div className="flex gap-2 mb-5 flex-wrap">
          {mechanics.map(m => (
            <div key={m.uid} className="card px-4 py-2.5 flex items-center gap-2">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{ background:'var(--acc)' }}>
                {(m.name||'?')[0]}
              </div>
              <span className="text-xs font-semibold text-t1">{m.name}</span>
            </div>
          ))}
        </div>
      )}
// Unassigned repairs list with assign buttons
      {loading ? (
        <div className="flex justify-center pt-16">
          <span className="inline-block w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor:'var(--acc)', borderTopColor:'transparent' }}/>
        </div>
      ) : unassigned.length === 0 ? (
        <div className="card p-10 text-center">
          <span className="text-4xl mb-3 block">✅</span>
          <p className="font-syne text-sm font-bold text-t1 mb-1">ไม่มีงานรอมอบหมาย</p>
          <p className="text-xs text-t2">งานซ่อมทุกรายการถูกมอบหมายแล้ว</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {unassigned.map(r => (
            <div key={r.id} className="card p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-syne text-sm font-bold text-t1">
                    {r.plate||r.carPlate||'-'} · {r.carName||''}
                  </p>
                  <p className="text-xs text-t2 mt-0.5">{r.jobDetail||'-'}</p>
                </div>
                <span className="bdg bdg-wait flex-shrink-0">{r.status}</span>
              </div>

              {mechanics.length === 0 ? (
                <p className="text-xs text-err">
                  ยังไม่มีช่างในระบบ —{' '}
                  <a href="/staff/employees" className="underline">เพิ่มช่างก่อน</a>
                </p>
              ) : (
                <div className="flex gap-2 flex-wrap">
                  {mechanics.map(m => (
                    <button key={m.uid}
                      onClick={() => handleAssign(r.id, m)}
                      disabled={saving[r.id]}
                      className="flex-1 py-2 rounded-xl text-xs font-bold cursor-pointer border-none min-w-24"
                      style={{ background:'var(--adim)', color:'var(--acc)', border:'0.5px solid var(--abrd)' }}>
                      {saving[r.id] ? '...' : `มอบให้ ${m.name}`}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </DashboardShell>
  )
}
