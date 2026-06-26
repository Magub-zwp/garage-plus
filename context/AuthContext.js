'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthChange, handleGoogleRedirect } from '@/lib/firebase/auth'
import { listenUser } from '@/lib/firebase/firestore'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  // firebaseUser = object จาก Firebase Auth (มีแค่ uid, email, displayName)
  // userDoc      = ข้อมูลเพิ่มเติมจาก Firestore (ชื่อ, เบอร์, แต้มสะสม, การตั้งค่า ฯลฯ)
  const [firebaseUser, setFirebaseUser] = useState(undefined)
  const [userDoc, setUserDoc]           = useState(null)
  const [loading, setLoading]           = useState(true)

  useEffect(() => {
    let unsubUser = null

    const init = async () => {
      // ต้องรอรับผล Google redirect ก่อนเสมอ (mobile ใช้ redirect แทน popup)
      // ถ้าไม่ได้มาจาก Google redirect จะ resolve null ทันที ไม่มีผลอะไร
      await handleGoogleRedirect().catch(() => {})

      // ป้องกันหน้าค้าง loading ตลอดไปถ้า Firebase ไม่ตอบภายใน 5 วินาที
      const timeout = setTimeout(() => setLoading(false), 5000)

      const unsubAuth = onAuthChange(async (fbUser) => {
        clearTimeout(timeout)
        setFirebaseUser(fbUser)

        if (!fbUser) {
          setUserDoc(null)
          setLoading(false)
          return
        }

        // ล้าง listener เก่าก่อน แล้วฟัง userDoc ของ uid ใหม่แบบ real-time
        if (unsubUser) unsubUser()
        unsubUser = listenUser(fbUser.uid, (doc) => {
          setUserDoc(doc)
          setLoading(false)
        })
      })

      return () => {
        clearTimeout(timeout)
        unsubAuth()
        if (unsubUser) unsubUser()
      }
    }

    let cleanup = () => {}
    init().then(fn => { if (fn) cleanup = fn })

    return () => cleanup()
  }, [])

  // ค่าที่ทุก component ใต้ AuthProvider เข้าถึงได้ผ่าน useAuthContext()
  const value = {
    firebaseUser,
    userDoc,
    uid: firebaseUser?.uid || null,
    loading,
    isLoggedIn: !!firebaseUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuthContext() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext ต้องใช้ภายใน <AuthProvider>')
  return ctx
}
