'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useBookings } from '@/hooks/useBookings'
import AppIcon from '@/components/common/AppIcon'

const ITEMS = [
  { href: '/home',        iconName: 'home',     label: 'หน้าหลัก' },
  { href: '/book',        iconName: 'book',     label: 'จองคิว'   },
  { href: '/my-bookings', iconName: 'bookings', label: 'คิวของฉัน' },
  { href: '/status',      iconName: 'status',   label: 'สถานะ'    },
  { href: '/profile',     iconName: 'profile',  label: 'ฉัน'      },
]

const ROUTE_MAP = {
  '/profile/edit': '/profile',
  '/profile/add-car': '/profile',
  '/settings': '/profile',
  '/settings/change-password': '/profile',
  '/notifications': '/home',
  '/book/success': '/book',
  '/history': '/profile',
  '/articles': '/home',
  '/privacy-policy': '/home',
}

export default function BottomNav() {
  const pathname = usePathname()
  const active   = ROUTE_MAP[pathname] || pathname
  let upcomingCount = 0
  try {
    const { upcoming } = useBookings()
    upcomingCount = upcoming?.length || 0
  } catch {}

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden pointer-events-none">
      <div className="max-w-lg mx-auto px-3 pb-2 pt-1 pointer-events-auto">
        <div
          className="flex items-center justify-around bg-surf/95 backdrop-blur-md rounded-3xl border border-token shadow-lg px-2 py-1.5"
          style={{
            boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
            paddingBottom: 'calc(6px + env(safe-area-inset-bottom, 0px))',
          }}
        >
          {ITEMS.map((item) => {
            const isOn =
              active === item.href ||
              (item.href === '/my-bookings' && pathname.startsWith('/my-bookings'))
            const badge = item.href === '/my-bookings' && upcomingCount > 0

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all duration-200 ${
                  isOn ? 'text-acc font-bold scale-105' : 'text-t2 font-medium opacity-75 hover:opacity-100'
                }`}
              >
                {/* Active background indicator */}
                {isOn && (
                  <span
                    className="absolute inset-0 rounded-2xl -z-10"
                    style={{ background: 'var(--adim)' }}
                  />
                )}

                <div className="relative inline-flex items-center justify-center">
                  <AppIcon
                    name={item.iconName}
                    size={22}
                    className={`transition-transform duration-200 ${isOn ? 'scale-110 drop-shadow' : 'opacity-80'}`}
                  />
                  {badge && (
                    <span
                      className="absolute -top-1.5 -right-2.5 min-w-4 h-4 px-1 rounded-full flex items-center justify-center font-bold text-white shadow-sm"
                      style={{
                        background: 'var(--err)',
                        fontSize: 9,
                        border: '1.5px solid var(--surf)',
                      }}
                    >
                      {upcomingCount > 9 ? '9+' : upcomingCount}
                    </span>
                  )}
                </div>

                <span
                  className="mt-1 text-center select-none"
                  style={{ fontSize: 10, letterSpacing: '0.01em' }}
                >
                  {item.label}
                </span>

                {/* Little dot under active item */}
                {isOn && (
                  <span
                    className="w-1 h-1 rounded-full mt-0.5"
                    style={{ background: 'var(--acc)' }}
                  />
                )}
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
