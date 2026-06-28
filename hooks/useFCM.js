'use client'
import { useEffect } from 'react'
import { useAuthContext } from '@/context/AuthContext'
import { updateUserDocument } from '@/lib/firebase/firestore'

/**
 * useFCM — ขอ permission Push Notification + เก็บ FCM token ใน Firestore
 * เรียกใช้ใน home/page.js หนึ่งครั้ง
 */
export function useFCM() {
  const { uid, userDoc } = useAuthContext()

  useEffect(() => {
    if (!uid || typeof window === 'undefined') return
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return

    // ขอ permission เฉพาะถ้ายังไม่เคยขอ
    if (Notification.permission === 'denied') return

    const initFCM = async () => {
      try {
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') return

        // Lazy import Firebase Messaging (client-only)
        const { getMessaging, getToken } = await import('firebase/messaging')
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

        // บันทึก token ถ้าเปลี่ยนแปลง
        if (token !== userDoc?.fcmToken) {
          await updateUserDocument(uid, { fcmToken: token })
        }

        // รับ notification เมื่อแอพเปิดอยู่ (foreground) — เก็บ unsubscribe function
        const { onMessage } = await import('firebase/messaging')
        unsubscribeRef = onMessage(messaging, (payload) => {
          const { title, body } = payload.notification || {}
          if (title && body && Notification.permission === 'granted') {
            new Notification(title, {
              body,
              icon: '/icon-192.png',
              badge: '/icon-72.png',
            })
          }
        })
      } catch (err) {
        // Silent fail — FCM ไม่ใช่ฟีเจอร์บังคับ
        console.warn('[useFCM]', err.message)
      }
    }

    let unsubscribeRef = null
    initFCM()

    return () => { if (unsubscribeRef) unsubscribeRef() }
  }, [uid])
}
