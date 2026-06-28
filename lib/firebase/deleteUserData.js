// lib/firebase/deleteUserData.js
// ฝั่ง client ทำหน้าที่แค่ยิง API ไป server เท่านั้น
// (logic การลบจริงอยู่ที่ /api/users/delete ผ่าน Admin SDK — ทำฝั่ง client ไม่ได้)
import { authFetch } from '@/lib/api/authFetch'

export async function deleteAllUserData() {
  const res = await authFetch('/api/users/delete', { method: 'DELETE' })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || 'ลบข้อมูลไม่สำเร็จ')
  }
}
