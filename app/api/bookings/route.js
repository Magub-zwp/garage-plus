import { NextResponse } from 'next/server'
import { getAdmin, verifyToken, authErrorResponse } from '@/lib/api/verifyAuth'

/**
 * POST /api/bookings — สร้างการจอง (ทำผ่าน Admin SDK + transaction บน server)
 * userId มาจาก token เท่านั้น และ slot ถูกจองแบบ atomic กัน race condition
 */
export async function POST(request) {
  try {
    const { uid } = await verifyToken(request)
    const body = await request.json()
    const { date, time, carId } = body
    if (!date || !time || !carId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { db } = await getAdmin()
    const slotRef    = db.doc(`slots/${date}`)
    const bookingRef = db.collection('bookings').doc()
    const now = new Date()

    await db.runTransaction(async (tx) => {
      const slotSnap = await tx.get(slotRef)
      const slotData = slotSnap.exists ? slotSnap.data() : {}
      const slot = slotData[time] || { booked: 0, max: 1 }
      if (slot.booked >= slot.max) throw new Error('SLOT_FULL')

      // เพิ่มจำนวนจองของช่วงเวลานั้น (+1)
      tx.set(slotRef, { [time]: { booked: slot.booked + 1, max: slot.max }, updatedAt: now }, { merge: true })
      tx.set(bookingRef, {
        ...body,
        userId: uid,
        status: 'pending',
        bookingRef: `#BK${Date.now().toString().slice(-6)}`,
        repairId: null,
        cancelReason: '',
        cancelledAt: null,
        createdAt: now,
        updatedAt: now,
      })
    })

    return NextResponse.json({ bookingId: bookingRef.id }, { status: 201 })
  } catch (err) {
    const authErr = authErrorResponse(err)
    if (authErr) return authErr
    if (err.message === 'SLOT_FULL') {
      return NextResponse.json({ error: 'SLOT_FULL', message: 'คิวเต็มแล้ว กรุณาเลือกเวลาอื่น' }, { status: 409 })
    }
    console.error('[POST /api/bookings]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
