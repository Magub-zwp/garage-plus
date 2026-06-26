'use client'
import { useEffect, useState } from 'react'
import { listenUserBookings } from '@/lib/firebase/firestore'
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

  // แบ่งรายการจองออกเป็น 3 กลุ่มให้หน้า my-bookings ใช้แสดงผล
  const upcoming = bookings.filter((b) =>
    ['pending', 'confirmed'].includes(b.status)  // รอยืนยัน / ยืนยันแล้ว → ยังไม่ถึงวัน
  )
  const active = bookings.filter((b) => b.status === 'repairing') // กำลังซ่อมอยู่ตอนนี้
  const past   = bookings.filter((b) => ['done', 'cancelled'].includes(b.status)) // ประวัติ

  return { bookings, upcoming, active, past, loading }
}
