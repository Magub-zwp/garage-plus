import { NextResponse } from 'next/server'
import { db } from '@/lib/firebase/config'
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore'
import { createBooking } from '@/lib/firebase/firestore'

/**
 * GET /api/bookings — list user's bookings
 * POST /api/bookings — create booking (with Transaction)
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  try {
    const q = query(
      collection(db, 'bookings'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    )
    const snap = await getDocs(q)
    const bookings = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    return NextResponse.json({ bookings })
  } catch (err) {
    console.error('[GET /api/bookings]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { userId, date, time, carId, carPlate, carName, serviceType, pickupType, note } = body

    if (!userId || !date || !time || !carId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const bookingId = await createBooking(userId, {
      date, time, carId, carPlate, carName, serviceType, pickupType, note,
    })

    return NextResponse.json({ bookingId }, { status: 201 })
  } catch (err) {
    if (err.message === 'SLOT_FULL') {
      return NextResponse.json({ error: 'SLOT_FULL', message: 'คิวเต็มแล้ว กรุณาเลือกเวลาอื่น' }, { status: 409 })
    }
    console.error('[POST /api/bookings]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
