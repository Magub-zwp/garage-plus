'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { clearSession } from '@/lib/staff/session'
import { logout } from '@/lib/firebase/auth'
import { db } from '@/lib/firebase/config'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { useAuthContext } from '@/context/AuthContext'

function NotifBadge() {
  const { uid } = useAuthContext()
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!uid) return
    const unsub = onSnapshot(
      query(collection(db,'notifications'), where('userId','==',uid), where('unread','==',true)),
      snap => setCount(snap.size)
    )
    return () => unsub()
  }, [uid])
  return (
    <Link href="/staff/notifications"
      className="relative w-8 h-8 bg-s2 rounded-full flex items-center justify-center text-sm"
      style={{ border:'0.5px solid var(--brd)' }}>
      🔔
      {count > 0 && (
        <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full flex items-center justify-center font-bold text-white"
          style={{ background:'var(--err)', fontSize:9, border:'1.5px solid var(--surf)' }}>
          {count > 9 ? '9+' : count}
        </span>
      )}
    </Link>
  )
}

// onToggleCollapsed (desktop) และ onToggleMobile (mobile hamburger)
export default function Topbar({ user, onToggleMode, isDark, onToggleCollapsed, onToggleMobile }) {
  const router = useRouter()
  const handleLogout = async () => {
    clearSession()
    try { await logout() } catch {}
    router.replace('/staff/login')
  }
  const initials = user?.name ? user.name.substring(0,2) : '??'

  return (
    <header className="flex items-center justify-between px-3 lg:px-5 h-12 bg-surf flex-shrink-0"
      style={{ borderBottom:'0.5px solid var(--brd2)' }}>
      <div className="flex items-center gap-2 lg:gap-3">
        {/* Mobile: hamburger toggle */}
        {onToggleMobile && (
          <button onClick={onToggleMobile}
            className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer border-none text-t2"
            style={{ background:'var(--s2)', fontSize:18 }}>
            ☰
          </button>
        )}
        {/* Desktop: collapse sidebar toggle */}
        {onToggleCollapsed && (
          <button onClick={onToggleCollapsed}
            className="hidden lg:flex w-7 h-7 items-center justify-center rounded-lg cursor-pointer border-none text-t3"
            style={{ background:'var(--s2)', fontSize:12 }}
            title="พับ/ขยาย sidebar">
            ⇔
          </button>
        )}
        <span className="font-syne text-sm font-extrabold text-t1">
          Garage<em style={{ color:'var(--acc)',fontStyle:'normal' }}>Plus</em>
        </span>
        <span style={{ color:'var(--brd2)',fontSize:12 }} className="hidden sm:block">|</span>
        {user && (
          <span className="hidden sm:inline-block text-xs font-bold px-3 py-1 rounded-full"
            style={{
              background: user.role==='admin' ? 'var(--adim)' : 'var(--gdim)',
              color:      user.role==='admin' ? 'var(--acc)'  : 'var(--grn)',
              border:     `0.5px solid ${user.role==='admin' ? 'var(--abrd)' : 'var(--gbrd)'}`,
            }}>
            {user.role==='admin' ? '👑 Admin' : '🔧 ช่างซ่อม'}
          </span>
        )}
        {user && <span className="text-t3 text-xs hidden md:block">{user.name}</span>}
      </div>

      <div className="flex items-center gap-1.5 lg:gap-2">
        <button onClick={onToggleMode}
          className="text-xs font-semibold text-t2 px-2.5 py-1.5 rounded-full cursor-pointer"
          style={{ background:'var(--s2)', border:'0.5px solid var(--brd2)' }}>
          {isDark ? '☀️' : '🌙'}
        </button>
        <NotifBadge />
        <div className="w-8 h-8 flex items-center justify-center font-syne font-extrabold text-white rounded-full text-xs flex-shrink-0"
          style={{ background:'var(--acc)' }}>
          {initials}
        </div>
        <button onClick={handleLogout}
          className="hidden sm:block text-xs font-semibold text-t2 px-3 py-1.5 rounded-full cursor-pointer"
          style={{ background:'var(--s2)', border:'0.5px solid var(--brd2)' }}>
          ออก
        </button>
      </div>
    </header>
  )
}
