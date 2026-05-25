'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { listenNotifications, markNotificationRead } from '@/lib/firebase/firestore'
import BottomNav from '@/components/customer/BottomNav'

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
    <div className="page-container pb-24">
      <div className="page-header">
        <Link href="/home" className="back-btn">‹</Link>
        <h1 className="page-title">การแจ้งเตือน</h1>
        {unreadCount > 0 && (
          <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background:'var(--err)' }}>{unreadCount} ใหม่</span>
        )}
      </div>
      <div className="flex gap-2 px-4 mb-4">
        {['all','unread'].map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold border-none cursor-pointer"
            style={{ background:filter===f ? 'var(--acc)' : 'var(--surf)', color:filter===f ? '#fff' : 'var(--t2)', border:`0.5px solid ${filter===f ? 'var(--acc)' : 'var(--brd2)'}` }}>
            {f === 'all' ? 'ทั้งหมด' : 'ยังไม่อ่าน'}
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <div className="flex flex-col items-center pt-20 text-center px-8">
          <span className="text-4xl mb-4">🔔</span>
          <p className="font-syne text-sm font-bold text-t1 mb-2">ไม่มีการแจ้งเตือน</p>
          <p className="text-xs text-t2">การแจ้งเตือนใหม่จะปรากฏที่นี่</p>
        </div>
      ) : shown.map((n) => (
        <Link key={n.id} href={n.href || '#'} onClick={() => handleRead(n.id, n.unread)}>
          <div className="mx-4 mb-2 rounded-2xl p-3 flex gap-3 items-start cursor-pointer"
            style={{ background:n.unread ? 'var(--adim)' : 'var(--surf)', border:`0.5px solid ${n.unread ? 'var(--abrd)' : 'var(--brd)'}` }}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-base flex-shrink-0" style={{ background:n.bg || 'var(--s2)' }}>{n.icon}</div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-t1">{n.title}</p>
              <p className="text-xs text-t2 mt-0.5 leading-relaxed">{n.body}</p>
              <p className="text-xs text-t3 mt-1">{n.time}</p>
            </div>
            {n.unread && <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ background:'var(--acc)' }} />}
          </div>
        </Link>
      ))}
      <BottomNav />
    </div>
  )
}
