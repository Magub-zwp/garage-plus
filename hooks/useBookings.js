'use client'
import { useEffect, useState } from 'react'
import { listenUserBookings } from '@/lib/firebase/firestore'
import { db } from '@/lib/firebase/config'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { useAuthContext } from '@/context/AuthContext'

// label และสี สำหรับแสดงสถานะการจองในภาษาไทย — ใช้ร่วมกันทุกหน้าที่โชว์รายการจอง
export const BOOKING_STATUS_LABEL = {
  pending:   { text: 'รอยืนยัน',    color: 'var(--blue)' },
  confirmed: { text: 'ยืนยันแล้ว',  color: 'var(--grn)'  },
  repairing: { text: 'กำลังซ่อม',   color: 'var(--acc)'  },
  done:      { text: 'เสร็จแล้ว',   color: 'var(--grn)'  },
  cancelled: { text: 'ยกเลิกแล้ว',  color: 'var(--err)'  },
}

export function useBookings() {
  const { uid }               = useAuthContext()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    if (!uid) { setBookings([]); setLoading(false); return }
    const unsub = listenUserBookings(uid, (b) => { setBookings(b); setLoading(false) })
    return () => unsub()
  }, [uid])

  // ยกเลิกอัตโนมัติสำหรับคิวที่เลยเวลานัด (เกิน 30 นาที) และยัง pending/confirmed
  useEffect(() => {
    if (!bookings || bookings.length === 0) return
    const now = new Date()
    bookings.forEach(async (b) => {
      if (b.status === 'pending' || b.status === 'confirmed') {
        const bTime = new Date(`${b.date}T${b.time}:00`)
        bTime.setMinutes(bTime.getMinutes() + 30) // เลท 30 นาที
        if (now > bTime) {
          try {
            await updateDoc(doc(db, 'bookings', b.id), {
              status: 'cancelled',
              cancelReason: 'ไม่มาตามนัด / เลยเวลานัด (อัตโนมัติ)',
              updatedAt: serverTimestamp()
            })
          } catch (e) {
            console.error('Auto cancel failed:', e)
          }
        }
      }
    })
  }, [bookings])

  // แบ่งรายการจองออกเป็น 3 กลุ่มให้หน้า my-bookings ใช้แสดงผล
  const upcoming = bookings.filter((b) =>
    // รวม awaiting_approval ด้วย ไม่งั้นคิวที่รออนุมัติจะหายจากรายการที่กำลังจะถึง
    ['pending', 'confirmed', 'awaiting_approval'].includes(b.status)
  )
  const active = bookings.filter((b) => b.status === 'repairing') // กำลังซ่อมอยู่ตอนนี้
  const past   = bookings.filter((b) => ['done', 'cancelled'].includes(b.status)) // ประวัติ

  return { bookings, upcoming, active, past, loading }
}
