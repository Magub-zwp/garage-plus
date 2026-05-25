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

  useEffect(() => {
    if (!uid) return
    getRepairHistory(uid)
      .then((h) => setHistory(h))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false))
  }, [uid])
  
  const years    = ['all', ...new Set(history.map((h) => h.year || new Date(h.createdAt?.seconds*1000).getFullYear()))].map(String)
  const filtered = filter === 'all' ? history : history.filter((h) => String(h.year || new Date(h.createdAt?.seconds*1000).getFullYear()) === filter)

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
      ) : filtered.map((h, i) => (
        <div key={h.id || i} className="mx-4 mb-2 bg-surf rounded-2xl p-3 border-token cursor-pointer">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-s2 rounded-xl flex items-center justify-center text-base flex-shrink-0">{h.icon || getIcon(h.name)}</div>
              <div><p className="text-sm font-semibold text-t1">{h.name}</p><p className="text-xs text-t2 mt-0.5">{h.date}</p></div>
            </div>
            <span className="badge-green">เสร็จแล้ว</span>
          </div>
          <div className="flex justify-between items-center pt-2" style={{ borderTop:'0.5px solid var(--brd)' }}>
            <span className="text-xs text-t2">🔧 {h.mechanic || h.mechanicName || '-'}</span>
            <div className="flex items-center gap-1.5">
              {h.free && (<span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background:'var(--gdim)', color:'var(--grn)', border:'0.5px solid var(--gbrd)' }}>🎁 {h.promoRef}</span>)}
              <span className="text-sm font-bold" style={{ color: h.free ? 'var(--grn)' : 'var(--acc)' }}>
                {h.free ? 'ฟรี' : `฿${(h.price || 0).toLocaleString()}`}
              </span>
            </div>
          </div>
        </div>
      ))}
      <BottomNav />
    </div>
  )
}
