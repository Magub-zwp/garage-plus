'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { useUser } from '@/hooks/useUser'
import { useRepairStatus, STATUS_BADGE } from '@/hooks/useRepairStatus'
import { useBookings } from '@/hooks/useBookings'
import BottomNav from '@/components/customer/BottomNav'
import { useFCM } from '@/hooks/useFCM'
import ArticleCard from '@/components/customer/ArticleCard'
import { useArticles } from '@/hooks/useArticles'
import { db } from '@/lib/firebase/config'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import AppIcon from '@/components/common/AppIcon'
import ApprovalCard from '@/components/customer/ApprovalCard'
import MaintenanceTracker from '@/components/customer/MaintenanceTracker'

const QUICK_ACTIONS = [
  { icon: 'book',      label: 'จองคิว',    href: '/book',        desc: 'นัดหมายซ่อมล่วงหน้า' },
  { icon: 'status',    label: 'สถานะ',     href: '/status',      desc: 'ติดตามงานซ่อมสด' },
  { icon: 'bookings',  label: 'คิวของฉัน', href: '/my-bookings', desc: 'รายการนัดหมาย' },
  { icon: 'promo',     label: 'โปรโมชั่น', href: '/promotions',  desc: 'ส่วนลดและสิทธิพิเศษ' },
]

const QUICK_SERVICES = [
  { icon: 'oil',     label: 'ถ่ายน้ำมันเครื่อง' },
  { icon: 'brake',   label: 'ระบบเบรก' },
  { icon: 'tire',    label: 'ยางและช่วงล่าง' },
  { icon: 'battery', label: 'แบตเตอรี่' },
]

