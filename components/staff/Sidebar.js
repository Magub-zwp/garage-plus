'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { db } from '@/lib/firebase/config'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { useAuthContext } from '@/context/AuthContext'
import {
  LayoutDashboard,
  CalendarClock,
  Wrench,
  UserCheck,
  Users,
  TrendingUp,
  UserCog,
  Tag,
  Newspaper,
  Bell,
  Settings,
  ClipboardList,
  History,
} from 'lucide-react'

function useUnreadCount(uidProp) {
  const ctx = useAuthContext() || {}
  const uid = uidProp || ctx.uid
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!uid) return
    const unsub = onSnapshot(
      query(collection(db, 'notifications'), where('userId', '==', uid), where('unread', '==', true)),
      snap => setCount(snap.size),
      err => console.warn('[unread]', err.message)
    )
    return () => unsub()
  }, [uid])
  return count
}

const ADMIN_NAV = [
  { id: 'staff/dashboard',     Icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'staff/queue',         Icon: CalendarClock,   label: 'จัดการคิว' },
  { id: 'staff/repairs',       Icon: Wrench,          label: 'งานซ่อม' },
  { divider: true },
  { id: 'staff/assign',        Icon: UserCheck,       label: 'มอบหมายงาน' },
  { id: 'staff/customers',     Icon: Users,           label: 'ข้อมูลลูกค้า' },
  { id: 'staff/reports',       Icon: TrendingUp,      label: 'รายงาน' },
  { divider: true },
  { id: 'staff/employees',     Icon: UserCog,         label: 'พนักงาน' },
  { id: 'staff/promotions',    Icon: Tag,             label: 'โปรโมชั่น' },
  { id: 'staff/articles',      Icon: Newspaper,       label: 'บทความ' },
  { divider: true },
  { id: 'staff/notifications', Icon: Bell,            label: 'แจ้งเตือน', dynamic: true },
  { id: 'staff/settings',      Icon: Settings,        label: 'ตั้งค่า' },
]

const MECH_NAV = [
  { section: 'เมนูช่างซ่อม' },
  { id: 'staff/mech/queue',    Icon: ClipboardList,   label: 'คิวของฉัน' },
  { id: 'staff/mech/repair',   Icon: Wrench,          label: 'บันทึกซ่อม' },
  { id: 'staff/mech/history',  Icon: History,         label: 'ประวัติลูกค้า' },
  { divider: true },
  { id: 'staff/notifications', Icon: Bell,            label: 'แจ้งเตือน', dynamic: true },
]

export default function Sidebar({ role, collapsed, onClose, uid }) {
  const pathname    = usePathname()
  const unreadCount = useUnreadCount(uid)
  const nav         = role === 'admin' ? ADMIN_NAV : MECH_NAV
  const isAdmin     = role === 'admin'
  const isActive    = (id) => pathname === `/${id}` || pathname.startsWith(`/${id}/`)

  return (
    <nav
      style={{
        width: collapsed ? 56 : 184,
        minWidth: collapsed ? 56 : 184,
        transition: 'width .2s ease, min-width .2s ease',
        background: 'var(--surf)',
        borderRight: '0.5px solid var(--brd)',
        overflowY: 'auto',
        overflowX: 'hidden',
        height: '100%',
        flexShrink: 0,
      }}
    >
      <div className="py-2">
        {nav.map((item, i) => {
          if (item.divider) {
            return collapsed ? (
              <div key={i} className="my-2 mx-2.5" style={{ height: '0.5px', background: 'var(--brd)' }} />
            ) : (
              <div key={i} className="my-2 mx-4" style={{ height: '0.5px', background: 'var(--brd)' }} />
            )
          }
          if (item.section) {
            return collapsed ? null : (
              <div
                key={i}
                className="px-4 pt-3 pb-1 text-t3 font-bold uppercase tracking-wider text-[9px]"
              >
                {item.section}
              </div>
            )
          }

          const on     = isActive(item.id)
          const badge  = item.dynamic ? unreadCount : 0
          const accent = isAdmin ? 'var(--acc)' : 'var(--grn)'
          const dimBg  = isAdmin ? 'var(--adim)' : 'var(--gdim)'
          const ItemIcon = item.Icon

          if (collapsed) {
            return (
              <Link
                key={item.id}
                href={`/${item.id}`}
                onClick={onClose}
                title={item.label}
                className="flex items-center justify-center py-3 relative group transition-colors"
                style={{
                  borderRight: on ? `2.5px solid ${accent}` : '2.5px solid transparent',
                  background:  on ? dimBg : 'transparent',
                }}
              >
                <ItemIcon
                  size={18}
                  strokeWidth={1.85}
                  style={{ color: on ? accent : 'var(--t2)' }}
                  className="group-hover:scale-110 transition-transform"
                />
                {badge > 0 && (
                  <span
                    className="absolute top-1.5 right-1 rounded-full flex items-center justify-center font-bold text-white shadow-xs"
                    style={{ background: 'var(--err)', fontSize: 8, minWidth: 14, height: 14, padding: '0 2px' }}
                  >
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </Link>
            )
          }

          return (
            <Link
              key={item.id}
              href={`/${item.id}`}
              onClick={onClose}
              className="flex items-center gap-3 px-4 py-2.5 text-xs font-medium cursor-pointer transition-all group"
              style={{
                borderRight: on ? `2.5px solid ${accent}` : '2.5px solid transparent',
                background:  on ? dimBg : 'transparent',
                color:       on ? accent : 'var(--t2)',
                fontWeight:  on ? 700 : 500,
              }}
            >
              <ItemIcon
                size={16}
                strokeWidth={1.85}
                style={{ color: on ? accent : 'var(--t2)' }}
                className="flex-shrink-0 group-hover:scale-105 transition-transform"
              />
              <span className="flex-1 truncate">{item.label}</span>
              {badge > 0 && (
                <span
                  className="text-white rounded-full flex items-center justify-center font-bold flex-shrink-0 shadow-xs"
                  style={{ background: 'var(--err)', fontSize: 9, minWidth: 16, height: 16, padding: '0 3px' }}
                >
                  {badge > 9 ? '9+' : badge}
                </span>
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
