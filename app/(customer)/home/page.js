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

export default function HomePage() {
  const { uid }                      = useAuth()
  useFCM()
  const { user, cars, mainCar }      = useUser()
  const { repair, currentStep }      = useRepairStatus()
  const { upcoming }                 = useBookings()
  const [carIdx,    setCarIdx]       = useState(0)
  const [slideIdx,  setSlideIdx]     = useState(0)
  const { articles } = useArticles('all', 8)
  const trackRef = useRef(null)
  const timerRef = useRef(null)


  
  const startTimer = useCallback(() => {
    clearInterval(timerRef.current)
    if (articles.length === 0) return
    timerRef.current = setInterval(() => setSlideIdx((p) => (p + 1) % articles.length), 2800)
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

  const QUICK_ACTIONS = [
    { icon: '📅', label: 'จองคิว',    href: '/book'        },
    { icon: '🔧', label: 'สถานะ',     href: '/status'      },
    { icon: '📋', label: 'คิวของฉัน', href: '/my-bookings' },
    { icon: '🎁', label: 'โปรโมชั่น', href: '/promotions'  },
  ]

  return (
    <div className="page-container pb-24">
      {/* Header */}
      <header className="flex justify-between items-center px-4 pt-4 pb-3">
        <div>
          <h1 className="font-syne text-lg font-extrabold text-t1">
            Garage<span className="text-acc">Plus</span>
          </h1>
          <p className="text-t3 text-xs uppercase tracking-widest mt-0.5">179 Auto · Doi Saket</p>
        </div>
        <Link href="/notifications"
          className="relative w-9 h-9 bg-surf rounded-full flex items-center justify-center border-token">
          <span className="text-base">🔔</span>
        </Link>
      </header>

      {/* Greeting */}
      {user && (
        <p className="px-4 text-t2 text-sm mb-2">สวัสดี, <span className="font-semibold text-t1">{user.name?.split(' ')[0]}</span> 👋</p>
      )}

      {/* Hero car card */}
      {cars.length === 0 ? (
        <Link href="/profile/add-car">
          <div className="mx-4 mb-3 rounded-3xl p-5 flex flex-col items-center text-center cursor-pointer"
            style={{ border: '0.5px dashed var(--abrd)' }}>
            <span className="text-4xl mb-3">🚗</span>
            <p className="font-syne text-sm font-bold text-t1 mb-1">ยังไม่มีรถของคุณ</p>
            <p className="text-xs text-t2 mb-4 leading-relaxed">เพิ่มรถคันแรกเพื่อจองคิวและติดตามสถานะ</p>
            <div className="px-5 py-2 rounded-full text-white text-xs font-bold" style={{ background: 'var(--acc)' }}>➕ เพิ่มรถคันแรก</div>
          </div>
        </Link>
      ) : (
        <div className="mx-4 mb-2 bg-surf rounded-3xl p-4 border-token relative overflow-hidden">
          <div className="absolute -bottom-8 -right-8 w-24 h-24 rounded-full" style={{ background: 'var(--adim)' }} />
          <div className="flex justify-between items-start mb-1">
            <p className="text-t3 text-xs uppercase tracking-widest">รถของฉัน</p>
            {cars.length > 1 && (
              <button className="text-xs font-semibold text-acc bg-none border-none cursor-pointer"
                onClick={() => setCarIdx((p) => (p + 1) % cars.length)}>สลับรถ ›</button>
            )}
          </div>
          <h3 className="font-syne text-lg font-bold text-t1 mb-1.5">
            {currentCar?.brand} {currentCar?.model} {currentCar?.year}
          </h3>
          <span className="inline-block bg-s2 border-token2 rounded-md px-2.5 py-0.5 text-xs text-t2 font-semibold tracking-widest">
            {currentCar?.plate}
          </span>
          {repair && currentCar?.id === repair.carId ? (
            <Link href="/status">
              <div className="flex items-center gap-2 mt-3 p-2.5 bg-s2 rounded-xl">
                <div className="w-2 h-2 rounded-full animate-blink flex-shrink-0" style={{ background: badge?.color || 'var(--grn)' }} />
                <span className="text-xs font-semibold flex-1" style={{ color: badge?.color || 'var(--grn)' }}>
                  {badge?.text || 'กำลังซ่อม'}
                </span>
                <span className="text-xs text-acc font-bold">ดูเพิ่ม ›</span>
              </div>
            </Link>
          ) : (
            <div className="flex items-center gap-2 mt-3 p-2.5 bg-s2 rounded-xl">
              <span className="text-xs text-t2">ไม่มีงานซ่อมอยู่ในขณะนี้</span>
              <Link href="/book" className="ml-auto text-xs text-acc font-bold">จองคิว ›</Link>
            </div>
          )}
        </div>
      )}

      {/* Car dots */}
      {cars.length > 1 && (
        <div className="flex justify-center gap-1.5 mb-3">
          {cars.map((_, i) => (
            <button key={i} onClick={() => setCarIdx(i)} className="h-1.5 rounded-full transition-all border-none cursor-pointer"
              style={{ width: carIdx === i ? 14 : 6, background: carIdx === i ? 'var(--acc)' : 'var(--brd2)' }} />
          ))}
        </div>
      )}

      {/* Upcoming booking notice */}
      {upcoming.length > 0 && (
        <Link href="/my-bookings">
          <div className="mx-4 mb-3 p-3 rounded-2xl flex items-center gap-3 cursor-pointer"
            style={{ background: 'var(--adim)', border: '0.5px solid var(--abrd)' }}>
            <span className="text-xl">📅</span>
            <div className="flex-1">
              <p className="text-xs font-bold text-acc">มีคิวที่รออยู่ {upcoming.length} คิว</p>
              <p className="text-xs text-t2 mt-0.5">{upcoming[0]?.date} · {upcoming[0]?.time} น. · {upcoming[0]?.bookingRef}</p>
            </div>
            <span className="text-acc">›</span>
          </div>
        </Link>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-4 gap-2 px-4 mb-3">
        {QUICK_ACTIONS.map((q) => (
          <Link key={q.href} href={q.href}
            className="bg-surf rounded-2xl py-3 px-1.5 border-token flex flex-col items-center gap-1">
            <span className="text-lg">{q.icon}</span>
            <span className="font-syne text-xs font-bold text-t1 text-center leading-tight">{q.label}</span>
          </Link>
        ))}
      </div>

      {/* Articles */}
      <div className="section-header mb-2">
        <span className="section-title">บทความ & ข่าวสาร</span>
        <span className="section-link">ดูทั้งหมด</span>
      </div>
      {articles.length === 0 ? (
        <div className="px-4 mb-4 text-center py-6 rounded-2xl mx-4"
          style={{ background:'var(--s2)', border:'0.5px dashed var(--brd2)' }}>
          <p className="text-xs text-t2">ยังไม่มีบทความ — กลับมาใหม่เร็วๆ นี้</p>
        </div>
      ) : null}
      <div className="overflow-hidden mb-1" style={{ display: articles.length === 0 ? 'none' : 'block' }}>
        <div ref={trackRef}
          className="flex gap-2.5 px-4 no-scrollbar overflow-x-auto pb-1"
          style={{ scrollSnapType: 'x mandatory' }}
          onScroll={(e) => {
            const i = Math.round(e.target.scrollLeft / 218)
            if (i !== slideIdx) { setSlideIdx(i); resetTimer() }
          }}>
          {articles.map((a, idx) => (
            <div key={a.id || idx}
              className="bg-surf rounded-2xl border-token overflow-hidden flex-shrink-0 cursor-pointer"
              style={{ minWidth: 208, scrollSnapAlign: 'start' }}>
              <div className="h-20 flex items-center justify-center relative"
                style={{ background: a.bg || 'var(--s2)' }}>
                <span style={{ fontSize: 28 }}>{a.icon}</span>
                <div className="absolute top-2 left-2 text-white text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
                  style={{ background: 'var(--acc)', fontSize: 9 }}>{a.cat || a.category}</div>
              </div>
              <div className="p-2.5">
                <p className="font-syne text-xs font-bold text-t1 leading-snug mb-2">{a.title}</p>
                <div className="flex justify-between items-center">
                  <span className="text-t3 text-xs">{a.min || a.reads} {a.min ? 'นาที' : 'อ่าน'}</span>
                  <span className="text-xs text-acc font-bold">อ่านต่อ →</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {articles.length > 0 && <div className="flex justify-center gap-1.5 mb-4">
        {articles.map((_, i) => (
          <button key={i} onClick={() => { setSlideIdx(i); resetTimer() }}
            className="h-1.5 rounded-full transition-all border-none cursor-pointer"
            style={{ width: slideIdx === i ? 14 : 6, background: slideIdx === i ? 'var(--acc)' : 'var(--brd2)' }} />
        ))}
      </div>}

      <BottomNav />
    </div>
  )
}
