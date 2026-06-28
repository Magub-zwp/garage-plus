// lib/api/authFetch.js
// fetch ฝั่ง client ที่แนบ Firebase ID token ให้อัตโนมัติ — ใช้เรียก API ที่ต้องล็อกอิน
import { auth } from '@/lib/firebase/config'

export async function authFetch(url, options = {}) {
  const user = auth.currentUser
  if (!user) throw new Error('NOT_AUTHENTICATED')
  const token = await user.getIdToken()
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  })
}
