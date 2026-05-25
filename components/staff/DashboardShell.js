'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSession } from '@/lib/staff/session'
import Topbar  from '@/components/staff/Topbar'
import Sidebar from '@/components/staff/Sidebar'

//sidebar 
export default function DashboardShell({ children, requiredRole }) {
  const router = useRouter()
  const [user,        setUser]        = useState(null)
  const [isDark,      setIsDark]      = useState(true)
  const [ready,       setReady]       = useState(false)
  const [collapsed,   setCollapsed]   = useState(false)   // desktop: sidebar พับ
  const [mobileOpen,  setMobileOpen]  = useState(false)   // mobile: drawer เปิด

  useEffect(() => {
    const session = getSession()
    if (!session) { router.replace('/staff/login'); return }
    if (requiredRole && session.role !== requiredRole) {
      router.replace(session.role === 'admin' ? '/staff/dashboard' : '/staff/mech/queue')
      return
    }
    setUser(session)
    const dark = localStorage.getItem('gp_staff_dark') !== '0'
    setIsDark(dark)
    document.documentElement.classList.toggle('dark', dark)
    // โหลด collapsed preference จาก localStorage
    const savedCollapsed = localStorage.getItem('gp_sidebar_collapsed') === '1'
    setCollapsed(savedCollapsed)
    setReady(true)
  }, [])

  const toggleMode = () => {
    const next = !isDark
    setIsDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('gp_staff_dark', next ? '1' : '0')
  }

  const toggleCollapsed = () => {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('gp_sidebar_collapsed', next ? '1' : '0')
  }

  if (!ready) return (
    <div className="flex items-center justify-center min-h-screen bg-tok">
      <span className="inline-block w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
        style={{ borderColor:'var(--acc)', borderTopColor:'transparent' }}/>
    </div>
  )

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-tok">
      {/* Topbar — ส่ง onToggleCollapsed สำหรับ desktop, onToggleMobile สำหรับ mobile */}
      <Topbar
        user={user}
        onToggleMode={toggleMode}
        isDark={isDark}
        onToggleCollapsed={toggleCollapsed}
        onToggleMobile={() => setMobileOpen(o => !o)}
      />

      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile overlay */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-20 lg:hidden"
            style={{ background:'rgba(0,0,0,0.45)' }}
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Sidebar — mobile: fixed drawer, desktop: inline */}
        <div
          className="lg:relative fixed z-30 h-full"
          style={{
            transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform .2s ease',
          }}
        >
          {/* Desktop: ปกติ inline ไม่ต้อง transform */}
          <div className="hidden lg:block h-full">
            <Sidebar role={user.role} collapsed={collapsed} />
          </div>
          {/* Mobile: drawer */}
          <div className="lg:hidden h-full">
            <Sidebar role={user.role} collapsed={false} onClose={() => setMobileOpen(false)} />
          </div>
        </div>

        {/* Desktop sidebar (inline, visible เสมอ) */}
        <div className="hidden lg:block h-full flex-shrink-0" style={{ width: collapsed ? 52 : 176, transition:'width .2s ease' }}>
          <Sidebar role={user.role} collapsed={collapsed} />
        </div>

        <main className="flex-1 overflow-y-auto p-4 lg:p-5 bg-tok">{children}</main>
      </div>
    </div>
  )
}
