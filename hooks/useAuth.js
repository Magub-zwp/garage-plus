'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthContext } from '@/context/AuthContext'

/**
 * useAuth — ใช้ใน customer page ที่ต้องการ authentication
 * redirect ไป /login ถ้ายังไม่ login
 */
export function useAuth() {
  const ctx    = useAuthContext()
  const router = useRouter()

  useEffect(() => {
    if (!ctx.loading && !ctx.isLoggedIn) {
      router.replace('/login')
    }
  }, [ctx.loading, ctx.isLoggedIn, router])

  return ctx
}

/**
 * useGuestOnly — ใช้ใน login/signup
 * redirect ออกจากหน้า login ถ้า login อยู่แล้ว
 * - ถ้ามี staff session → ไป /staff/dashboard
 * - ถ้าเป็น customer → ไป /home
 */
export function useGuestOnly() {
  const ctx    = useAuthContext()
  const router = useRouter()

  useEffect(() => {
    if (!ctx.loading && ctx.isLoggedIn) {
      // เช็ค staff session ก่อน
      try {
        const hasStaffSession = !!localStorage.getItem('gp_staff')
        if (hasStaffSession) {
          const session = JSON.parse(localStorage.getItem('gp_staff'))
          router.replace(session?.role === 'admin' ? '/staff/dashboard' : '/staff/mech/queue')
          return
        }
      } catch {}
      router.replace('/home')
    }
  }, [ctx.loading, ctx.isLoggedIn, router])

  return ctx
}