export default function HomePage() {
  const { uid }                 = useAuth()
  useFCM()
  const { user, cars, mainCar } = useUser()
  const { repair, currentStep } = useRepairStatus()
  const { upcoming }            = useBookings()
  const [carIdx,    setCarIdx]  = useState(0)
  const [slideIdx,  setSlideIdx]= useState(0)
  const { articles }            = useArticles('all', 8)
  const [unread, setUnread]     = useState(0)
  const [isDark, setIsDark]     = useState(false)
  const [mounted, setMounted]   = useState(false)
  const trackRef                = useRef(null)
  const timerRef                = useRef(null)

  useEffect(() => {
    setMounted(true)
    setIsDark(localStorage.getItem('gp_dark') === '1')
  }, [])

  const toggleDarkMode = () => {
    const next = !isDark
    setIsDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('gp_dark', next ? '1' : '0')
  }

  // Real-time unread notifications count
  useEffect(() => {
    if (!uid) return
    const unsub = onSnapshot(
      query(collection(db,'notifications'), where('userId','==',uid), where('unread','==',true)),
      snap => setUnread(snap.size),
      err => console.warn('[home unread]', err.message)
    )
    return () => unsub()
  }, [uid])

  // Automatic slide rotation
  const startTimer = useCallback(() => {
    clearInterval(timerRef.current)
    if (articles.length === 0) return
    timerRef.current = setInterval(() => setSlideIdx((p) => (p + 1) % articles.length), 3200)
  }, [articles.length])
  const resetTimer = useCallback(() => { startTimer() }, [startTimer])

  useEffect(() => {
    startTimer()
    return () => clearInterval(timerRef.current)
  }, [startTimer])

  useEffect(() => {
    if (trackRef.current) trackRef.current.scrollTo({ left: slideIdx * 218, behavior: 'smooth' })
  }, [slideIdx])

  const currentCar = cars[carIdx]
  const badge      = repair ? STATUS_BADGE[repair.status] : null

  return (
    <div className="page-container pb-24 md:pb-12 pt-2 md:pt-6">
      
      {/* Mobile Top Header (hidden on md+ because CustomerHeader is active) */}
      <header className="flex justify-between items-center px-4 pt-2 pb-3 md:hidden">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-adim border border-acc/40 flex items-center justify-center">
            <span className="text-base inline-block animate-gearspin">⚙️</span>
          </div>
          <div>
            <h1 className="font-syne text-lg font-extrabold text-t1 leading-none">
              Garage<span className="text-acc">Plus</span>
            </h1>
            <p className="text-t3 text-[10px] uppercase tracking-widest mt-0.5">179 Auto · Doi Saket</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {mounted && (
            <button
              onClick={toggleDarkMode}
              className="w-9 h-9 bg-surf rounded-xl flex items-center justify-center border border-token shadow-sm active:scale-95 transition-transform text-xs cursor-pointer text-t2"
              title={isDark ? 'เปลี่ยนเป็นโหมดสว่าง' : 'เปลี่ยนเป็นโหมดมืด'}
            >
              {isDark ? '☀️' : '🌙'}
            </button>
          )}
          <Link
            href="/notifications"
            className="relative w-9 h-9 bg-surf rounded-xl flex items-center justify-center border border-token shadow-sm active:scale-95 transition-transform"
            title="การแจ้งเตือน"
          >
            <AppIcon name="bell" size={18} />
            {unread > 0 && (
              <span
                className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full flex items-center justify-center font-bold text-white shadow-sm"
                style={{ background: 'var(--acc)', fontSize: 9, border: '1.5px solid var(--surf)' }}
              >
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </Link>
        </div>
      </header>

      {/* Greeting Banner */}
      <div className="px-4 mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-syne text-lg md:text-2xl font-bold text-t1">
            สวัสดี, <span className="text-acc">{user?.name?.split(' ')[0] || 'คุณลูกค้า'}</span> 👋
          </h2>
          <p className="text-xs md:text-sm text-t2 mt-0.5">
            ยินดีต้อนรับสู่ศูนย์บริการ Garage Plus 179 Auto
          </p>
        </div>
        {/* Desktop Quick Car Switcher */}
        {cars.length > 1 && (
          <div className="hidden md:flex items-center gap-2 bg-s2 p-1.5 rounded-2xl border border-token">
            <span className="text-xs text-t3 px-2 font-medium">สลับรถ:</span>
            {cars.map((c, i) => (
              <button
                key={c.id || i}
                onClick={() => setCarIdx(i)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                  carIdx === i
                    ? 'bg-surf text-acc border-acc shadow-sm'
                    : 'bg-transparent text-t2 border-transparent hover:text-t1'
                }`}
              >
                {c.plate}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Responsive Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 px-4 mb-6">
        
        {/* Left Column (Desktop: 7 cols): Hero Car Card & Active Repair Tracker */}
        <div className="md:col-span-7 flex flex-col gap-4">
          {/* Hero car card */}
          {cars.length === 0 ? (
            <Link href="/profile/add-car">
              <div
                className="rounded-3xl p-6 flex flex-col items-center text-center cursor-pointer bg-surf/50 hover:bg-surf transition-all group"
                style={{ border: '1px dashed var(--abrd)' }}
              >
                <div className="w-14 h-14 rounded-2xl bg-adim flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <AppIcon name="car" size={32} />
                </div>
                <p className="font-syne text-base font-bold text-t1 mb-1">ยังไม่มีรถของคุณในระบบ</p>
                <p className="text-xs text-t2 mb-4 max-w-xs leading-relaxed">
                  เพิ่มข้อมูลรถคันแรกเพื่อจองคิวซ่อม ติดตามสถานะงานซ่อม และรับการแจ้งเตือน
                </p>
                <div
                  className="px-6 py-2.5 rounded-2xl text-white text-xs font-bold shadow-md hover:opacity-90 transition-opacity"
                  style={{ background: 'var(--acc)' }}
                >
                  + เพิ่มรถคันแรก
                </div>
              </div>
            </Link>
          ) : (
            <div className="bg-surf rounded-3xl p-5 border border-token relative overflow-hidden shadow-sm">
              <div
                className="absolute -bottom-10 -right-10 w-36 h-36 rounded-full pointer-events-none opacity-60"
                style={{ background: 'var(--adim)', zIndex: 0 }}
              />
              
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-acc uppercase tracking-widest font-bold px-2 py-0.5 rounded-md bg-adim border border-acc">
                      รถที่เลือก
                    </span>
                    {currentCar?.isMain && (
                      <span className="text-[10px] text-t3 font-medium">รถหลัก</span>
                    )}
                  </div>
                  {cars.length > 1 && (
                    <button
                      className="md:hidden text-xs font-semibold text-acc bg-adim px-2.5 py-1 rounded-xl border border-acc cursor-pointer"
                      onClick={() => setCarIdx((p) => (p + 1) % cars.length)}
                    >
                      สลับรถ ({carIdx + 1}/{cars.length}) ›
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3 my-2">
                  <div className="w-12 h-12 rounded-2xl bg-s2 border border-token flex items-center justify-center p-2 flex-shrink-0">
                    <AppIcon name="car" size={26} className="text-acc" />
                  </div>
                  <div>
                    <h3 className="font-syne text-lg md:text-xl font-bold text-t1">
                      {currentCar?.brand} {currentCar?.model} {currentCar?.year}
                    </h3>
                    <span className="inline-block bg-s2 border border-token2 rounded-md px-2.5 py-0.5 text-xs text-t2 font-bold tracking-wider mt-1">
                      {currentCar?.plate}
                    </span>
                  </div>
                </div>

                {/* Repair Status Badge inside car card */}
                {repair && ['waiting', 'diagnosing', 'awaiting_approval', 'repairing', 'qc'].includes(repair.status) &&
                 (!currentCar || currentCar?.id === repair.carId || currentCar?.plate === repair.plate || currentCar?.plate === repair.carPlate) ? (
                  <Link href="/status">
                    <div className="flex items-center gap-3 mt-4 p-3 bg-s2/80 hover:bg-s2 rounded-2xl border border-token transition-colors">
                      <div
                        className="w-3 h-3 rounded-full animate-ping flex-shrink-0"
                        style={{ background: badge?.color || (repair.status === 'awaiting_approval' ? 'var(--err)' : 'var(--acc)') }}
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-bold block" style={{ color: badge?.color || (repair.status === 'awaiting_approval' ? 'var(--err)' : 'var(--acc)') }}>
                          {repair.status === 'awaiting_approval' ? '⚠️ รออนุมัติการซ่อมจากคุณ' : (badge?.text || 'กำลังดำเนินการซ่อม')}
                        </span>
                        <span className="text-[11px] text-t2 truncate block">
                          {repair.jobDetail || (repair.status === 'awaiting_approval' ? 'ช่างประเมินเสร็จแล้ว — คลิกเพื่อตรวจสอบและยืนยัน' : 'คลิกเพื่อดูรายละเอียดและภาพความคืบหน้า')}
                        </span>
                      </div>
                      <span className="text-xs text-acc font-bold bg-surf px-2.5 py-1 rounded-xl border border-token flex-shrink-0">
                        {repair.status === 'awaiting_approval' ? 'กดยืนยัน ›' : 'ติดตามสด ›'}
                      </span>
                    </div>
                  </Link>
                ) : (
                  <div className="flex items-center justify-between mt-4 p-3 bg-s2/60 rounded-2xl border border-token">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-t3" />
                      <span className="text-xs text-t2">ไม่มีงานซ่อมอยู่ในขณะนี้ พร้อมให้บริการ</span>
                    </div>
                    <Link
                      href="/book"
                      className="text-xs font-bold text-acc hover:underline flex items-center gap-1"
                    >
                      จองคิวตรวจเช็ค ›
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Maintenance & Mileage Tracker */}
          {currentCar && (
            <MaintenanceTracker car={currentCar} />
          )}

          {/* Consent / Approval Card (เมื่อช่างขออนุมัติงานซ่อม) */}
          <ApprovalCard repair={repair} uid={uid} />

          {/* Quick Service Chips */}
          <div className="bg-surf rounded-3xl p-4 border border-token hidden sm:block shadow-sm">
            <p className="text-xs font-bold text-t3 uppercase tracking-wider mb-3">บริการยอดนิยมที่อู่</p>
            <div className="grid grid-cols-4 gap-2">
              {QUICK_SERVICES.map((s) => (
                <Link
                  key={s.label}
                  href="/book"
                  className="flex flex-col items-center p-3 rounded-2xl bg-s2 hover:bg-adim hover:border-acc border border-token transition-all text-center group"
                >
                  <div className="w-10 h-10 rounded-xl bg-surf flex items-center justify-center mb-2 shadow-xs group-hover:scale-110 transition-transform">
                    <AppIcon name={s.icon} size={20} className="text-acc" />
                  </div>
                  <span className="text-xs font-semibold text-t1 leading-tight group-hover:text-acc transition-colors">
                    {s.label}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (Desktop: 5 cols): Quick Actions Grid & Upcoming Bookings */}
        <div className="md:col-span-5 flex flex-col gap-4">
          
          {/* Quick actions grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-2 gap-2.5">
            {QUICK_ACTIONS.map((q) => (
              <Link
                key={q.href}
                href={q.href}
                className="bg-surf hover:bg-s2 rounded-3xl p-3.5 sm:p-4 border border-token flex items-center md:items-start gap-3 transition-all group shadow-sm hover:border-acc"
              >
                <div className="w-11 h-11 rounded-2xl bg-adim border border-acc flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                  <AppIcon name={q.icon} size={22} className="text-acc" />
                </div>
                <div className="min-w-0">
                  <span className="font-syne text-xs md:text-sm font-bold text-t1 block group-hover:text-acc transition-colors">
                    {q.label}
                  </span>
                  <span className="text-[11px] text-t3 hidden md:block leading-tight mt-0.5 truncate">
                    {q.desc}
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {/* Upcoming booking notice card */}
          {upcoming.length > 0 ? (
            <Link href="/my-bookings">
              <div
                className="p-4 rounded-3xl flex items-center gap-3.5 cursor-pointer shadow-sm hover:opacity-95 transition-opacity"
                style={{ background: 'var(--adim)', border: '1px solid var(--abrd)' }}
              >
                <div className="w-11 h-11 rounded-2xl bg-surf flex items-center justify-center flex-shrink-0 shadow-xs">
                  <AppIcon name="book" size={22} className="text-acc" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-extrabold text-acc">
                      มีคิวที่รออยู่ ({upcoming.length})
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-acc animate-ping" />
                  </div>
                  <p className="text-xs text-t1 font-semibold mt-0.5 truncate">
                    {upcoming[0]?.date} · เวลา {upcoming[0]?.time} น.
                  </p>
                  <p className="text-[11px] text-t2 truncate">
                    รหัส: {upcoming[0]?.bookingRef} · {upcoming[0]?.carPlate}
                  </p>
                </div>
                <span className="text-acc font-bold text-lg">›</span>
              </div>
            </Link>
          ) : (
            <div className="p-4 rounded-3xl bg-surf border border-token flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-s2 flex items-center justify-center">
                  <AppIcon name="garage" size={20} className="text-acc" />
                </div>
                <div>
                  <p className="text-xs font-bold text-t1">Garage Plus 179 Auto</p>
                  <p className="text-[11px] text-t3">เปิด จันทร์ - เสาร์ 08:00 - 17:00</p>
                </div>
              </div>
              <Link
                href="/book"
                className="px-3 py-1.5 rounded-xl bg-adim text-acc border border-acc text-xs font-bold hover:bg-acc hover:text-white transition-colors"
              >
                จองคิว
              </Link>
            </div>
          )}

          {/* Quick promotion banner */}
          <Link href="/promotions">
            <div className="p-4 rounded-3xl bg-gradient-to-r from-acc/15 to-acc/5 border border-acc/30 flex items-center justify-between hover:border-acc transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-surf flex items-center justify-center shadow-xs">
                  <AppIcon name="promo" size={20} className="text-acc" />
                </div>
                <div>
                  <p className="text-xs font-bold text-t1">สิทธิพิเศษสำหรับลูกค้า</p>
                  <p className="text-[11px] text-acc font-medium">ตรวจเช็คสภาพฟรี 24 รายการ</p>
                </div>
              </div>
              <span className="text-xs font-bold text-acc">ดูเพิ่ม ›</span>
            </div>
          </Link>

        </div>

      </div>

      {/* Articles & News Section */}
      <div className="px-4 mb-2 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="font-syne text-sm md:text-base font-bold text-t1">บทความ & ข่าวสารสาระน่ารู้</span>
          <span className="text-xs text-t3 font-medium">({articles.length})</span>
        </div>
        <Link href="/articles" className="text-xs text-acc font-bold hover:underline">
          ดูทั้งหมด ›
        </Link>
      </div>

      {articles.length === 0 ? (
        <div
          className="mx-4 mb-4 text-center py-8 rounded-3xl"
          style={{ background: 'var(--s2)', border: '1px dashed var(--brd2)' }}
        >
          <p className="text-xs text-t2">ยังไม่มีบทความ — รอติดตามข้อมูลสาระน่ารู้เร็วๆ นี้</p>
        </div>
      ) : (
        <>
          {/* Mobile view: Horizontal Scroll Carousel */}
          <div className="md:hidden overflow-hidden mb-3">
            <div
              ref={trackRef}
              className="flex gap-3 px-4 no-scrollbar overflow-x-auto pb-2"
              style={{ scrollSnapType: 'x mandatory' }}
              onScroll={(e) => {
                const i = Math.round(e.target.scrollLeft / 218)
                if (i !== slideIdx) {
                  setSlideIdx(i)
                  resetTimer()
                }
              }}
            >
              {articles.map((a, idx) => (
                <Link
                  key={a.id || idx}
                  href={a.id ? `/articles/${a.id}` : '/articles'}
                  className="bg-surf rounded-2xl border border-token overflow-hidden flex-shrink-0 cursor-pointer shadow-xs active:scale-98 transition-transform"
                  style={{ width: 220, scrollSnapAlign: 'start' }}
                >
                  <div
                    className="h-24 flex items-center justify-center relative overflow-hidden"
                    style={{ background: a.bg || 'var(--s2)' }}
                  >
                    {a.thumbnailUrl ? (
                      <img
                        src={a.thumbnailUrl}
                        alt={a.title || ''}
                        loading="lazy"
                        className="w-full h-full object-cover"
                        onError={(e) => { e.currentTarget.style.display = 'none' }}
                      />
                    ) : (
                      <AppIcon name="history" size={32} />
                    )}
                    <div
                      className="absolute top-2 left-2 text-white font-bold px-2 py-0.5 rounded-full uppercase tracking-wide shadow-xs"
                      style={{ background: 'var(--acc)', fontSize: 9 }}
                    >
                      {a.cat || a.category || 'ทั่วไป'}
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="font-syne text-xs font-bold text-t1 leading-snug line-clamp-2 mb-2">
                      {a.title}
                    </p>
                    <div className="flex justify-between items-center text-[10px] text-t3">
                      <span>{a.min || 3} นาทีในการอ่าน</span>
                      <span className="text-acc font-bold">อ่านต่อ →</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Desktop view: Responsive 4-Column Grid */}
          <div className="hidden md:grid md:grid-cols-4 gap-4 px-4 mb-4">
            {articles.slice(0, 4).map((a, idx) => (
              <Link
                key={a.id || idx}
                href={a.id ? `/articles/${a.id}` : '/articles'}
                className="bg-surf rounded-3xl border border-token overflow-hidden hover:border-acc hover:shadow-md transition-all group flex flex-col"
              >
                <div
                  className="h-32 flex items-center justify-center relative overflow-hidden"
                  style={{ background: a.bg || 'var(--s2)' }}
                >
                  {a.thumbnailUrl ? (
                    <img
                      src={a.thumbnailUrl}
                      alt={a.title || ''}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => { e.currentTarget.style.display = 'none' }}
                    />
                  ) : (
                    <AppIcon name="history" size={36} />
                  )}
                  <div
                    className="absolute top-2.5 left-2.5 text-white font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
                    style={{ background: 'var(--acc)', fontSize: 9 }}
                  >
                    {a.cat || a.category || 'ทั่วไป'}
                  </div>
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <p className="font-syne text-sm font-bold text-t1 leading-snug mb-3 group-hover:text-acc transition-colors line-clamp-2">
                    {a.title}
                  </p>
                  <div className="flex justify-between items-center text-xs pt-2 border-t border-token">
                    <span className="text-t3">{a.min || 3} นาทีอ่าน</span>
                    <span className="text-acc font-bold">อ่านต่อ →</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* Mobile Bottom Navigation Bar (md:hidden) */}
      <BottomNav />
    </div>
  )
}
