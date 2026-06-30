'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { getRepairHistory } from '@/lib/firebase/firestore'
import BottomNav from '@/components/customer/BottomNav'

const ICON_MAP = { น้ำมัน:'🛢️', เบรก:'🔩', ยาง:'🔄', แบต:'🔋', ตรวจ:'🚗' }
function getIcon(name) {
  for (const [k, v] of Object.entries(ICON_MAP)) if (name?.includes(k)) return v
  return '🔧'
}

export default function HistoryPage() {
  const { uid } = useAuth()
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState('all')
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => {
    if (!uid) return
    getRepairHistory(uid)
      .then((docs) => {
        const mapped = docs.map(d => ({
          ...d,
          displayTitle: d.carName || d.plate || 'งานซ่อม',
          displayDetail: d.jobDetail || 'ซ่อมบำรุงทั่วไป',
          displayDate: d.createdAt ? new Date(d.createdAt.seconds * 1000).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }) : '-',
          totalPrice: d.costItems ? d.costItems.reduce((sum, i) => sum + (i.price || 0), 0) : (d.price || 0)
        }))
        setHistory(mapped)
      })
      .catch(() => setHistory([]))
      .finally(() => setLoading(false))
  }, [uid])
  
  const years    = ['all', ...new Set(history.map((h) => h.year || (h.createdAt ? new Date(h.createdAt.seconds*1000).getFullYear() : new Date().getFullYear())))].map(String)
  const filtered = filter === 'all' ? history : history.filter((h) => String(h.year || (h.createdAt ? new Date(h.createdAt.seconds*1000).getFullYear() : new Date().getFullYear())) === filter)

  return (
    <div className="page-container pb-24">
      <div className="page-header"><Link href="/profile" className="back-btn">‹</Link><h1 className="page-title">ประวัติการซ่อม</h1></div>
      <div className="flex gap-2 px-4 mb-4 no-scrollbar overflow-x-auto pb-1">
        {years.map((y) => (
          <button key={y} onClick={() => setFilter(y)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold flex-shrink-0 border-none cursor-pointer"
            style={{ background: filter===y ? 'var(--acc)' : 'var(--surf)', color: filter===y ? '#fff' : 'var(--t2)', border:`0.5px solid ${filter===y ? 'var(--acc)' : 'var(--brd2)'}` }}>
            {y === 'all' ? 'ทั้งหมด' : `ปี ${y}`}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="flex justify-center pt-20"><span className="inline-block w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor:'var(--acc)', borderTopColor:'transparent' }} /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center pt-20 px-8 text-center">
          <span className="text-4xl mb-4">📋</span>
          <p className="font-syne text-sm font-bold text-t1 mb-2">ไม่มีประวัติการซ่อม</p>
          <p className="text-xs text-t2">ยังไม่มีรายการซ่อมในช่วงเวลาที่เลือก</p>
        </div>
      ) : filtered.map((h, i) => {
        const isExpanded = expandedId === (h.id || i)
        return (
          <div key={h.id || i} onClick={() => setExpandedId(isExpanded ? null : (h.id || i))} 
               className="mx-4 mb-2 bg-surf rounded-2xl p-3 border-token cursor-pointer transition-all">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-s2 rounded-xl flex items-center justify-center text-base flex-shrink-0">{h.icon || getIcon(h.displayDetail)}</div>
                <div><p className="text-sm font-semibold text-t1">{h.displayTitle}</p><p className="text-xs text-t2 mt-0.5">{h.displayDate}</p></div>
              </div>
              <span className="badge-green">เสร็จแล้ว</span>
            </div>
            <div className="text-xs text-t1 mb-2 px-1 font-medium">{h.displayDetail}</div>
            
            {/* Expansion panel for details */}
            {isExpanded && (
              <div className="mb-2 mt-2 pt-2 border-t border-dashed border-brd2">
                <p className="text-xs font-bold text-t3 mb-1">รายละเอียดและค่าใช้จ่าย</p>
                {h.costItems && h.costItems.length > 0 ? (
                  h.costItems.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-xs py-1">
                      <span className="text-t2">{item.name}</span>
                      <span className="text-t1 font-semibold">฿{(item.price || 0).toLocaleString()}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-t3 py-1">ไม่มีรายการแจกแจง</p>
                )}
              </div>
            )}
            
            <div className="flex justify-between items-center pt-2" style={{ borderTop:'0.5px solid var(--brd)' }}>
              <span className="text-xs text-t2">🔧 {h.mechanic || h.mechanicName || '-'}</span>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold" style={{ color: 'var(--acc)' }}>
                  ฿{(h.totalPrice || 0).toLocaleString()}
                </span>
                <span className="text-[10px] text-t3 ml-1">{isExpanded ? '▲' : '▼'}</span>
              </div>
            </div>
          </div>
        )
      })}
      <BottomNav />
    </div>
  )
}
