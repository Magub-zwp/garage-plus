'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useUser } from '@/hooks/useUser'
import { useBookings } from '@/hooks/useBookings'
import AppIcon from '@/components/common/AppIcon'
import { db } from '@/lib/firebase/config'
import { collection, query, where, onSnapshot } from 'firebase/firestore'

const NAV_LINKS = [
  { href: '/home',        icon: 'home',        label: 'หน้าหลัก' },
  { href: '/book',        icon: 'book',        label: 'จองคิว' },
  { href: '/my-bookings', icon: 'bookings',    label: 'คิวของฉัน', hasBadge: true },
  { href: '/status',      icon: 'status',      label: 'สถานะงานซ่อม' },
  { href: '/promotions',  icon: 'promo',       label: 'โปรโมชั่น' },
  { href: '/articles',    icon: 'history',     label: 'บทความ' },
]

export default function CustomerHeader() {
  const pathname = usePathname()
  const { uid, isLoggedIn } = useAuth()
  const { user, cars, mainCar } = useUser()
  const [unread, setUnread] = useState(0)
  const [isDark, setIsDark] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Listen to unread notifications
  useEffect(() => {
    if (!uid) return
    const unsub = onSnapshot(
      query(collection(db, 'notifications'), where('userId', '==', uid), where('unread', '==', true)),
      (snap) => setUnread(snap.size),
      () => {}
    )
    return () => unsub()
  }, [uid])

  // Sync dark mode state
  useEffect(() => {
    setMounted(true)
    const dark = localStorage.getItem('gp_dark') === '1'
    setIsDark(dark)
  }, [])

  const toggleDarkMode = () => {
    const next = !isDark
    setIsDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('gp_dark', next ? '1' : '0')
  }

  let upcomingCount = 0
  try {
    const { upcoming } = useBookings()
    upcomingCount = upcoming?.length || 0
  } catch {}

  // Do not render top navigation on auth pages
  const isAuthPage = ['/login', '/signup', '/forgot-password'].includes(pathname)
  if (isAuthPage) return null

  return (
    <header className="hidden md:block sticky top-0 z-40 w-full bg-surf/90 backdrop-blur-md border-b border-token transition-colors">
      <div className="max-w-6xl xl:max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        
        {/* Left: Brand Identity */}
        <Link href="/home" className="flex items-center gap-3 group select-none flex-shrink-0">
          <div className="w-10 h-10 rounded-2xl bg-adim border border-acc/40 flex items-center justify-center shadow-sm group-hover:border-acc transition-colors">
            <span className="text-xl inline-block animate-gearspin">⚙️</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-syne text-lg font-extrabold text-t1 tracking-tight">
                Garage<span className="text-acc">Plus</span>
              </span>
              <span className="hidden sm:inline-block text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-md bg-adim text-acc border border-acc">
                Pro
              </span>
            </div>
            <p className="text-[11px] text-t3 tracking-wider uppercase font-medium">179 Auto · Doi Saket</p>
          </div>
        </Link>

        {/* Center: Desktop Navigation Links (hidden on mobile, visible on md+) */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-2">
          {NAV_LINKS.map((link) => {
            const isActive =
              pathname === link.href ||
              (link.href !== '/home' && pathname.startsWith(link.href))
            const showBadge = link.hasBadge && upcomingCount > 0

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                  isActive
                    ? 'bg-adim text-acc font-bold shadow-sm'
                    : 'text-t2 hover:text-t1 hover:bg-s2'
                }`}
              >
                <AppIcon name={link.icon} size={17} className={isActive ? 'opacity-100' : 'opacity-70'} />
                <span>{link.label}</span>
                {showBadge && (
                  <span
                    className="ml-0.5 min-w-4 h-4 px-1 rounded-full flex items-center justify-center font-bold text-white text-[9px]"
                    style={{ background: 'var(--err)' }}
                  >
                    {upcomingCount > 9 ? '9+' : upcomingCount}
                  </span>
                )}
                {isActive && (
                  <span
                    className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full"
                    style={{ background: 'var(--acc)' }}
                  />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Right: User actions & utilities */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {/* Quick Active Car info (Desktop) */}
          {cars && cars.length > 0 && (
            <Link
              href="/profile"
              className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-s2 hover:bg-s3 border border-token text-xs transition-colors"
              title="รถที่คุณใช้งาน"
            >
              <AppIcon name="car" size={16} />
              <span className="font-semibold text-t1 max-w-[110px] truncate">
                {mainCar?.plate || cars[0]?.plate}
              </span>
              <span className="text-[10px] text-t3">({cars.length} คัน)</span>
            </Link>
          )}

          {/* Dark / Light toggle */}
          {mounted && (
            <button
              onClick={toggleDarkMode}
              className="w-9 h-9 rounded-xl bg-s2 hover:bg-s3 border border-token flex items-center justify-center text-xs transition-colors cursor-pointer text-t2"
              title={isDark ? 'เปลี่ยนเป็นโหมดสว่าง' : 'เปลี่ยนเป็นโหมดมืด'}
            >
              {isDark ? '☀️' : '🌙'}
            </button>
          )}

          {/* Notifications Button with Badge */}
          <Link
            href="/notifications"
            className="relative w-9 h-9 rounded-xl bg-s2 hover:bg-s3 border border-token flex items-center justify-center transition-colors"
            title="การแจ้งเตือน"
          >
            <AppIcon name="bell" size={18} />
            {unread > 0 && (
              <span
                className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full flex items-center justify-center font-bold text-white shadow-sm"
                style={{
                  background: 'var(--err)',
                  fontSize: 9,
                  border: '1.5px solid var(--surf)',
                }}
              >
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </Link>

          {/* Profile / Avatar */}
          {isLoggedIn ? (
            <Link
              href="/profile"
              className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1 rounded-xl bg-s2 hover:bg-s3 border border-token transition-colors"
            >
              <div className="w-7 h-7 rounded-lg bg-adim flex items-center justify-center overflow-hidden border border-acc">
                <AppIcon name="profile" size={18} />
              </div>
              <span className="hidden sm:inline text-xs font-semibold text-t1 max-w-[90px] truncate">
                {user?.name?.split(' ')[0] || 'ฉัน'}
              </span>
            </Link>
          ) : (
            <Link
              href="/login"
              className="px-3 py-1.5 rounded-xl bg-acc text-white text-xs font-bold hover:opacity-90 transition-opacity"
            >
              เข้าสู่ระบบ
            </Link>
          )}
        </div>

      </div>
    </header>
  )
}
