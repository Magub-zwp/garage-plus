'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { clearSession } from '@/lib/staff/session'
import { logout } from '@/lib/firebase/auth'
import { db } from '@/lib/firebase/config'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { useAuthContext } from '@/context/AuthContext'
import {
  Bell,
  Menu,
  PanelLeftClose,
  PanelLeft,
  Sun,
  Moon,
  LogOut,
  ShieldCheck,
  Wrench,
} from 'lucide-react'

function NotifBadge({ uid: uidProp }) {
  const ctx = useAuthContext() || {}
  const uid = uidProp || ctx.uid
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!uid) return
    const unsub = onSnapshot(
      query(collection(db, 'notifications'), where('userId', '==', uid), where('unread', '==', true)),
      snap => setCount(snap.size),
      err => console.warn('[notif]', err.message)
    )
    return () => unsub()
  }, [uid])

  return (
    <Link
      href="/staff/notifications"
      className="relative w-9 h-9 bg-s2 hover:bg-s3 rounded-xl flex items-center justify-center text-t2 transition-colors border border-token"
      title="การแจ้งเตือน"
    >
      <Bell size={16} strokeWidth={1.85} />
      {count > 0 && (
        <span
          className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full flex items-center justify-center font-bold text-white shadow-xs"
          style={{ background: 'var(--err)', fontSize: 9, border: '1.5px solid var(--surf)' }}
        >
          {count > 9 ? '9+' : count}
        </span>
      )}
    </Link>
  )
}

export default function Topbar({ user, onToggleMode, isDark, onToggleCollapsed, onToggleMobile, collapsed }) {
  const router = useRouter()

  const handleLogout = async () => {
    clearSession()
    try { await logout() } catch {}
    router.replace('/staff/login')
  }

  const initials = user?.name ? user.name.substring(0, 2) : 'ST'

  return (
    <header className="flex items-center justify-between px-3 lg:px-5 h-14 bg-surf/95 backdrop-blur-md flex-shrink-0 z-20 border-b border-token transition-colors">
      <div className="flex items-center gap-2.5 lg:gap-3">
        {/* Mobile: hamburger toggle */}
        {onToggleMobile && (
          <button
            onClick={onToggleMobile}
            className="lg:hidden w-8 h-8 flex items-center justify-center rounded-xl cursor-pointer border border-token text-t2 bg-s2 hover:bg-s3 transition-colors"
            title="เปิดเมนู"
          >
            <Menu size={18} strokeWidth={1.85} />
          </button>
        )}

        {/* Desktop: collapse sidebar toggle */}
        {onToggleCollapsed && (
          <button
            onClick={onToggleCollapsed}
            className="hidden lg:flex w-8 h-8 items-center justify-center rounded-xl cursor-pointer border border-token text-t3 hover:text-t1 bg-s2 hover:bg-s3 transition-colors"
            title={collapsed ? 'ขยาย Sidebar' : 'ย่อ Sidebar'}
          >
            {collapsed ? (
              <PanelLeft size={16} strokeWidth={1.85} />
            ) : (
              <PanelLeftClose size={16} strokeWidth={1.85} />
            )}
          </button>
        )}

        {/* Brand with Spinning Gear Logo */}
        <div className="flex items-center gap-2.5 select-none">
          <div className="w-8 h-8 rounded-xl bg-adim border border-acc/40 flex items-center justify-center shadow-xs">
            <span className="text-sm inline-block animate-gearspin">⚙️</span>
          </div>
          <div>
            <span className="font-syne text-sm font-extrabold text-t1 tracking-tight">
              Garage<span className="text-acc">Plus</span>
            </span>
            <span className="hidden sm:inline-block text-[9px] uppercase tracking-wider font-bold ml-1.5 px-1.5 py-0.5 rounded bg-s2 text-t3 border border-token">
              Staff
            </span>
          </div>
        </div>

        {/* Role Badge */}
        {user && (
          <div className="hidden sm:flex items-center gap-1.5 ml-1">
            <span
              className="text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs"
              style={{
                background: user.role === 'admin' ? 'var(--adim)' : 'var(--gdim)',
                color:      user.role === 'admin' ? 'var(--acc)'  : 'var(--grn)',
                border:     `0.5px solid ${user.role === 'admin' ? 'var(--abrd)' : 'var(--gbrd)'}`,
              }}
            >
              {user.role === 'admin' ? (
                <>
                  <ShieldCheck size={12} strokeWidth={2} />
                  <span>Admin</span>
                </>
              ) : (
                <>
                  <Wrench size={12} strokeWidth={2} />
                  <span>ช่างซ่อม</span>
                </>
              )}
            </span>
            <span className="text-t3 text-xs hidden md:inline truncate max-w-[120px]">
              {user.name}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Dark / Light Mode Toggle */}
        <button
          onClick={onToggleMode}
          className="w-9 h-9 rounded-xl bg-s2 hover:bg-s3 border border-token flex items-center justify-center text-xs text-t2 transition-colors cursor-pointer"
          title={isDark ? 'สลับเป็นโหมดสว่าง' : 'สลับเป็นโหมดมืด'}
        >
          {isDark ? <Sun size={15} strokeWidth={1.85} /> : <Moon size={15} strokeWidth={1.85} />}
        </button>

        {/* Notification Bell */}
        <NotifBadge uid={user?.uid} />

        {/* Staff User Avatar */}
        <div
          className="w-8 h-8 flex items-center justify-center font-syne font-extrabold text-white rounded-xl text-xs flex-shrink-0 shadow-xs"
          style={{ background: user?.role === 'admin' ? 'var(--acc)' : 'var(--grn)' }}
          title={user?.name || ''}
        >
          {initials}
        </div>

        {/* Logout button */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-xs font-semibold text-t2 hover:text-err px-2.5 py-1.5 rounded-xl cursor-pointer bg-s2 hover:bg-errdim border border-token transition-colors"
          title="ออกจากระบบ"
        >
          <LogOut size={13} strokeWidth={1.85} />
          <span className="hidden sm:inline">ออก</span>
        </button>
      </div>
    </header>
  )
}
