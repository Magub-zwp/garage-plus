'use client'
import { useState, useEffect } from 'react'
import DashboardShell from '@/components/staff/DashboardShell'
import { db } from '@/lib/firebase/config'
import { collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore'
import { getSession } from '@/lib/staff/session'

export default function MechHistoryPage() {
  const [history,  setHistory]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')

  useEffect(() => {
    const session = getSession()
    if (!session) return

    getDocs(query(
      collection(db, 'repairs'),
      where('mechanicId', '==', session.uid),
      where('status', '==', 'done'),
      orderBy('createdAt', 'desc'),
      limit(100)
    ))
      .then(snap => setHistory(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])
// Filter history based on search input (plate, car name, or job detail)
  const filtered = search
    ? history.filter(h =>
        (h.plate||h.carPlate||'').includes(search) ||
        (h.carName||'').includes(search) ||
        (h.jobDetail||'').includes(search)
      )
    : history
// Calculate total revenue from the history of repairs
  const totalRevenue = history
    .reduce((s, h) => s + (h.costItems||[]).reduce((a, i) => a + (i.price||0), 0), 0)

  return (
    <DashboardShell requiredRole="mechanic">
      <div className="flex justify-between items-center mb-5">
        <h1 className="font-syne text-xl font-bold text-t1">ประวัติการซ่อม</h1>
        <span className="text-xs font-bold text-acc">{history.length} งาน</span>
      </div>

      {/* Revenue summary */}
      {history.length > 0 && (
        <div className="card p-4 mb-4 flex justify-between items-center"
          style={{ border:'0.5px solid var(--gbrd)', background:'var(--gdim)' }}>
          <div>
            <p className="text-xs text-t2">รายได้รวม (ทั้งหมด)</p>
            <p className="font-syne text-lg font-extrabold text-grn mt-0.5">
              ฿{totalRevenue.toLocaleString()}
            </p>
          </div>
          <span className="text-3xl">💰</span>
        </div>
      )}

      {/* Search */}
      <input
        className="input-field mb-4"
        placeholder="ค้นหาทะเบียน, รุ่นรถ, หรืองานซ่อม..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ fontSize: 13 }}
      />
// Main render function with loading, empty, and data states
      {loading ? (
        <div className="flex justify-center pt-16">
          <span className="inline-block w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor:'var(--acc)', borderTopColor:'transparent' }}/>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-8 text-center">
          <span className="text-3xl mb-3 block">📂</span>
          <p className="font-syne text-sm font-bold text-t1 mb-1">
            {search ? 'ไม่พบผลการค้นหา' : 'ยังไม่มีประวัติการซ่อม'}
          </p>
          <p className="text-xs text-t2">ประวัติงานที่เสร็จแล้วจะแสดงที่นี่</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="data-table" style={{ tableLayout:'fixed', width:'100%' }}>
            <colgroup>
              <col style={{ width:84 }}/><col/><col style={{ width:76 }}/><col style={{ width:80 }}/>
            </colgroup>
            <thead>
              <tr><th>ทะเบียน</th><th>งานซ่อม</th><th>วันที่</th><th>ราคา</th></tr>
            </thead>
            <tbody>
              {filtered.map(h => {
                const total = (h.costItems||[]).reduce((s, i) => s + (i.price||0), 0)
                const doneAt = h.updatedAt?.toDate ? h.updatedAt.toDate() : null
                return (
                  <tr key={h.id}>
                    <td><span className="plate">{h.plate||h.carPlate||'-'}</span></td>
                    <td className="text-xs text-t1">{h.jobDetail||'-'}</td>
                    <td className="text-xs text-t2">
                      {doneAt ? doneAt.toLocaleDateString('th-TH',{day:'2-digit',month:'short'}) : '-'}
                    </td>
                    <td className="text-sm font-bold" style={{ color:'var(--acc)' }}>
                      {total > 0 ? `฿${total.toLocaleString()}` : '-'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </DashboardShell>
  )
}
