// Firebase Admin SDK — shared initializer สำหรับ API routes (server-side เท่านั้น)
// ใช้ dynamic import เพื่อไม่ให้ bundle เข้า client

export async function getAdmin() {
  const { initializeApp, getApps, cert } = await import('firebase-admin/app')
  const { getAuth }      = await import('firebase-admin/auth')
  const { getFirestore } = await import('firebase-admin/firestore')

  if (!getApps().length) {
    const cfg = process.env.FIREBASE_ADMIN_PRIVATE_KEY
      ? { credential: cert({
              projectId:   process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
              clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
              privateKey:  process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
            }) }
      : { projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID }
    initializeApp(cfg)
  }

  return { auth: getAuth(), db: getFirestore() }
}
