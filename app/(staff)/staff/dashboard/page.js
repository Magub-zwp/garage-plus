'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import DashboardShell from '@/components/staff/DashboardShell'
import { db } from '@/lib/firebase/config'
import { collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore'

const BDG = { pending:'bdg-wait', confirmed:'bdg-wait', repairing:'bdg-rep', done:'bdg-done', cancelled:'bdg-hold' }
const BLB = { pending:'รอยืนยัน', confirmed:'ยืนยัน', repairing:'ซ่อม', done:'เสร็จ', cancelled:'ยกเลิก' }

export default function DashboardPage() {
  const [stats,      setStats]      = useState({ queue:0, repairing:0, done:0, pending:0 })
  const [todayQueue, setTodayQueue] = useState([])
  const [newBooks,   setNewBooks]   = useState([])
  const [loading,    setLoading]    = useState(true)

  
  useEffect(() => {
    const todayStr = new Date().toISOString().split('T')[0]
    let loaded = { bookings: false, repairs: false, pending: false }

    const checkLoaded = () => {
      if (loaded.bookings && loaded.repairs && loaded.pending) setLoading(false)
    }

    //  Real-time: bookings วันนี้
    const unsubBook = onSnapshot(
      query(collection(db,'bookings'), where('date','==',todayStr), orderBy('time')),
      snap => {
        const bookings = snap.docs.map(d => ({id:d.id,...d.data()}))
        setTodayQueue(bookings)
        setStats(prev => ({
          ...prev,
          queue: bookings.length,
          done:  bookings.filter(b => b.status === 'done').length,
        }))
        loaded.bookings = true; checkLoaded()
      },
      err => { console.error('[Dashboard bookings]', err); loaded.bookings = true; checkLoaded() }
    )

    // Real-time: repairs ที่กำลังซ่อม
    const unsubRepair = onSnapshot(
      query(collection(db,'repairs'), where('status','in',['waiting','diagnosing','repairing','qc'])),
      snap => {
        setStats(prev => ({ ...prev, repairing: snap.size }))
        loaded.repairs = true; checkLoaded()
      },
      err => { console.error('[Dashboard repairs]', err); loaded.repairs = true; checkLoaded() }
    )

    // Real-time: pending bookings (ล่าสุด 5 รายการ)
    const unsubPending = onSnapshot(
      query(collection(db,'bookings'), where('status','==','pending'), orderBy('createdAt','desc'), limit(5)),
      snap => {
        const pending = snap.docs.map(d => ({id:d.id,...d.data()}))
        setNewBooks(pending)
        setStats(prev => ({ ...prev, pending: snap.size }))
        loaded.pending = true; checkLoaded()
      },
      err => { console.error('[Dashboard pending]', err); loaded.pending = true; checkLoaded() }
    )

    return () => { unsubBook(); unsubRepair(); unsubPending() }
  }, [])

  const STAT_CARDS = [
    { label:'คิววันนี้',    value: stats.queue,     sub:'การจองทั้งหมด',   icon:'📅' },
    { label:'กำลังซ่อม',   value: stats.repairing,  sub:'รถในอู่ตอนนี้',   icon:'🔧', color:'var(--acc)' },
    { label:'เสร็จวันนี้',  value: stats.done,       sub:'ส่งมอบแล้ว',      icon:'✓',  color:'var(--grn)' },
    { label:'รอยืนยัน',    value: stats.pending,     sub:'การจองใหม่',      icon:'🔔', color:'var(--err)' },
  ]

  return (
    <DashboardShell requiredRole="admin">
      <div className="flex justify-between items-center mb-5">
        <h1 className="font-syne text-xl font-bold text-t1">Dashboard</h1>
        <p className="text-xs text-t3">{new Date().toLocaleDateString('th-TH',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</p>
      </div>

      {loading ? (
        <div className="flex justify-center pt-20">
          <span className="inline-block w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor:'var(--acc)', borderTopColor:'transparent' }}/>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            {STAT_CARDS.map(s => (
              <div key={s.label} className="card p-4">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-t2 text-xs uppercase tracking-wider">{s.label}</span>
                  <span style={{ fontSize:18 }}>{s.icon}</span>
                </div>
                <div className="font-syne text-2xl font-extrabold" style={{ color:s.color||'var(--t1)' }}>
                  {s.value}
                </div>
                <div className="text-t3 text-xs mt-1">{s.sub}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Today queue */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h2 className="font-syne text-sm font-bold text-t1">คิววันนี้</h2>
                <Link href="/staff/queue" className="text-xs text-acc font-semibold">ดูทั้งหมด →</Link>
              </div>
              <div className="card overflow-hidden">
                {todayQueue.length === 0 ? (
                  <div className="p-6 text-center text-t2 text-xs">ยังไม่มีการจองวันนี้</div>
                ) : (
                  <table className="data-table" style={{ tableLayout:'fixed', width:'100%' }}>
                    <colgroup>
                      <col style={{ width:54 }}/><col style={{ width:76 }}/><col/>
                      <col style={{ width:90 }}/><col style={{ width:58 }}/>
                    </colgroup>
                    <thead>
                      <tr><th>เวลา</th><th>ทะเบียน</th><th>งาน</th><th>สถานะ</th><th></th></tr>
                    </thead>
                    <tbody>
                      {todayQueue.map(q => (
                        <tr key={q.id}>
                          <td className="text-t2 text-xs">{q.time}</td>
                          <td><span className="plate">{q.carPlate||'-'}</span></td>
                          <td className="text-xs text-t1">{(q.serviceType||[]).join(', ')||'-'}</td>
                          <td><span className={`bdg ${BDG[q.status]||'bdg-wait'}`}>{BLB[q.status]||q.status}</span></td>
                          <td>
                            <Link href={`/staff/queue/${q.id}`}>
                              <button className="act">ดู</button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Pending bookings */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h2 className="font-syne text-sm font-bold text-t1">การจองรอยืนยัน</h2>
                <Link href="/staff/queue" className="text-xs text-acc font-semibold">ดูทั้งหมด →</Link>
              </div>
              <div className="card overflow-hidden" style={{ border:'0.5px solid var(--abrd)' }}>
                {newBooks.length === 0 ? (
                  <div className="p-6 text-center text-t2 text-xs">ไม่มีการจองรอยืนยัน</div>
                ) : newBooks.map((b, i, arr) => (
                  <div key={b.id}
                    style={{ borderBottom: i < arr.length-1 ? '0.5px solid var(--brd)' : 'none' }}>
                    <div className="px-4 py-2.5">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-sm font-semibold text-t1">{b.bookingRef || '#-'}</span>
                        <span className="text-xs text-t3">
                          {b.createdAt?.toDate ? new Date(b.createdAt.toDate()).toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'}) + ' น.' : ''}
                        </span>
                      </div>
                      <p className="text-xs text-t2">{b.date} เวลา {b.time} น. · {b.carPlate||b.plate||'-'}</p>
                    </div>
                    <div className="flex gap-2 px-4 pb-3">
                      <Link href={`/staff/queue/${b.id}`} className="flex-1">
                        <button className="w-full py-1.5 rounded-xl text-xs font-bold cursor-pointer border-none"
                          style={{ background:'var(--gdim)', color:'var(--grn)', border:'0.5px solid var(--gbrd)' }}>
                          รับงาน / ยืนยัน
                        </button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </DashboardShell>
  )
}
