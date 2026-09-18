'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useUser } from '@/hooks/useUser'
import { deleteCar } from '@/lib/firebase/firestore'
import { logout } from '@/lib/firebase/auth'
import BottomNav from '@/components/customer/BottomNav'
import AppIcon from '@/components/common/AppIcon'

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

  const initials = user?.name ? user.name.substring(0, 2) : 'GP'

  return (
    <div className="page-container pb-24 md:pb-12 pt-2 md:pt-4 px-4 md:px-0">
      
      {/* Header */}
      <div className="page-header px-0 mb-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Link href="/home" className="back-btn">‹</Link>
          <h1 className="page-title text-base md:text-xl font-bold">ข้อมูลโปรไฟล์และบัญชี</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Left Column (Desktop: 5 cols): User Info & Points */}
        <div className="md:col-span-5 flex flex-col gap-4">
          
          <div className="bg-surf rounded-3xl p-6 border border-token text-center flex flex-col items-center shadow-xs">
            <div className="relative mb-3.5">
              <div
                className="w-20 h-20 rounded-3xl flex items-center justify-center font-syne text-2xl font-extrabold text-white shadow-md"
                style={{ background: 'linear-gradient(135deg, var(--acc), #c96e25)', border: '3px solid var(--surf)' }}
              >
                {initials}
              </div>
              <Link
                href="/profile/edit"
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-xl flex items-center justify-center text-white text-xs shadow-sm"
                style={{ background: 'var(--acc)', border: '2px solid var(--surf)' }}
                title="แก้ไขข้อมูล"
              >
                ✏️
              </Link>
            </div>

            <h2 className="font-syne text-lg font-bold text-t1">{user?.name || 'กำลังโหลด...'}</h2>
            <p className="text-xs text-t2 mt-0.5">
              {user?.phone || '-'} · สมาชิกตั้งแต่ {user?.memberSince ? new Date(user.memberSince?.seconds * 1000).toLocaleDateString('th-TH', { year:'numeric', month:'short' }) : '-'}
            </p>

            <div
              className="flex items-center gap-2 mt-4 px-4 py-2 rounded-2xl"
              style={{ background: 'var(--adim)', border: '1px solid var(--abrd)' }}
            >
              <span className="text-xs font-bold text-acc">⭐ {user?.points || 0} คะแนนสะสม</span>
              <span className="text-xs text-t2">· รับบริการ {user?.usageCount || 0} ครั้ง</span>
            </div>

            <Link
              href="/profile/edit"
              className="mt-4 w-full py-2.5 bg-s2 hover:bg-s3 rounded-2xl text-xs font-bold text-t1 border border-token transition-colors"
            >
              แก้ไขโปรไฟล์
            </Link>
          </div>

          {/* Garage contact strip */}
          <a
            href="tel:053XXXXXX"
            className="rounded-3xl p-4 flex justify-between items-center cursor-pointer shadow-xs hover:opacity-95 transition-opacity"
            style={{ background: 'var(--gdim)', border: '1px solid var(--gbrd)' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-surf flex items-center justify-center">
                <AppIcon name="garage" size={22} />
              </div>
              <div>
                <p className="text-xs text-t2 font-medium">ต้องการความช่วยเหลือ?</p>
                <p className="text-sm font-bold text-grn mt-0.5">179 Auto Doi Saket</p>
              </div>
            </div>
            <div className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white shadow-xs" style={{ background: 'var(--grn)' }}>
              โทรอู่
            </div>
          </a>

        </div>

        {/* Right Column (Desktop: 7 cols): Cars List & Navigation Menu */}
        <div className="md:col-span-7 flex flex-col gap-4">
          
          {/* Cars section */}
          <div className="bg-surf rounded-3xl p-5 border border-token shadow-xs">
            <div className="flex justify-between items-center mb-3">
              <p className="text-xs font-bold text-t3 uppercase tracking-wider">รถของฉัน ({cars.length})</p>
              <Link href="/profile/add-car" className="text-xs text-acc font-semibold hover:underline">
                + เพิ่มรถคันใหม่
              </Link>
            </div>

            <div className="flex flex-col gap-2">
              {cars.map((car) => (
                <div
                  key={car.id}
                  className="bg-s2/60 hover:bg-s2 rounded-2xl p-3 border border-token flex gap-3 items-center transition-colors"
                >
                  <div className="w-11 h-11 bg-surf rounded-2xl flex items-center justify-center flex-shrink-0 border border-token">
                    <AppIcon name="car" size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-t1 truncate">
                      {car.brand} {car.model} {car.year}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="inline-block bg-surf border border-token rounded-md px-2 py-0.5 text-xs text-t2 font-bold tracking-wider">
                        {car.plate}
                      </span>
                      {car.isMain && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-adim text-acc border border-acc">
                          รถหลัก
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setDeleteTarget(car.id)}
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-xs cursor-pointer border-none bg-errdim text-err hover:opacity-80 transition-opacity"
                    title="ลบรถออกจากระบบ"
                  >
                    ✕
                  </button>
                </div>
              ))}

              <Link href="/profile/add-car">
                <div className="flex items-center gap-3 p-3.5 rounded-2xl cursor-pointer border border-dashed border-acc/40 hover:border-acc hover:bg-adim/50 transition-colors">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base bg-adim border border-acc text-acc font-bold">
                    +
                  </div>
                  <span className="text-xs font-bold text-acc">เพิ่มรถยนต์คันใหม่</span>
                </div>
              </Link>
            </div>
          </div>

          {/* Menu & Settings */}
          <div className="bg-surf rounded-3xl p-5 border border-token shadow-xs">
            <p className="text-xs font-bold text-t3 uppercase tracking-wider mb-2">เมนูการตั้งค่าและประวัติ</p>
            
            <div className="divide-y divide-token">
              {[
                { href: '/settings', icon: 'settings', title: 'การตั้งค่าทั่วไป', sub: 'ภาษา, โหมดสี (Dark/Light), แจ้งเตือน' },
                { href: '/history',  icon: 'history',  title: 'ประวัติการซ่อมและบริการ', sub: 'บันทึกการซ่อมและใบเสร็จทั้งหมด' },
                { href: '/promotions', icon: 'promo',  title: 'สิทธิพิเศษและโปรโมชั่น', sub: 'คูปองส่วนลดและของรางวัล' },
              ].map((m) => (
                <Link key={m.href} href={m.href} className="block group">
                  <div className="flex items-center gap-3.5 py-3 hover:bg-s2/50 px-2 rounded-xl transition-colors">
                    <div className="w-10 h-10 rounded-2xl bg-adim border border-acc flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                      <AppIcon name={m.icon} size={22} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-t1 group-hover:text-acc transition-colors">{m.title}</p>
                      <p className="text-xs text-t3 mt-0.5">{m.sub}</p>
                    </div>
                    <span className="text-t3 text-base group-hover:translate-x-0.5 transition-transform">›</span>
                  </div>
                </Link>
              ))}

              <button
                className="w-full text-left flex items-center gap-3.5 py-3 hover:bg-errdim/30 px-2 rounded-xl transition-colors cursor-pointer border-none bg-transparent"
                onClick={() => setShowLogout(true)}
              >
                <div className="w-10 h-10 rounded-2xl bg-errdim border border-err/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-err text-base">🚪</span>
                </div>
                <div className="flex-1">
                  <span className="text-sm font-bold text-err">ออกจากระบบ</span>
                  <p className="text-[11px] text-t3 mt-0.5">ออกจากเซสชันการใช้งานปัจจุบัน</p>
                </div>
                <span className="text-err text-base">›</span>
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* Delete car dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 px-6">
          <div className="bg-surf rounded-3xl p-6 w-full max-w-sm text-center border border-token shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-errdim mx-auto flex items-center justify-center text-err text-2xl font-bold mb-3">
              ✕
            </div>
            <h3 className="font-syne text-base font-bold text-t1 mb-2">ลบรถคันนี้ออกจากระบบ?</h3>
            <p className="text-xs text-t2 leading-relaxed mb-5">
              ประวัติการซ่อมของรถคันนี้จะยังคงอยู่<br />แต่รถจะถูกลบออกจากบัญชีของคุณ
            </p>
            <div className="flex gap-2.5">
              <button
                className="flex-1 py-3 bg-s2 hover:bg-s3 rounded-2xl text-xs font-bold text-t1 border-none cursor-pointer"
                onClick={() => setDeleteTarget(null)}
              >
                ยกเลิก
              </button>
              <button
                className="flex-1 py-3 rounded-2xl text-xs font-bold text-white border-none cursor-pointer flex items-center justify-center gap-2 bg-err hover:opacity-90 shadow-sm"
                onClick={() => handleDeleteCar(deleteTarget)}
                disabled={deleting}
              >
                {deleting ? <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'ยืนยันลบรถ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout dialog */}
      {showLogout && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 px-6">
          <div className="bg-surf rounded-3xl p-6 w-full max-w-sm text-center border border-token shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-s2 mx-auto flex items-center justify-center text-2xl mb-3">
              🚪
            </div>
            <h3 className="font-syne text-base font-bold text-t1 mb-2">ต้องการออกจากระบบ?</h3>
            <p className="text-xs text-t2 leading-relaxed mb-5">คุณจะต้องลงชื่อเข้าใช้อีกครั้งเมื่อต้องการเข้าถึงข้อมูล</p>
            <div className="flex gap-2.5">
              <button
                className="flex-1 py-3 bg-s2 hover:bg-s3 rounded-2xl text-xs font-bold text-t1 border-none cursor-pointer"
                onClick={() => setShowLogout(false)}
              >
                ยกเลิก
              </button>
              <button
                className="flex-1 py-3 rounded-2xl text-xs font-bold text-white border-none cursor-pointer bg-err hover:opacity-90 shadow-sm"
                onClick={handleLogout}
              >
                ออกจากระบบ
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
