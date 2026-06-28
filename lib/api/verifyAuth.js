// Server-side auth helpers สำหรับ API routes
// verifyToken — ตรวจ Firebase ID token จาก Authorization header
// requireAdmin — ตรวจเพิ่มว่า caller เป็น staff role=admin
import { getAdmin } from '@/lib/firebase/admin'

export async function verifyToken(request) {
  const token = request.headers.get('Authorization')?.split('Bearer ')[1]
  if (!token) return null
  try {
    const { auth } = await getAdmin()
    return await auth.verifyIdToken(token)
  } catch { return null }
}

export async function requireAdmin(request) {
  const decoded = await verifyToken(request)
  if (!decoded) return null
  const { db } = await getAdmin()
  const snap = await db.doc(`staff/${decoded.uid}`).get()
  if (!snap.exists || snap.data().role !== 'admin') return null
  return decoded
}
