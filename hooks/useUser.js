'use client'
import { useEffect, useState } from 'react'
import { listenUserCars } from '@/lib/firebase/firestore'
import { useAuthContext } from '@/context/AuthContext'

export function useUser() {
  const { userDoc, uid, loading } = useAuthContext()
  const [cars, setCars]           = useState([])
  const [carsLoading, setCarsLoading] = useState(true)

  useEffect(() => {
    if (!uid) { setCars([]); setCarsLoading(false); return }
    const unsub = listenUserCars(uid, (c) => { setCars(c); setCarsLoading(false) })
    return () => unsub()
  }, [uid])

  return {
    user: userDoc,
    cars,
    loading: loading || carsLoading,
    mainCar: cars.find((c) => c.isMain) || cars[0] || null,
  }
}
