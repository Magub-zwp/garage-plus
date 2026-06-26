'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { db } from '@/lib/firebase/config'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { useAuthContext } from '@/context/AuthContext'

function useUnreadCount(uidProp) {
  const ctx = useAuthContext() || {}
  const uid = uidProp || ctx.uid   // ใช้ uid ที่ส่งมาทาง prop ก่อน ถ้าไม่มีค่อย fallback ไปใช้ uid จาก AuthContext
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!uid) return
    const unsub = onSnapshot(
      query(collection(db,'notifications'), where('userId','==',uid), where('unread','==',true)),
      snap => setCount(snap.size),
      err => console.warn('[unread]', err.message)
    )
    return () => unsub()
  }, [uid])
  return count
}

const ADMIN_NAV = [
  { id:'staff/dashboard',     icon:'📊', label:'Dashboard' },
  { id:'staff/queue',         icon:'📋', label:'จัดการคิว' },
  { id:'staff/repairs',       icon:'🔧', label:'งานซ่อม' },
  { divider:true },
  { id:'staff/assign',        icon:'👥', label:'มอบหมายงาน' },
  { id:'staff/customers',     icon:'👤', label:'ข้อมูลลูกค้า' },
  { id:'staff/reports',       icon:'📈', label:'รายงาน' },
  { divider:true },
  { id:'staff/employees',     icon:'🧑‍🔧', label:'พนักงาน' },
  { id:'staff/promotions',    icon:'🎁', label:'โปรโมชั่น' },
  { id:'staff/articles',      icon:'📰', label:'บทความ' },
  { divider:true },
  { id:'staff/notifications', icon:'🔔', label:'แจ้งเตือน', dynamic:true },
  { id:'staff/settings',      icon:'⚙️',  label:'ตั้งค่า' },
]
const MECH_NAV = [
  { section:'เมนูช่างซ่อม' },
  { id:'staff/mech/queue',    icon:'📋', label:'คิวของฉัน' },
  { id:'staff/mech/repair',   icon:'🔧', label:'บันทึกซ่อม' },
  { id:'staff/mech/history',  icon:'📂', label:'ประวัติลูกค้า' },
  { divider:true },
  { id:'staff/notifications', icon:'🔔', label:'แจ้งเตือน', dynamic:true },
]

// เมนูด้านข้างของฝั่ง staff — เปลี่ยนรายการเมนูตาม role (admin/ช่าง) และรองรับสถานะย่อ (collapsed) บน desktop
export default function Sidebar({ role, collapsed, onClose, uid }) {
  const pathname    = usePathname()
  const unreadCount = useUnreadCount(uid)
  const nav     = role === 'admin' ? ADMIN_NAV : MECH_NAV
  const isAdmin = role === 'admin'
  const isActive = (id) => pathname === `/${id}` || pathname.startsWith(`/${id}/`)

  return (
    <nav
      style={{
        width: collapsed ? 52 : 176,
        minWidth: collapsed ? 52 : 176,
        transition: 'width .2s ease, min-width .2s ease',
        background: 'var(--surf)',
        borderRight: '0.5px solid var(--brd)',
        overflowY: 'auto',
        overflowX: 'hidden',
        height: '100%',
        flexShrink: 0,
      }}>
      {nav.map((item, i) => {
        if (item.divider) {
          return collapsed
            ? <div key={i} className="my-1 mx-2" style={{ height:'0.5px', background:'var(--brd)' }}/>
            : <div key={i} className="my-2 mx-4" style={{ height:'0.5px', background:'var(--brd)' }}/>
        }
        if (item.section) {
          return collapsed ? null : (
            <div key={i} className="px-4 pt-2 pb-1 text-t3 font-bold uppercase tracking-wider"
              style={{ fontSize:9 }}>{item.section}</div>
          )
        }
        const on    = isActive(item.id)
        const badge = item.dynamic ? unreadCount : 0
        const accent = isAdmin ? 'var(--acc)' : 'var(--grn)'
        const dimBg  = isAdmin ? 'var(--adim)' : 'var(--gdim)'

        if (collapsed) {
          return (
            <Link key={item.id} href={`/${item.id}`}
              onClick={onClose}
              title={item.label}
              className="flex items-center justify-center py-3 relative"
              style={{
                borderRight: on ? `2.5px solid ${accent}` : '2.5px solid transparent',
                background:  on ? dimBg : 'transparent',
              }}>
              <span style={{ fontSize:16 }}>{item.icon}</span>
              {badge > 0 && (
                <span className="absolute top-1.5 right-1 rounded-full flex items-center justify-center font-bold text-white"
                  style={{ background:'var(--err)', fontSize:8, minWidth:14, height:14, padding:'0 2px' }}>
                  {badge > 9 ? '9+' : badge}
                </span>
              )}
            </Link>
          )
        }

        return (
          <Link key={item.id} href={`/${item.id}`}
            onClick={onClose}
            className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium cursor-pointer transition-colors"
            style={{
              borderRight: on ? `2.5px solid ${accent}` : '2.5px solid transparent',
              background:  on ? dimBg : 'transparent',
              color:       on ? accent : 'var(--t2)',
              fontWeight:  on ? 700 : 500,
            }}>
            <span style={{ fontSize:14, flexShrink:0 }}>{item.icon}</span>
            <span className="flex-1 truncate">{item.label}</span>
            {badge > 0 && (
              <span className="text-white rounded-full flex items-center justify-center font-bold flex-shrink-0"
                style={{ background:'var(--err)', fontSize:9, minWidth:16, height:16, padding:'0 3px' }}>
                {badge > 9 ? '9+' : badge}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
