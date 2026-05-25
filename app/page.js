'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthContext } from '@/context/AuthContext'
import { getDefaultRoute } from '@/lib/firebase/auth'

export default function RootPage() {
  const { loading, isLoggedIn, uid } = useAuthContext()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (!isLoggedIn) { router.replace('/login'); return }

    getDefaultRoute(uid).then(route => {
      // ถ้า route ที่ได้เป็นของ staff แต่ไม่มี session แสดงว่าไม่ได้ล็อกอินผ่านระบบ staff ให้กลับไปหน้า home
      if (route.startsWith('/staff')) {
        try {
          const hasStaffSession = !!localStorage.getItem('gp_staff')
          if (!hasStaffSession) {
            router.replace('/home')
            return
          }
        } catch {
          router.replace('/home')
          return
        }
      }
      router.replace(route)
    }).catch(() => {
      
      router.replace(isLoggedIn ? '/home' : '/login')
    })
  }, [loading, isLoggedIn, uid])

  return (
    <div className="min-h-screen bg-tok flex flex-col items-center justify-center"
      style={{ maxWidth: 430, margin: '0 auto' }}>
      <div className="w-20 h-20 rounded-full bg-adim flex items-center justify-center mb-5 animate-gearspin"
        style={{ border: '2px solid var(--abrd)' }}>
        <span style={{ fontSize: 40 }}>⚙️</span>
      </div>
      <h1 className="font-syne text-2xl font-extrabold text-t1">
        Garage<span className="text-acc">Plus</span>
      </h1>
      <p className="text-t3 text-xs uppercase tracking-widest mt-1">179 Auto · Doi Saket</p>
      <div className="flex gap-2 mt-10">
        {[0,1,2].map(i => (
          <div key={i} className="w-1.5 h-1.5 rounded-full animate-dpulse"
            style={{ backgroundColor: i===1 ? 'var(--acc)' : 'var(--t3)', animationDelay: `${i*0.2}s` }}/>
        ))}
      </div>
    </div>
  )
}
