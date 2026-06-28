import { NextResponse } from 'next/server'
import { getAdmin } from '@/lib/api/verifyAuth'

// ช่วงเวลาเปิดรับจอง (ไม่มี 12:00 พักเที่ยง) — แต่ละช่วงรับ 1 คัน
const DEFAULT_TIMES = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00']

/**
 * GET /api/slots?date=YYYY-MM-DD
 * คืนสถานะคิวว่างของวันนั้น (อ่านผ่าน Admin SDK — server ไม่มี auth context จึงใช้ client SDK ไม่ได้)
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 })
  }

  try {
    const { db } = await getAdmin()
    const snap = await db.doc(`slots/${date}`).get()
    const slotData = snap.exists ? snap.data() : {}

    const slots = DEFAULT_TIMES.map((time) => {
      const s = slotData[time] || { booked: 0, max: 1 }
      return { time, booked: s.booked, max: s.max, available: s.max - s.booked, isFull: s.booked >= s.max }
    })

    return NextResponse.json({ date, slots })
  } catch (err) {
    console.error('[GET /api/slots]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
