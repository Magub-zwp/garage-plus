'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import DashboardShell from '@/components/staff/DashboardShell'
import { db } from '@/lib/firebase/config'
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'

const STATUS_OPTS = [
  { value: 'pending',   label: 'รอยืนยัน',    color: 'var(--t2)'  },
  { value: 'confirmed', label: 'ยืนยันแล้ว',   color: 'var(--grn)' },
  { value: 'cancelled', label: 'ยกเลิก',        color: 'var(--err)' },
]

export default function BookingDetailPage() {
  const { bookingId } = useParams()
  const router        = useRouter()
  const [booking,   setBooking]   = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [msg,       setMsg]       = useState('')
  const [newStatus, setNewStatus] = useState('')

  useEffect(() => {
    if (!bookingId) return
    getDoc(doc(db, 'bookings', bookingId))
      .then(snap => {
        if (snap.exists()) {
          const data = { id: snap.id, ...snap.data() }
          setBooking(data)
          setNewStatus(data.status)
        }
      })
      .finally(() => setLoading(false))
  }, [bookingId])
// Function to handle status update and notify customer
  const handleUpdate = async () => {
    if (!booking || newStatus === booking.status) return
    setSaving(true); setMsg('')
    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        status:    newStatus,
        updatedAt: serverTimestamp(),
      })

      
      // จะ trigger อัตโนมัติเมื่อ Firestore document เปลี่ยน ไม่ต้อง call ซ้ำ
      setBooking(prev => ({ ...prev, status: newStatus }))
      setMsg('✅ อัปเดตสถานะแล้ว (ลูกค้าจะได้รับแจ้งเตือนอัตโนมัติ)')
    } catch (e) {
      setMsg(`❌ ${e.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <DashboardShell requiredRole="admin">
      <div className="flex items-center gap-3 mb-5">
        <Link href="/staff/queue" className="text-t2 text-sm">‹ กลับ</Link>
        <h1 className="font-syne text-xl font-bold text-t1">รายละเอียดการจอง</h1>
      </div>

      {loading ? (
        <div className="flex justify-center pt-20">
          <span className="inline-block w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: 'var(--acc)', borderTopColor: 'transparent' }} />
        </div>
      ) : !booking ? (
        <div className="card p-10 text-center text-t2">ไม่พบข้อมูลการจอง</div>
      ) : (
        <div className="max-w-lg flex flex-col gap-4">
          <div className="card p-5">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="font-syne text-base font-bold text-t1">{booking.bookingRef}</p>
                <p className="text-xs text-t2 mt-0.5">{booking.date} · {booking.time} น.</p>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full"
                style={{ background: 'var(--adim)', color: 'var(--acc)', border: '0.5px solid var(--abrd)' }}>
                {booking.status}
              </span>
            </div>

            {[
              ['ลูกค้า', booking.customerName || booking.userId || '-'],
              ['รถ', `${booking.carName || ''} ${booking.carPlate || booking.plate || ''}`],
              ['ประเภทบริการ', (booking.serviceType || []).join(', ')],
              ['รับรถ', booking.pickupType === 'pickup' ? 'รับถึงบ้าน' : 'มาเอง'],
              ['หมายเหตุ', booking.note || '-'],
            ].map(([k, v]) => (
              <div key={k} className="flex gap-3 py-2" style={{ borderBottom: '0.5px solid var(--brd)' }}>
                <span className="text-xs text-t2 w-24 flex-shrink-0">{k}</span>
                <span className="text-xs font-medium text-t1 flex-1">{v}</span>
              </div>
            ))}
          </div>

          <div className="card p-5">
            <h3 className="font-syne text-sm font-bold text-t1 mb-3">เปลี่ยนสถานะ</h3>
            <div className="flex flex-col gap-2 mb-4">
              {STATUS_OPTS.map(opt => (
                <button key={opt.value}
                  onClick={() => setNewStatus(opt.value)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer border-none text-left"
                  style={{ background: newStatus === opt.value ? 'var(--adim)' : 'var(--s2)', border: `0.5px solid ${newStatus === opt.value ? 'var(--abrd)' : 'var(--brd)'}` }}>
                  <div className="w-3 h-3 rounded-full" style={{ background: opt.color }} />
                  <span className="text-sm font-semibold text-t1">{opt.label}</span>
                  {newStatus === opt.value && <span className="ml-auto text-acc text-sm">✓</span>}
                </button>
              ))}
            </div>

            {msg && (
              <div className="mb-3 p-3 rounded-xl text-xs"
                style={{
                  background: msg.startsWith('✅') ? 'var(--gdim)' : msg.startsWith('⚠️') ? 'var(--adim)' : 'var(--errdim)',
                  color:      msg.startsWith('✅') ? 'var(--grn)'  : msg.startsWith('⚠️') ? 'var(--acc)'  : 'var(--err)',
                }}>
                {msg}
              </div>
            )}

            <button
              onClick={handleUpdate}
              disabled={saving || newStatus === booking.status}
              className="w-full py-3 rounded-xl text-sm font-bold text-white border-none cursor-pointer flex items-center justify-center gap-2"
              style={{ background: newStatus === booking.status ? 'var(--s3)' : 'var(--acc)', color: newStatus === booking.status ? 'var(--t3)' : '#fff' }}>
              {saving
                ? <><span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />กำลังบันทึก...</>
                : newStatus === booking.status ? 'ยังไม่มีการเปลี่ยนแปลง' : 'บันทึก + แจ้งเตือนลูกค้า'}
            </button>
          </div>

          <Link href="/staff/repairs" className="text-xs text-acc font-semibold text-center block">
            → เปิดหน้างานซ่อมเพื่ออัปเดตสถานะซ่อม
          </Link>
        </div>
      )}
    </DashboardShell>
  )
}
