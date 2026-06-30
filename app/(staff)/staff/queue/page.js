'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import DashboardShell from '@/components/staff/DashboardShell'
import { db } from '@/lib/firebase/config'
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore'

const BDG = { pending:'bdg-wait', confirmed:'bdg-wait', repairing:'bdg-rep', done:'bdg-done', cancelled:'bdg-hold' }
const BLB = { pending:'รอยืนยัน', confirmed:'ยืนยัน', repairing:'ซ่อม', done:'เสร็จ', cancelled:'ยกเลิก' }

export default function QueuePage() {
  const today = new Date().toISOString().split('T')[0]
  const [date,     setDate]     = useState(today)
  const [bookings, setBookings] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState('all')
  const [err,      setErr]      = useState('')

  // ใช้ onSnapshot ฟังข้อมูลแบบ real-time แทนการ fetch ครั้งเดียวด้วย getDocs
  // เพื่อให้รายการคิวอัปเดตทันทีเมื่อมีการจองใหม่หรือสถานะเปลี่ยน
  useEffect(() => {
    setLoading(true); setErr('')
    const q = query(
      collection(db, 'bookings'),
      where('date', '==', date),
      orderBy('time')
    )
    const unsub = onSnapshot(q,
      snap => {
        setBookings(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        setLoading(false)
      },
      e => {
        console.error('[Queue onSnapshot]', e)
        setErr(e.code === 'failed-precondition'
          ? 'ยังไม่ได้ deploy Firestore index (bookings: date+time)'
          : e.code === 'permission-denied'
            ? 'ไม่มีสิทธิ์อ่านข้อมูล — ตรวจสอบการล็อกอิน staff'
            : 'โหลดข้อมูลไม่สำเร็จ')
        setLoading(false)
      }
    )
    return () => unsub()
  }, [date])

  // ยกเลิกอัตโนมัติสำหรับคิวที่เลยเวลานัด (เกิน 30 นาที) และยัง pending/confirmed
  useEffect(() => {
    if (!bookings.length) return
    const now = new Date()
    bookings.forEach(async (b) => {
      if (b.status === 'pending' || b.status === 'confirmed') {
        const bTime = new Date(`${b.date}T${b.time}:00`)
        bTime.setMinutes(bTime.getMinutes() + 30) // ให้เวลาเลท 30 นาที
        if (now > bTime) {
          try {
            await updateDoc(doc(db, 'bookings', b.id), {
              status: 'cancelled',
              cancelReason: 'ไม่มาตามนัด / เลยเวลานัด (อัตโนมัติ)',
              updatedAt: serverTimestamp()
            })
            // ไม่ต้องแจ้งเตือนผ่าน API (หรือจะแจ้งก็ได้ แต่ปกติถ้าไม่มาก็แค่ตัดคิว)
          } catch (e) {
            console.error('Auto cancel failed:', e)
          }
        }
      }
    })
  }, [bookings])

  const shown = filter === 'all'
    ? bookings
    : bookings.filter(b => b.status === filter)

  const counts = {
    all:       bookings.length,
    pending:   bookings.filter(b => b.status === 'pending').length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    repairing: bookings.filter(b => b.status === 'repairing').length,
    done:      bookings.filter(b => b.status === 'done').length,
  }

  return (
    <DashboardShell requiredRole="admin">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-5">
        <h1 className="font-syne text-xl font-bold text-t1">จัดการคิว</h1>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="input-field"
          style={{ width: 160, fontSize: 13 }}
        />
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {[
          { k:'all',       l:`ทั้งหมด (${counts.all})` },
          { k:'pending',   l:`รอยืนยัน (${counts.pending})` },
          { k:'confirmed', l:`ยืนยัน (${counts.confirmed})` },
          { k:'repairing', l:`ซ่อม (${counts.repairing})` },
          { k:'done',      l:`เสร็จ (${counts.done})` },
        ].map(f => (
          <button key={f.k} onClick={() => setFilter(f.k)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold border-none cursor-pointer"
            style={{
              background: filter===f.k ? 'var(--acc)' : 'var(--surf)',
              color:      filter===f.k ? '#fff' : 'var(--t2)',
              border:     `0.5px solid ${filter===f.k ? 'var(--acc)' : 'var(--brd2)'}`,
            }}>
            {f.l}
          </button>
        ))}
      </div>

      {err && <div className="mb-4 p-3 rounded-xl text-xs text-err bg-errdim">⚠️ {err}</div>}

      {loading ? (
        <div className="flex justify-center pt-16">
          <span className="inline-block w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor:'var(--acc)', borderTopColor:'transparent' }}/>
        </div>
      ) : shown.length === 0 ? (
        <div className="card p-10 text-center text-t2 text-sm">
          {bookings.length === 0 ? `ไม่มีการจองวันที่ ${date}` : 'ไม่มีรายการในสถานะนี้'}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="data-table" style={{ tableLayout:'fixed', width:'100%' }}>
            <colgroup>
              <col style={{ width:58 }}/><col style={{ width:76 }}/><col style={{ width:100 }}/>
              <col/><col style={{ width:92 }}/><col style={{ width:60 }}/>
            </colgroup>
            <thead>
              <tr><th>เวลา</th><th>ทะเบียน</th><th>ลูกค้า</th><th>งาน</th><th>สถานะ</th><th></th></tr>
            </thead>
            <tbody>
              {shown.map(q => (
                <tr key={q.id}>
                  <td className="text-t2 text-xs">{q.time}</td>
                  <td><span className="plate">{q.carPlate||q.plate||'-'}</span></td>
                  <td className="text-xs text-t1">{q.customerName || q.userId?.slice(0,8) || '-'}</td>
                  <td className="text-xs text-t1">{(q.serviceType||[]).join(', ')||'-'}</td>
                  <td><span className={`bdg ${BDG[q.status]||'bdg-wait'}`}>{BLB[q.status]||q.status}</span></td>
                  <td>
                    <Link href={`/staff/queue/${q.id}`}>
                      <button className="act">
                        {q.status==='done' ? 'ดู' : q.status==='pending' ? 'ยืนยัน' : 'อัปเดต'}
                      </button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardShell>
  )
}
