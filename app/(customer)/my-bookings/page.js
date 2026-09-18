'use client'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { useBookings, BOOKING_STATUS_LABEL } from '@/hooks/useBookings'
import BottomNav from '@/components/customer/BottomNav'
import AppIcon from '@/components/common/AppIcon'

function BookingCard({ booking }) {
  const label = BOOKING_STATUS_LABEL[booking.status] || { text: booking.status, color: 'var(--t2)' }
  const canCancel = ['pending', 'confirmed'].includes(booking.status)

  return (
    <Link href={`/my-bookings/${booking.id}`} className="block">
      <div className="bg-surf hover:bg-s2/70 rounded-3xl border border-token p-4 cursor-pointer active:opacity-80 transition-all shadow-xs hover:border-acc">
        {/* Top row */}
        <div className="flex justify-between items-start mb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-adim border border-acc flex items-center justify-center flex-shrink-0">
              <AppIcon name="book" size={20} />
            </div>
            <div>
              <p className="font-syne text-sm font-bold text-t1">{booking.bookingRef}</p>
              <p className="text-xs text-t2 mt-0.5">{booking.date} · {booking.time} น.</p>
            </div>
          </div>
          <span
            className="text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 shadow-xs"
            style={{ background: label.color + '22', color: label.color, border: `0.5px solid ${label.color}55` }}
          >
            {label.text}
          </span>
        </div>

        {/* Car + service */}
        <div className="flex gap-3 items-center pt-2.5 border-t border-token">
          <div className="w-8 h-8 bg-s2 rounded-xl flex items-center justify-center flex-shrink-0">
            <AppIcon name="car" size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-t1 truncate">{booking.carPlate} {booking.carName ? `· ${booking.carName}` : ''}</p>
            <p className="text-[11px] text-t3 mt-0.5 truncate">{(booking.serviceType || []).join(', ')}</p>
          </div>
          {canCancel && (
            <span className="text-[11px] text-err font-semibold flex-shrink-0 bg-errdim px-2 py-0.5 rounded-md border border-err/20">
              ยกเลิกได้
            </span>
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
      <div className="page-container pb-24 md:pb-12 pt-2 md:pt-4">
        <div className="page-header px-4 md:px-0"><h1 className="page-title">คิวของฉัน</h1></div>
        <div className="flex justify-center pt-20">
          <span className="inline-block w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: 'var(--acc)', borderTopColor: 'transparent' }} />
        </div>
      </div>
    )
  }

  const allEmpty = upcoming.length === 0 && active.length === 0 && past.length === 0

  return (
    <div className="page-container pb-24 md:pb-12 pt-2 md:pt-4 px-4 md:px-0">
      <div className="page-header px-0 mb-3 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Link href="/home" className="back-btn">‹</Link>
          <h1 className="page-title text-base md:text-xl font-bold">คิวของฉัน</h1>
        </div>
        <Link
          href="/book"
          className="text-xs text-white font-bold bg-acc hover:opacity-90 px-3.5 py-1.5 rounded-xl shadow-xs transition-opacity"
        >
          + จองคิวใหม่
        </Link>
      </div>

      {allEmpty ? (
        <div className="flex flex-col items-center justify-center pt-20 px-8 text-center bg-surf/50 rounded-3xl border border-dashed border-token p-10 max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-3xl bg-s2 flex items-center justify-center mb-4">
            <AppIcon name="book" size={36} />
          </div>
          <p className="font-syne text-base font-bold text-t1 mb-2">ยังไม่มีการจองคิว</p>
          <p className="text-xs text-t2 mb-6 leading-relaxed">จองคิวรับบริการล่วงหน้าเพื่อความสะดวกและรวดเร็ว</p>
          <Link href="/book" className="btn-primary px-8 py-3 rounded-2xl text-sm text-white max-w-xs shadow-md">
            จองคิวรับบริการตอนนี้
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {/* กำลังซ่อม */}
          {active.length > 0 && (
            <div>
              <div className="flex items-center gap-2 pb-2.5">
                <div className="w-2.5 h-2.5 rounded-full animate-ping bg-acc" />
                <span className="font-syne text-xs md:text-sm font-bold text-t1 uppercase tracking-wider">
                  กำลังรับการซ่อม ({active.length})
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {active.map((b) => <BookingCard key={b.id} booking={b} />)}
              </div>
            </div>
          )}

          {/* คิวที่รออยู่ */}
          {upcoming.length > 0 && (
            <div>
              <p className="font-syne text-xs md:text-sm font-bold text-t2 uppercase tracking-wider pb-2.5">
                คิวที่รออยู่ ({upcoming.length})
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {upcoming.map((b) => <BookingCard key={b.id} booking={b} />)}
              </div>
            </div>
          )}

          {/* ประวัติการจอง */}
          {past.length > 0 && (
            <div>
              <p className="font-syne text-xs md:text-sm font-bold text-t3 uppercase tracking-wider pb-2.5">
                ประวัติการจองที่ผ่านมา ({past.length})
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {past.map((b) => <BookingCard key={b.id} booking={b} />)}
              </div>
            </div>
          )}
        </div>
      )}

      <BottomNav />
    </div>
  )
}
