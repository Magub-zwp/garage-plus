// Firebase Messaging Service Worker — GaragePlus v3.1
// ──────────────────────────────────────────────────────────────────────────
// ค่า Firebase Config ถูกกรอกอัตโนมัติแล้ว — กรุณาอย่าแก้ไข

importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey:            'AIzaSyCF927BvaGghWBy2IWeQOrDJtOdAOVhVnk',
  authDomain:        'garageplus-66.firebaseapp.com',
  projectId:         'garageplus-66',
  storageBucket:     'garageplus-66.firebasestorage.app',
  messagingSenderId: '401578741291',
  appId:             '1:401578741291:web:1d4362ed1094a1db74a46e',
})

const messaging = firebase.messaging()

// รับ notification เมื่อแอพปิดอยู่ (background)
messaging.onBackgroundMessage((payload) => {
  const { title, body, icon } = payload.notification || {}
  self.registration.showNotification(title || 'Garage Plus', {
    body:    body || 'มีการแจ้งเตือนใหม่',
    icon:    icon || '/icon-192.png',
    badge:   '/icon-72.png',
    data:    payload.data,
    actions: [
      { action: 'open',    title: 'เปิดแอป' },
      { action: 'dismiss', title: 'ปิด' },
    ],
  })
})

// กด notification แล้วเปิดแอป
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  if (event.action === 'dismiss') return
  const url = event.notification.data?.href || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes(url) && 'focus' in client) return client.focus()
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})
