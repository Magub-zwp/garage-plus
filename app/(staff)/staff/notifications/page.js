'use client'
import { useState, useEffect } from 'react'
import DashboardShell from '@/components/staff/DashboardShell'
import { db } from '@/lib/firebase/config'
import { collection, query, where, orderBy, limit, onSnapshot, updateDoc, doc } from 'firebase/firestore'
import { useAuthContext } from '@/context/AuthContext'

export default function StaffNotificationsPage() {
  const { uid }                   = useAuthContext()
  const [notifs,  setNotifs]      = useState([])
  const [loading, setLoading]     = useState(true)
  const [filter,  setFilter]      = useState('all')

  useEffect(() => {
    if (!uid) return
    // Staff เห็นการแจ้งเตือนของตัวเอง
    // สำหรับ admin: ดูได้ทั้งหมด (ผ่าน Firestore rules)
    const unsub = onSnapshot(
      query(collection(db,'notifications'), orderBy('createdAt','desc'), limit(100)),
      snap => { setNotifs(snap.docs.map(d => ({id:d.id,...d.data()}))); setLoading(false) },
      () => {
        // Fallback: ถ้า rules ไม่อนุญาต query ทั้งหมด ให้ query เฉพาะของตัวเอง
        onSnapshot(
          query(collection(db,'notifications'), where('userId','==',uid), orderBy('createdAt','desc'), limit(50)),
          snap => { setNotifs(snap.docs.map(d => ({id:d.id,...d.data()}))); setLoading(false) }
        )
      }
    )
    return () => unsub()
  }, [uid])
// Filter notifications based on selected filter (all or unread)
  const shown       = filter === 'unread' ? notifs.filter(n => n.unread) : notifs
  const unreadCount = notifs.filter(n => n.unread).length
// Function to mark a single notification as read when clicked
  const markRead = async (id, unread) => {
    if (!unread) return
    await updateDoc(doc(db,'notifications',id), { unread:false })
    setNotifs(prev => prev.map(n => n.id===id ? {...n,unread:false} : n))
  }
// Function to mark all notifications as read
  const markAllRead = async () => {
    const unread = notifs.filter(n => n.unread)
    await Promise.all(unread.map(n => updateDoc(doc(db,'notifications',n.id), {unread:false})))
    setNotifs(prev => prev.map(n => ({...n,unread:false})))
  }

  return (
    <DashboardShell>
      <div className="flex justify-between items-center mb-5">
        <div>
          <h1 className="font-syne text-xl font-bold text-t1">การแจ้งเตือน</h1>
          {unreadCount > 0 && <p className="text-xs text-acc mt-0.5">{unreadCount} รายการยังไม่ได้อ่าน</p>}
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead}
            className="text-xs text-acc font-semibold cursor-pointer border-none bg-transparent">
            อ่านทั้งหมด
          </button>
        )}
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {[{k:'all',l:`ทั้งหมด (${notifs.length})`},{k:'unread',l:`ยังไม่อ่าน (${unreadCount})`}].map(f => (
          <button key={f.k} onClick={() => setFilter(f.k)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold border-none cursor-pointer"
            style={{ background:filter===f.k?'var(--acc)':'var(--surf)', color:filter===f.k?'#fff':'var(--t2)', border:`0.5px solid ${filter===f.k?'var(--acc)':'var(--brd2)'}` }}>
            {f.l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center pt-16">
          <span className="inline-block w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor:'var(--acc)', borderTopColor:'transparent' }}/>
        </div>
      ) : shown.length === 0 ? (
        <div className="card p-10 text-center">
          <span className="text-4xl mb-3 block">🔔</span>
          <p className="font-syne text-sm font-bold text-t1 mb-1">ไม่มีการแจ้งเตือน</p>
          <p className="text-xs text-t2">การแจ้งเตือนใหม่จะปรากฏที่นี่</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {shown.map(n => {
            const ts = n.createdAt?.toDate ? n.createdAt.toDate() : null
            return (
              <div key={n.id}
                onClick={() => markRead(n.id, n.unread)}
                className="card p-4 flex gap-3 items-start cursor-pointer active:opacity-80"
                style={{ borderLeft: n.unread ? '3px solid var(--acc)' : '3px solid transparent' }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0"
                  style={{ background: n.bg || 'var(--s2)' }}>
                  {n.icon || '🔔'}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start gap-2">
                    <p className="text-sm font-semibold text-t1">{n.title}</p>
                    {n.unread && <span className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ background:'var(--acc)' }} />}
                  </div>
                  <p className="text-xs text-t2 mt-0.5 leading-relaxed">{n.body}</p>
                  {ts && <p className="text-xs text-t3 mt-1">{ts.toLocaleString('th-TH',{hour:'2-digit',minute:'2-digit',day:'2-digit',month:'short'})}</p>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </DashboardShell>
  )
}
