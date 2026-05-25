'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthChange, handleGoogleRedirect } from '@/lib/firebase/auth'
import { listenUser } from '@/lib/firebase/firestore'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(undefined)
  const [userDoc, setUserDoc]           = useState(null)
  const [loading, setLoading]           = useState(true)

  useEffect(() => {
    let unsubUser = null

    const init = async () => {
      // รอ Google redirect result ก่อนเสมอ
      // ถ้าไม่ได้มาจาก Google redirect → resolve null ทันที
      await handleGoogleRedirect().catch(() => {})

      // safety timeout
      const timeout = setTimeout(() => setLoading(false), 5000)

      const unsubAuth = onAuthChange(async (fbUser) => {
        clearTimeout(timeout)
        setFirebaseUser(fbUser)

        if (!fbUser) {
          setUserDoc(null)
          setLoading(false)
          return
        }

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
