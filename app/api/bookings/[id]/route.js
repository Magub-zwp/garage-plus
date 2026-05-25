import { NextResponse } from 'next/server'
import { getBooking, cancelBooking } from '@/lib/firebase/firestore'

/**
 * GET    /api/bookings/[id]              — booking detail
 * PATCH  /api/bookings/[id]  { action: 'cancel', reason: '...' }
 */
export async function GET(request, { params }) {
  try {
    const booking = await getBooking(params.id)
    if (!booking) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
    return NextResponse.json({ booking })
  } catch (err) {
    console.error('[GET /api/bookings/[id]]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(request, { params }) {
  try {
    const { action, reason } = await request.json()

    if (action === 'cancel') {
      await cancelBooking(params.id, reason || '')
      return NextResponse.json({ success: true, message: 'ยกเลิกการจองสำเร็จ' })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err) {
    if (err.message === 'CANNOT_CANCEL') {
      return NextResponse.json({ error: 'CANNOT_CANCEL', message: 'ไม่สามารถยกเลิกได้ในขณะนี้' }, { status: 400 })
    }
    if (err.message === 'BOOKING_NOT_FOUND') {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
    }
    console.error('[PATCH /api/bookings/[id]]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
