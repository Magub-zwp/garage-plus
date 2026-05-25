'use client'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { useBookings, BOOKING_STATUS_LABEL } from '@/hooks/useBookings'
import BottomNav from '@/components/customer/BottomNav'

function BookingCard({ booking }) {
  const label = BOOKING_STATUS_LABEL[booking.status] || { text: booking.status, color: 'var(--t2)' }
  const canCancel = ['pending', 'confirmed'].includes(booking.status)

  return (
    <Link href={`/my-bookings/${booking.id}`}>
      <div className="mx-4 mb-2 bg-surf rounded-2xl border-token p-4 cursor-pointer active:opacity-80">
        {/* Top row */}
        <div className="flex justify-between items-start mb-2">
          <div>
            <p className="font-syne text-sm font-bold text-t1">{booking.bookingRef}</p>
            <p className="text-xs text-t2 mt-0.5">{booking.date} · {booking.time} น.</p>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0"
            style={{ background: label.color + '22', color: label.color, border: `0.5px solid ${label.color}55` }}>
            {label.text}
          </span>
        </div>

        {/* Car + service */}
        <div className="flex gap-3 items-center pt-2" style={{ borderTop: '0.5px solid var(--brd)' }}>
          <div className="w-8 h-8 bg-s2 rounded-xl flex items-center justify-center text-sm flex-shrink-0">🚗</div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-t1 truncate">{booking.carPlate}</p>
            <p className="text-xs text-t2 mt-0.5 truncate">{(booking.serviceType || []).join(', ')}</p>
          </div>
          {canCancel && (
            <span className="text-xs text-err font-semibold flex-shrink-0">ยกเลิกได้</span>
          )}
          <span className="text-t3 text-base flex-shrink-0">›</span>
        </div>
      </div>
    </Link>
  )
}

export default function MyBookingsPage() {
  useAuth()
  const { upcoming, active, past, loading } = useBookings()

  if (loading) {
    return (
      <div className="page-container pb-24">
        <div className="page-header"><h1 className="page-title">คิวของฉัน</h1></div>
        <div className="flex justify-center pt-20">
          <span className="inline-block w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: 'var(--acc)', borderTopColor: 'transparent' }} />
        </div>
      </div>
    )
  }

  const allEmpty = upcoming.length === 0 && active.length === 0 && past.length === 0

  return (
    <div className="page-container pb-24">
      <div className="page-header">
        <Link href="/home" className="back-btn">‹</Link>
        <h1 className="page-title">คิวของฉัน</h1>
        <Link href="/book" className="text-xs text-acc font-semibold">+ จองใหม่</Link>
      </div>

      {allEmpty ? (
        <div className="flex flex-col items-center justify-center pt-20 px-8 text-center">
          <span className="text-5xl mb-4">📅</span>
          <p className="font-syne text-base font-bold text-t1 mb-2">ยังไม่มีการจองคิว</p>
          <p className="text-xs text-t2 mb-6 leading-relaxed">จองคิวซ่อมรถล่วงหน้าเพื่อประหยัดเวลารอ</p>
          <Link href="/book" className="btn-primary px-6 py-3 rounded-2xl text-sm text-white"
            style={{ background: 'var(--acc)' }}>
            📅 จองคิวซ่อม
          </Link>
        </div>
      ) : (
        <>
          {/* กำลังซ่อม */}
          {active.length > 0 && (
            <>
              <div className="flex items-center gap-2 px-4 pb-2 pt-1">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--acc)' }} />
                <span className="font-syne text-xs font-bold text-t2 uppercase tracking-widest">กำลังซ่อม</span>
              </div>
              {active.map((b) => <BookingCard key={b.id} booking={b} />)}
            </>
          )}

          {/* คิวที่รออยู่ */}
          {upcoming.length > 0 && (
            <>
              <p className="font-syne text-xs font-bold text-t2 uppercase tracking-widest px-4 pb-2 pt-3">
                คิวที่รออยู่
              </p>
              {upcoming.map((b) => <BookingCard key={b.id} booking={b} />)}
            </>
          )}

          {/* ประวัติการจอง */}
          {past.length > 0 && (
            <>
              <p className="font-syne text-xs font-bold text-t2 uppercase tracking-widest px-4 pb-2 pt-3">
                ประวัติการจอง
              </p>
              {past.map((b) => <BookingCard key={b.id} booking={b} />)}
            </>
          )}
        </>
      )}

      <BottomNav />
    </div>
  )
}
