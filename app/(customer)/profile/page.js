'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useUser } from '@/hooks/useUser'
import { deleteCar } from '@/lib/firebase/firestore'
import { logout } from '@/lib/firebase/auth'
import BottomNav from '@/components/customer/BottomNav'

export default function ProfilePage() {
  const router = useRouter()
  const { uid } = useAuth()
  const { user, cars } = useUser()
  const [showLogout,   setShowLogout]   = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting,     setDeleting]     = useState(false)
  
  const handleDeleteCar = async (id) => {
    setDeleting(true)
    try { await deleteCar(id) } finally { setDeleting(false); setDeleteTarget(null) }
  }
  
  const handleLogout = async () => {
    await logout()
    router.replace('/login')
  }
  // Generate initials for profile icon
  const initials = user?.name ? user.name.substring(0, 2) : '?'

  return (
    <div className="page-container pb-24">
      {/* Hero */}
      <div className="flex flex-col items-center px-4 pt-6 pb-5" style={{ borderBottom: '0.5px solid var(--brd)' }}>
        <div className="relative mb-3">
          <div className="w-16 h-16 rounded-full flex items-center justify-center font-syne text-2xl font-extrabold text-white"
            style={{ background: 'linear-gradient(135deg,var(--acc),#c96e25)', border: '3px solid var(--bg)' }}>
            {initials}
          </div>
          <Link href="/profile/edit"
            className="absolute bottom-0.5 right-0.5 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs"
            style={{ background: 'var(--acc)', border: '2px solid var(--bg)' }}>✏️</Link>
        </div>
        <h2 className="font-syne text-lg font-bold text-t1">{user?.name || 'กำลังโหลด...'}</h2>
        <p className="text-xs text-t2 mt-0.5">📞 {user?.phone || '-'} · สมาชิกตั้งแต่ {user?.memberSince ? new Date(user.memberSince?.seconds * 1000).toLocaleDateString('th-TH', { year:'numeric', month:'short' }) : '-'}</p>
        <div className="flex items-center gap-2 mt-3 px-4 py-1.5 rounded-full" style={{ background: 'var(--adim)', border: '0.5px solid var(--abrd)' }}>
          <span className="text-xs font-bold text-acc">⭐ {user?.points || 0} คะแนน</span>
          <span className="text-xs text-t2">· ใช้บริการแล้ว {user?.usageCount || 0} ครั้ง</span>
        </div>
        <Link href="/profile/edit" className="mt-3 px-5 py-2 bg-surf rounded-full text-xs font-semibold text-t1 border-token2">✏️ แก้ไขโปรไฟล์</Link>
      </div>

      {/* Call strip */}
      <a href="tel:053XXXXXX" className="mx-4 mt-3 mb-1 rounded-2xl p-3 flex justify-between items-center cursor-pointer" style={{ background: 'var(--gdim)', border: '0.5px solid var(--gbrd)' }}>
        <div>
          <p className="text-xs text-t2">ต้องการติดต่ออู่?</p>
          <p className="text-sm font-bold text-grn mt-0.5">📞 179 Auto · 053-XXX-XXX</p>
        </div>
        <div className="px-3 py-1.5 rounded-full text-xs font-bold text-white" style={{ background: 'var(--grn)' }}>โทรเลย</div>
      </a>

      {/* Cars */}
      <div className="px-4 pt-4"><p className="text-xs font-bold text-t3 uppercase tracking-widest mb-3">รถของฉัน</p></div>
      {cars.map((car) => (
        <div key={car.id} className="mx-4 mb-2 bg-surf rounded-2xl p-3 border-token flex gap-3 items-center">
          <div className="w-10 h-10 bg-s2 rounded-2xl flex items-center justify-center text-xl flex-shrink-0">🚗</div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-t1">{car.brand} {car.model} {car.year}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-block bg-s2 border-token2 rounded px-2 py-0.5 text-xs text-t2 font-semibold tracking-widest">{car.plate}</span>
              {car.isMain && (<span className="text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'var(--adim)', color: 'var(--acc)', border: '0.5px solid var(--abrd)' }}>รถหลัก</span>)}
            </div>
          </div>
          <button onClick={() => setDeleteTarget(car.id)} className="w-7 h-7 rounded-xl flex items-center justify-center text-xs cursor-pointer border-none" style={{ background: 'var(--errdim)', color: 'var(--err)' }}>🗑</button>
        </div>
      ))}
      <Link href="/profile/add-car">
        <div className="mx-4 mb-3 flex items-center gap-3 p-3 rounded-2xl cursor-pointer" style={{ border: '0.5px dashed var(--brd2)' }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base" style={{ background: 'var(--adim)', border: '0.5px solid var(--abrd)' }}>➕</div>
          <span className="text-sm font-medium text-acc">เพิ่มรถคันใหม่</span>
        </div>
      </Link>

      {/* Menu */}
      <div className="px-4 pt-2">
        <p className="text-xs font-bold text-t3 uppercase tracking-widest mb-2">การตั้งค่า</p>
        {[
          { href:'/settings', icon:'⚙️', bg:'rgba(59,130,246,.1)', title:'การตั้งค่าทั้งหมด', sub:'ภาษา, โหมดสี, แจ้งเตือน' },
          { href:'/history',  icon:'📋', bg:'var(--gdim)',          title:'ประวัติการซ่อม',    sub:'รายการซ่อมทั้งหมด' },
        ].map((m) => (
          <Link key={m.href} href={m.href}>
            <div className="profile-row">
              <div className="profile-row-icon" style={{ background: m.bg }}>{m.icon}</div>
              <div className="flex-1"><p className="text-sm font-medium text-t1">{m.title}</p><p className="text-xs text-t2 mt-0.5">{m.sub}</p></div>
              <span className="text-t3 text-base">›</span>
            </div>
          </Link>
        ))}
        <button className="profile-row w-full text-left" style={{ borderBottom: 'none' }} onClick={() => setShowLogout(true)}>
          <div className="profile-row-icon" style={{ background: 'var(--errdim)' }}>🚪</div>
          <span className="text-sm font-medium" style={{ color: 'var(--err)' }}>ออกจากระบบ</span>
        </button>
      </div>
      <div style={{ height: 32 }} />

      {/* Delete car dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-6">
          <div className="bg-surf rounded-3xl p-6 w-full max-w-sm text-center">
            <div className="text-4xl mb-3">🗑</div>
            <h3 className="font-syne text-base font-bold text-t1 mb-2">ลบรถออก?</h3>
            <p className="text-xs text-t2 leading-relaxed mb-5">ประวัติการซ่อมของรถคันนี้จะยังคงอยู่<br />แต่รถจะถูกลบออกจากบัญชีของคุณ</p>
            <div className="flex gap-2">
              <button className="flex-1 py-3 bg-s2 rounded-2xl text-sm font-bold text-t1 border-none cursor-pointer" onClick={() => setDeleteTarget(null)}>ยกเลิก</button>
              <button className="flex-1 py-3 rounded-2xl text-sm font-bold text-white border-none cursor-pointer flex items-center justify-center gap-2" style={{ background: 'var(--err)' }} onClick={() => handleDeleteCar(deleteTarget)} disabled={deleting}>
                {deleting ? <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'ลบรถ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout dialog */}
      {showLogout && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-6">
          <div className="bg-surf rounded-3xl p-6 w-full max-w-sm text-center">
            <div className="text-4xl mb-3">🚪</div>
            <h3 className="font-syne text-base font-bold text-t1 mb-2">ออกจากระบบ?</h3>
            <p className="text-xs text-t2 leading-relaxed mb-5">คุณจะต้องเข้าสู่ระบบใหม่อีกครั้ง</p>
            <div className="flex gap-2">
              <button className="flex-1 py-3 bg-s2 rounded-2xl text-sm font-bold text-t1 border-none cursor-pointer" onClick={() => setShowLogout(false)}>ยกเลิก</button>
              <button className="flex-1 py-3 rounded-2xl text-sm font-bold text-white border-none cursor-pointer" style={{ background: 'var(--err)' }} onClick={handleLogout}>ออกจากระบบ</button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
