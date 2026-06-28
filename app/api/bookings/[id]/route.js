import { NextResponse } from 'next/server'
import { getAdmin, verifyToken, authErrorResponse } from '@/lib/api/verifyAuth'

/**
 * PATCH /api/bookings/[id]  { action: 'cancel', reason }
 * ยกเลิกการจอง + คืน slot แบบ atomic — เจ้าของการจองเท่านั้น
 */
export async function PATCH(request, { params }) {
  try {
    const { uid } = await verifyToken(request)
    const { action, reason } = await request.json()
    if (action !== 'cancel') return NextResponse.json({ error: 'Unknown action' }, { status: 400 })

    const { db } = await getAdmin()
    const ref = db.doc(`bookings/${params.id}`)
    const now = new Date()

    await db.runTransaction(async (tx) => {
      // อ่านทั้งหมดก่อนเขียน (ข้อบังคับของ Firestore transaction)
      const snap = await tx.get(ref)
      if (!snap.exists) throw new Error('NOT_FOUND')
      const b = snap.data()
      if (b.userId !== uid) throw new Error('FORBIDDEN')                 // กันยกเลิกคิวคนอื่น
      if (!['pending', 'confirmed'].includes(b.status)) throw new Error('CANNOT_CANCEL')

      const slotRef  = db.doc(`slots/${b.date}`)
      const slotSnap = await tx.get(slotRef)

      tx.update(ref, { status: 'cancelled', cancelReason: reason || '', cancelledAt: now, updatedAt: now })
      // คืน slot ที่จองไว้ (-1) ถ้ามี
      const cur = slotSnap.exists ? slotSnap.data()[b.time] : null
      if (cur) tx.set(slotRef, { [b.time]: { booked: Math.max(0, cur.booked - 1), max: cur.max }, updatedAt: now }, { merge: true })
    })

    return NextResponse.json({ success: true, message: 'ยกเลิกการจองสำเร็จ' })
  } catch (err) {
    const authErr = authErrorResponse(err)
    if (authErr) return authErr
    const map = {
      NOT_FOUND:     ['NOT_FOUND', 404],
      FORBIDDEN:     ['ไม่มีสิทธิ์ยกเลิกการจองนี้', 403],
      CANNOT_CANCEL: ['ไม่สามารถยกเลิกได้ในขณะนี้', 400],
    }
    if (map[err.message]) {
      const [msg, status] = map[err.message]
      return NextResponse.json({ error: err.message, message: msg }, { status })
    }
    console.error('[PATCH /api/bookings/[id]]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
