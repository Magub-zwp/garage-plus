// lib/api/verifyAuth.js
// ตัวช่วยฝั่ง server: init Admin SDK ที่เดียว + ตรวจสิทธิ์จาก ID token ที่ client แนบมา
// ใช้แทนการ copy โค้ด init admin ซ้ำในหลาย route

import { NextResponse } from 'next/server'

let _cache = null

// init Firebase Admin SDK ครั้งเดียวแล้ว reuse (กัน init ซ้ำตอน hot reload)
export async function getAdmin() {
  if (_cache) return _cache
  const { initializeApp, getApps, cert } = await import('firebase-admin/app')
  const { getAuth }      = await import('firebase-admin/auth')
  const { getFirestore } = await import('firebase-admin/firestore')

  if (!getApps().length) {
    const cfg = process.env.FIREBASE_ADMIN_PRIVATE_KEY
      ? { credential: cert({
            projectId:   process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
            privateKey:  process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
          }) }
      : { projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID }
    initializeApp(cfg)
  }
  _cache = { auth: getAuth(), db: getFirestore() }
  return _cache
}

// error ที่มี .status ไว้ให้ route จับแล้วตอบ HTTP code ตรงๆ
class AuthError extends Error {
  constructor(status, message) { super(message); this.status = status }
}
export { AuthError }

// อ่าน Bearer token จาก header แล้ว verify → คืน decoded token (มี uid)
export async function verifyToken(request) {
  const header = request.headers.get('authorization') || ''
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) throw new AuthError(401, 'ไม่ได้แนบ token')
  const { auth } = await getAdmin()
  try {
    return await auth.verifyIdToken(token)
  } catch {
    throw new AuthError(401, 'token ไม่ถูกต้องหรือหมดอายุ')
  }
}

// ต้องเป็น staff (admin หรือ mechanic) — คืน { decoded, role }
export async function requireStaff(request) {
  const decoded = await verifyToken(request)
  const { db } = await getAdmin()
  const snap = await db.doc(`staff/${decoded.uid}`).get()
  const role = snap.exists ? snap.data().role : null
  if (!['admin', 'mechanic'].includes(role)) throw new AuthError(403, 'ต้องเป็นพนักงาน')
  return { decoded, role }
}

// ต้องเป็น admin เท่านั้น
export async function requireAdmin(request) {
  const decoded = await verifyToken(request)
  const { db } = await getAdmin()
  const snap = await db.doc(`staff/${decoded.uid}`).get()
  if (!snap.exists || snap.data().role !== 'admin') throw new AuthError(403, 'ต้องเป็นแอดมิน')
  return { decoded }
}

// แปลง AuthError เป็น NextResponse (ใช้ใน catch ของแต่ละ route)
export function authErrorResponse(err) {
  if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
  return null
}
