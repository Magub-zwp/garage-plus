'use client'
import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { BOOKING_STATUS_LABEL } from '@/hooks/useBookings'
import { getBooking, cancelBooking } from '@/lib/firebase/firestore'
import BottomNav from '@/components/customer/BottomNav'

export default function BookingDetailPage({ params }) {
  // Next.js 15+ — unwrap async params with React.use()
  const { id } = use(params)
  const router = useRouter()
  const { uid } = useAuth()
  const [booking,    setBooking]    = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [showConfirm,setShowConfirm]= useState(false)
  const [cancelReason,setCancelReason]=useState('')
  const [error,      setError]      = useState('')

  useEffect(() => {
    if (!id || !uid) return
    getBooking(id)
      .then(b => {
        // ตรวจ ownership — ป้องกัน user A เข้าดู booking ของ user B
        if (!b || b.userId !== uid) { setLoading(false); return }
        setBooking(b)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id, uid])

  const canCancel = booking && ['pending','confirmed'].includes(booking.status)
  
  const handleCancel = async () => {
    setCancelling(true); setError('')
    try {
      await cancelBooking(id, cancelReason)
      setShowConfirm(false)
      setBooking(prev => ({ ...prev, status:'cancelled' }))
    } catch(e) {
      setError(e.message === 'CANNOT_CANCEL' ? 'ไม่สามารถยกเลิกได้ในขณะนี้' : 'เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally { setCancelling(false) }
  }
  
  if (loading) return (
    <div className="page-container pb-24">
      <div className="page-header"><Link href="/my-bookings" className="back-btn">‹</Link><h1 className="page-title">รายละเอียดการจอง</h1></div>
      <div className="flex justify-center pt-20"><span className="inline-block w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor:'var(--acc)',borderTopColor:'transparent' }} /></div>
    </div>
  )

  if (!booking) return (
    <div className="page-container pb-24">
      <div className="page-header"><Link href="/my-bookings" className="back-btn">‹</Link><h1 className="page-title">ไม่พบการจองนี้</h1></div>
      <BottomNav />
    </div>
  )

  const label = BOOKING_STATUS_LABEL[booking.status] || { text:booking.status, color:'var(--t2)' }

  return (
    <div className="page-container pb-24">
      <div className="page-header">
        <Link href="/my-bookings" className="back-btn">‹</Link>
        <h1 className="page-title">รายละเอียดการจอง</h1>
      </div>

      {/* Status badge */}
      <div className="mx-4 mb-3 flex items-center justify-between p-4 bg-surf rounded-2xl border-token">
        <div>
          <p className="font-syne text-base font-bold text-t1">{booking.bookingRef}</p>
          <p className="text-xs text-t2 mt-1">สร้างเมื่อ {booking.createdAt?.toDate?.()?.toLocaleDateString('th-TH') || '-'}</p>
        </div>
        <span className="text-sm font-bold px-3 py-1.5 rounded-full"
          style={{ background:label.color+'22', color:label.color, border:`0.5px solid ${label.color}55` }}>
          {label.text}
        </span>
      </div>

      {/* Booking details */}
      <div className="mx-4 mb-3 bg-surf rounded-2xl border-token p-4">
        {[
          { label:'วันที่',         value: booking.date },
          { label:'เวลา',           value: `${booking.time} น.` },
          { label:'ทะเบียนรถ',      value: booking.carPlate || '-' },
          { label:'ประเภทงานซ่อม',  value: (booking.serviceType||[]).join(', ') },
          { label:'ประเภทบริการ',   value: booking.pickupType === 'pickup' ? '🏠 รับรถถึงบ้าน' : '🏪 นำรถมาเอง' },
          booking.note ? { label:'หมายเหตุ', value:booking.note } : null,
        ].filter(Boolean).map(row => (
          <div key={row.label} className="flex justify-between py-2" style={{ borderBottom:'0.5px solid var(--brd)' }}>
            <span className="text-xs text-t2">{row.label}</span>
            <span className="text-xs font-semibold text-t1 text-right max-w-48">{row.value}</span>
          </div>
        ))}
      </div>

      {booking.status === 'cancelled' && booking.cancelReason && (
        <div className="mx-4 mb-3 p-3 rounded-2xl text-xs text-err"
          style={{ background:'var(--errdim)', border:'0.5px solid rgba(232,92,58,.25)' }}>
          <p className="font-semibold mb-1">เหตุผลการยกเลิก:</p>
          <p>{booking.cancelReason}</p>
        </div>
      )}

      {booking.status === 'repairing' && (
        <Link href="/status" className="mx-4 mb-3 flex items-center justify-between p-4 rounded-2xl"
          style={{ background:'var(--adim)', border:'0.5px solid var(--abrd)' }}>
          <div>
            <p className="text-xs text-t2">รถอยู่ในอู่แล้ว</p>
            <p className="text-sm font-bold text-acc mt-0.5">ดูสถานะงานซ่อม →</p>
          </div>
          <span className="text-acc text-xl">›</span>
        </Link>
      )}

      {error && (
        <div className="mx-4 mb-3 p-3 rounded-xl text-xs text-err"
          style={{ background:'var(--errdim)', border:'0.5px solid rgba(232,92,58,.25)' }}>
          ⚠️ {error}
        </div>
      )}

      {canCancel && (
        <div className="px-4 mb-6">
          <button className="w-full py-3.5 rounded-2xl text-sm font-bold cursor-pointer border-none"
            style={{ background:'var(--errdim)', color:'var(--err)', border:'0.5px solid rgba(232,92,58,.3)' }}
            onClick={() => setShowConfirm(true)}>
            ยกเลิกการจอง
          </button>
          <p className="text-center text-xs text-t3 mt-2">ยกเลิกได้ก่อนถึงวันนัดอย่างน้อย 2 ชั่วโมง</p>
        </div>
      )}

      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-6">
          <div className="bg-surf rounded-3xl p-6 w-full max-w-sm">
            <div className="text-3xl text-center mb-3">🗑</div>
            <h3 className="font-syne text-base font-bold text-t1 text-center mb-2">ยืนยันยกเลิกการจอง?</h3>
            <p className="text-xs text-t2 text-center leading-relaxed mb-4">
              {booking.bookingRef} · {booking.date} {booking.time} น.<br/>
              slot นี้จะถูก release ให้คนอื่นจองได้ทันที
            </p>
            <div className="mb-4">
              <label className="field-label">เหตุผล (ไม่บังคับ)</label>
              <input className="input-field" placeholder="เช่น ติดธุระด่วน"
                value={cancelReason} onChange={e => setCancelReason(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <button className="flex-1 py-3 bg-s2 rounded-2xl text-sm font-semibold text-t1 border-none cursor-pointer"
                onClick={() => setShowConfirm(false)}>ไม่ยกเลิก</button>
              <button className="flex-1 py-3 rounded-2xl text-sm font-bold text-white border-none cursor-pointer flex items-center justify-center gap-2"
                style={{ background:'var(--err)' }} onClick={handleCancel} disabled={cancelling}>
                {cancelling
                  ? <><span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>กำลังยกเลิก...</>
                  : 'ยืนยันยกเลิก'}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
