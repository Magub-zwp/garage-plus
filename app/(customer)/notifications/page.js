'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { listenNotifications, markNotificationRead } from '@/lib/firebase/firestore'
import BottomNav from '@/components/customer/BottomNav'
import AppIcon from '@/components/common/AppIcon'

export default function NotificationsPage() {
  const { uid } = useAuth()
  const [notifs,  setNotifs]  = useState([])
  const [filter,  setFilter]  = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) return
    const unsub = listenNotifications(uid, (n) => {
      setNotifs(n)
      setLoading(false)
    })
    return () => unsub()
  }, [uid])

  const shown = filter === 'unread' ? notifs.filter((n) => n.unread) : notifs
  const unreadCount = notifs.filter((n) => n.unread).length

  const handleRead = async (id, unread) => {
    if (!unread) return
    try { await markNotificationRead(id) } catch {}
    setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, unread: false } : n))
  }
  
  return (
    <div className="page-container pb-24 md:pb-12 pt-2 md:pt-4 px-4 md:px-0">
      <div className="page-header px-0 mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/home" className="back-btn">‹</Link>
          <h1 className="page-title text-base md:text-xl font-bold">การแจ้งเตือน</h1>
        </div>
        {unreadCount > 0 && (
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full text-white shadow-xs" style={{ background:'var(--err)' }}>
            {unreadCount} ข้อความใหม่
          </span>
        )}
      </div>

      <div className="flex gap-2 mb-4">
        {['all','unread'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all border ${
              filter === f
                ? 'bg-acc text-white border-acc shadow-xs'
                : 'bg-surf hover:bg-s2 text-t2 border-token'
            }`}
          >
            {f === 'all' ? 'ทั้งหมด' : 'ยังไม่อ่าน'}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="flex flex-col items-center justify-center pt-16 px-8 text-center bg-surf/50 rounded-3xl border border-dashed border-token p-10 max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-3xl bg-s2 flex items-center justify-center mb-4">
            <AppIcon name="bell" size={36} />
          </div>
          <p className="font-syne text-base font-bold text-t1 mb-2">ไม่มีการแจ้งเตือน</p>
          <p className="text-xs text-t2">การแจ้งเตือนเกี่ยวกับคิวและงานซ่อมจะปรากฏที่นี่</p>
        </div>
      ) : (
        <div className="max-w-3xl space-y-2.5">
          {shown.map((n) => (
            <Link key={n.id} href={n.href || '#'} onClick={() => handleRead(n.id, n.unread)} className="block">
              <div
                className={`rounded-2xl p-4 flex gap-3.5 items-start cursor-pointer transition-all border ${
                  n.unread
                    ? 'bg-adim border-acc shadow-xs'
                    : 'bg-surf hover:bg-s2/60 border-token'
                }`}
              >
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center text-base flex-shrink-0 shadow-xs"
                  style={{ background: n.bg || 'var(--s2)' }}
                >
                  <AppIcon name="bell" size={20} fallback={<span>🔔</span>} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <p className={`text-xs md:text-sm font-bold truncate ${n.unread ? 'text-acc' : 'text-t1'}`}>
                      {n.title}
                    </p>
                    {n.time && <span className="text-[10px] text-t3 flex-shrink-0">{n.time}</span>}
                  </div>
                  <p className="text-xs text-t2 mt-1 leading-relaxed">{n.body || n.message}</p>
                </div>
                {n.unread && (
                  <span className="w-2 h-2 rounded-full bg-acc flex-shrink-0 mt-1.5" />
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      <BottomNav />
    </div>
  )
}
