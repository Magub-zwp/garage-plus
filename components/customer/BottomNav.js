'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useBookings } from '@/hooks/useBookings'

const ITEMS = [
  { href:'/home',        icon:'🏠', label:'หน้าหลัก' },
  { href:'/book',        icon:'📅', label:'จองคิว'   },
  { href:'/my-bookings', icon:'📋', label:'คิวของฉัน' },
  { href:'/status',      icon:'🔧', label:'สถานะ'    },
  { href:'/profile',     icon:'👤', label:'ฉัน'      },
]
const ROUTE_MAP = {
  '/profile/edit':'/profile','/profile/add-car':'/profile',
  '/settings':'/profile','/settings/change-password':'/profile',
  '/notifications':'/home','/book/success':'/book',
  '/history':'/profile','/articles':'/home','/privacy-policy':'/home',
}

export default function BottomNav() {
  const pathname = usePathname()
  const active   = ROUTE_MAP[pathname] || pathname
  let upcomingCount = 0
  try { const { upcoming } = useBookings(); upcomingCount = upcoming.length } catch {}

  return (
    <nav className="bottom-nav">
      {ITEMS.map(item => {
        const isOn = active === item.href || (item.href==='/my-bookings' && pathname.startsWith('/my-bookings'))
        const badge = item.href==='/my-bookings' && upcomingCount > 0
        return (
          <Link key={item.href} href={item.href} className={`nav-item ${isOn?'active':''}`}>
            <div className="relative inline-flex">
              <span className="nav-icon">{item.icon}</span>
              {badge && (
                <span className="absolute -top-1 -right-2 w-4 h-4 rounded-full flex items-center justify-center font-bold text-white"
                  style={{ background:'var(--err)', fontSize:9, border:'1.5px solid var(--bg)' }}>
                  {upcomingCount>9?'9+':upcomingCount}
                </span>
              )}
            </div>
            <span className="nav-label">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
