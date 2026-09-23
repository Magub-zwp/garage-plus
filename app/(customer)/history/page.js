'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { getRepairHistory } from '@/lib/firebase/firestore'
import BottomNav from '@/components/customer/BottomNav'
import AppIcon from '@/components/common/AppIcon'

const SERVICE_ICON_MAP = {
  น้ำมัน: 'oil',
  เบรก: 'brake',
  ยาง: 'tire',
  แบต: 'battery',
  ตรวจ: 'engine',
  เครื่อง: 'engine',
  โช้ค: 'shock',
  ช่วงล่าง: 'shock',
  เกียร์: 'gear',
}

function getServiceIconName(text) {
  if (!text) return 'status'
  for (const [keyword, iconName] of Object.entries(SERVICE_ICON_MAP)) {
    if (text.includes(keyword)) return iconName
  }
  return 'status'
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
          displayTitle: d.carName || d.plate || 'งานซ่อมบำรุง',
          displayDetail: d.jobDetail || 'ตรวจเช็คและซ่อมบำรุงทั่วไป',
          displayDate: d.createdAt ? new Date(d.createdAt.seconds * 1000).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }) : '-',
          totalPrice: d.costItems ? d.costItems.reduce((sum, i) => sum + (i.price || 0), 0) : (d.price || 0)
        }))
        setHistory(mapped)
      })
      .catch(() => setHistory([]))
      .finally(() => setLoading(false))
  }, [uid])

  const years = ['all', ...new Set(history.map((h) => h.year || (h.createdAt ? new Date(h.createdAt.seconds*1000).getFullYear() : new Date().getFullYear())))].map(String)
  const filtered = filter === 'all' ? history : history.filter((h) => String(h.year || (h.createdAt ? new Date(h.createdAt.seconds*1000).getFullYear() : new Date().getFullYear())) === filter)

  return (
    <div className="page-container pb-24 md:pb-12 pt-2 md:pt-4 px-4 md:px-0">
      
      {/* Header */}
      <div className="page-header px-0 mb-3 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Link href="/profile" className="back-btn">‹</Link>
          <h1 className="page-title text-base md:text-xl font-bold">ประวัติการซ่อมและบริการ</h1>
        </div>
        <span className="text-xs text-t3 font-medium">ทั้งหมด {filtered.length} รายการ</span>
      </div>

      {/* Year Filter Pills */}
      <div className="flex gap-2 mb-4 no-scrollbar overflow-x-auto pb-1">
        {years.map((y) => (
          <button
            key={y}
            onClick={() => setFilter(y)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex-shrink-0 cursor-pointer transition-all border ${
              filter === y
                ? 'bg-acc text-white border-acc shadow-xs'
                : 'bg-surf hover:bg-s2 text-t2 border-token'
            }`}
          >
            {y === 'all' ? 'ทั้งหมดทุกปี' : `ปี ${parseInt(y, 10) > 2400 ? y : parseInt(y, 10) + 543}`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center pt-20">
          <span
            className="inline-block w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: 'var(--acc)', borderTopColor: 'transparent' }}
          />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center pt-16 px-8 text-center bg-surf/50 rounded-3xl border border-dashed border-token p-10 max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-3xl bg-s2 flex items-center justify-center mb-4">
            <AppIcon name="history" size={36} />
          </div>
          <p className="font-syne text-base font-bold text-t1 mb-2">ไม่มีประวัติการซ่อม</p>
          <p className="text-xs text-t2">ไม่พบรายการซ่อมบำรุงในช่วงเวลาที่เลือก</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filtered.map((h, i) => {
            const isExpanded = expandedId === (h.id || i)
            const iconName = getServiceIconName(h.displayDetail || h.jobDetail)

            return (
              <div
                key={h.id || i}
                onClick={() => setExpandedId(isExpanded ? null : (h.id || i))}
                className="bg-surf hover:bg-s2/60 rounded-3xl p-4 border border-token cursor-pointer transition-all shadow-xs hover:border-acc flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-2.5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-s2 rounded-2xl flex items-center justify-center flex-shrink-0 border border-token">
                        <AppIcon name={iconName} size={22} />
                      </div>
                      <div>
                        <p className="font-syne text-sm font-bold text-t1">{h.displayTitle}</p>
                        <p className="text-[11px] text-t3 mt-0.5">{h.displayDate}</p>
                      </div>
                    </div>
                    <span className="badge-green text-[10px] px-2 py-0.5">เสร็จสิ้น</span>
                  </div>

                  <p className="text-xs text-t1 mb-2.5 font-medium leading-relaxed">
                    {h.displayDetail}
                  </p>

                  {/* Expansion panel for details */}
                  {isExpanded && (
                    <div className="mb-3 pt-2.5 border-t border-dashed border-token">
                      <p className="text-[11px] font-bold text-t3 uppercase tracking-wider mb-1.5">
                        รายการค่าใช้จ่ายและอะไหล่
                      </p>
                      {h.costItems && h.costItems.length > 0 ? (
                        h.costItems.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-xs py-1">
                            <span className="text-t2">{item.name}</span>
                            <span className="text-t1 font-semibold">฿{(item.price || 0).toLocaleString()}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-t3 py-1">ไม่มีรายการแจกแจงแยกชิ้น</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center pt-2.5 border-t border-token">
                  <span className="text-xs text-t3 flex items-center gap-1">
                    ช่าง: <span className="text-t2 font-medium">{h.mechanic || h.mechanicName || '-'}</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-extrabold text-acc">
                      ฿{(h.totalPrice || 0).toLocaleString()}
                    </span>
                    <span className="text-[10px] text-t3 ml-1 bg-s2 px-1.5 py-0.5 rounded-md">
                      {isExpanded ? '▲ ซ่อน' : '▼ ดูเพิ่ม'}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <BottomNav />
    </div>
  )
}
