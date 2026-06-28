import { NextResponse } from 'next/server'
import { db } from '@/lib/firebase/config'
import { doc, getDoc } from 'firebase/firestore'

const DEFAULT_TIMES = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00']

/**
 * GET /api/slots?date=2025-04-03
 * Returns slot availability for a given date
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date') // 'YYYY-MM-DD'

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 })
  }

  try {
    const snap = await getDoc(doc(db, 'slots', date))
    const slotData = snap.exists()
      ? snap.data()
      : Object.fromEntries(DEFAULT_TIMES.map((t) => [t, { booked: 0, max: 1 }]))

    // Format response
    const slots = DEFAULT_TIMES.map((time) => {
      const s = slotData[time] || { booked: 0, max: 1 }
      return {
        time,
        booked:    s.booked,
        max:       s.max,
        available: s.max - s.booked,
        isFull:    s.booked >= s.max,
      }
    })

    return NextResponse.json({ date, slots })
  } catch (err) {
    console.error('[GET /api/slots]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
