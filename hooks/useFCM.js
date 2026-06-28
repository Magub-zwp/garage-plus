'use client'
import { useEffect, useRef } from 'react'
import { useAuthContext } from '@/context/AuthContext'
import { updateUserDocument } from '@/lib/firebase/firestore'

/**
 * useFCM — ขอ permission Push Notification + เก็บ FCM token ใน Firestore
 * เรียกใช้ใน home/page.js หนึ่งครั้ง
 */
export function useFCM() {
  const { uid, userDoc } = useAuthContext()
  const unsubscribeRef = useRef(null)   // เก็บ unsubscribe ของ onMessage ไว้ cleanup

  useEffect(() => {
    if (!uid || typeof window === 'undefined') return
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return
    if (Notification.permission === 'denied') return

    const initFCM = async () => {
      try {
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') return

        const { getMessaging, getToken, onMessage } = await import('firebase/messaging')
        const messaging = getMessaging()

        const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
        if (!vapidKey) {
          console.warn('[useFCM] NEXT_PUBLIC_FIREBASE_VAPID_KEY ยังไม่ได้ตั้งค่า — ข้าม FCM')
          return
        }

        const token = await getToken(messaging, { vapidKey })
        if (!token) {
          console.warn('[useFCM] getToken คืนค่า null — ตรวจสอบ VAPID key และ SW registration')
          return
        }
        if (token !== userDoc?.fcmToken) await updateUserDocument(uid, { fcmToken: token })

        // ลงทะเบียน listener เพียงตัวเดียว — กันลงซ้ำ (เหตุของแจ้งเตือนเบิ้ล) เมื่อ effect รันใหม่
        if (unsubscribeRef.current) unsubscribeRef.current()
        unsubscribeRef.current = onMessage(messaging, (payload) => {
          const { title, body } = payload.notification || {}
          if (title && body && Notification.permission === 'granted') {
            new Notification(title, { body, icon: '/icon-192.png', badge: '/icon-72.png' })
          }
        })
      } catch (err) {
        console.warn('[useFCM]', err.message)   // FCM ไม่ใช่ฟีเจอร์บังคับ
      }
    }

    initFCM()

    // cleanup: ยกเลิก listener เมื่อ unmount หรือ uid เปลี่ยน
    return () => {
      if (unsubscribeRef.current) { unsubscribeRef.current(); unsubscribeRef.current = null }
    }
  }, [uid])
}
