'use client'
import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { getBooking } from '@/lib/firebase/firestore'

export default function BookSuccessPage() {
  return (
    <Suspense fallback={null}>
      <BookSuccessContent />
    </Suspense>
  )
}

function BookSuccessContent() {
  useAuth()
  const params  = useSearchParams()
  const id      = params.get('id')
  const [booking, setBooking] = useState(null)

  useEffect(() => {
    if (id) getBooking(id).then(setBooking)
  }, [id])
  
  const rows = booking ? [
    { k: 'วันที่',        v: booking.date },
    { k: 'เวลา',          v: `${booking.time} น.` },
    { k: 'รถ',            v: booking.carName || booking.carPlate },
    { k: 'งานซ่อม',      v: (booking.serviceType || []).join(', ') },
    { k: 'ประเภท',        v: booking.pickupType === 'pickup' ? '🏠 รับถึงบ้าน' : '🏪 นำรถมาเอง' },
    { k: 'เลขที่จอง',    v: booking.bookingRef, accent: true },
  ] : []

  return (
    <div className="min-h-screen bg-token flex flex-col items-center justify-center px-6 text-center">
      <div className="w-20 h-20 rounded-full flex items-center justify-center text-4xl mb-5"
        style={{ background: 'var(--gdim)', border: '2px solid var(--gbrd)' }}>
        ✓
      </div>
      <h1 className="font-syne text-2xl font-extrabold text-t1 mb-2">จองคิวสำเร็จ! 🎉</h1>
      <p className="text-sm text-t2 leading-relaxed mb-6">
        ระบบได้รับการจองของคุณแล้ว<br />คุณจะได้รับการแจ้งเตือนเมื่ออู่ยืนยัน
      </p>

      {booking && (
        <div className="w-full bg-surf rounded-3xl border-token p-4 mb-5 text-left">
          {rows.map((row) => (
            <div key={row.k} className="flex justify-between py-1.5"
              style={{ borderBottom: '0.5px solid var(--brd)' }}>
              <span className="text-xs text-t2">{row.k}</span>
              <span className="text-xs font-semibold"
                style={{ color: row.accent ? 'var(--acc)' : 'var(--t1)' }}>
                {row.v}
              </span>
            </div>
          ))}
          <div className="pt-2" />
        </div>
      )}

      <div className="w-full p-3 rounded-2xl mb-5 text-left"
        style={{ background: 'var(--adim)', border: '0.5px solid var(--abrd)' }}>
        <p className="text-xs text-t2 leading-relaxed">
          📌 <strong className="text-t1">โปรดมาถึงก่อนเวลา 15 นาที</strong><br />
          หากไม่สามารถมาได้ กรุณายกเลิกล่วงหน้าอย่างน้อย 2 ชั่วโมง
          ผ่านหน้า "คิวของฉัน" หรือโทร 053-XXX-XXX
        </p>
      </div>

      <Link href="/my-bookings"
        className="w-full py-4 rounded-2xl font-syne text-sm font-extrabold text-white mb-3 flex items-center justify-center"
        style={{ background: 'var(--acc)' }}>
        ดูคิวของฉันทั้งหมด
      </Link>
      <Link href="/status"
        className="w-full py-3 rounded-2xl text-sm font-semibold text-t1 mb-3 flex items-center justify-center"
        style={{ background: 'var(--surf)', border: '0.5px solid var(--brd2)' }}>
        ติดตามสถานะงานซ่อม
      </Link>
      <Link href="/home"
        className="text-sm text-t2">
        กลับหน้าหลัก
      </Link>
    </div>
  )
}
