// Server-side auth helpers สำหรับ API routes
// verifyToken   — ตรวจ Firebase ID token จาก Authorization header
// requireStaff  — ตรวจว่า caller เป็น staff คนใดก็ได้ (admin หรือ mech)
// requireAdmin  — ตรวจว่า caller เป็น staff role=admin เท่านั้น
import { getAdmin } from '@/lib/firebase/admin'

export async function verifyToken(request) {
  const token = request.headers.get('Authorization')?.split('Bearer ')[1]
  if (!token) return null
  try {
    const { auth } = await getAdmin()
    return await auth.verifyIdToken(token)
  } catch { return null }
}

export async function requireStaff(request) {
  const decoded = await verifyToken(request)
  if (!decoded) return null
  const { db } = await getAdmin()
  con