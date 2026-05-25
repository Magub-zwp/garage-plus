'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthContext } from '@/context/AuthContext'


// เปลี่ยนเป็น redirect ทันทีพอ auth พร้อม โดยไม่มี delay
export default function CustomerIndexPage() {
  const router = useRouter()
  const { loading, isLoggedIn } = useAuthContext()

  useEffect(() => {
    if (loading) return
    router.replace(isLoggedIn ? '/home' : '/login')
  }, [loading, isLoggedIn, router])

  // แสดง minimal loading แทน splash เต็ม เพื่อไม่ให้ซ้อนกับ app/page.js
  return (
    <div className="min-h-screen bg-token flex items-center justify-center">
      <span className="inline-block w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
        style={{ borderColor: 'var(--acc)', borderTopColor: 'transparent' }} />
    </div>
  )
}
