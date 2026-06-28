import { NextResponse } from 'next/server'

/**
 * DELETE /api/staff/delete
 * ลบ Firebase Auth account + /staff/{uid} document
 */
async function getAdmin() {
  const { initializeApp, getApps, cert } = await import('firebase-admin/app')
  const { getAuth }      = await import('firebase-admin/auth')
  const { getFirestore } = await import('firebase-admin/firestore')

  if (!getApps().length) {
    const cfg = process.env.FIREBASE_ADMIN_PRIVATE_KEY
      ? { credential: cert({
            projectId:   process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
            privateKey:  process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g,'\n'),
          }) }
      : { projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID }
    initializeApp(cfg)
  }
  return { auth: getAuth(), db: getFirestore() }
}

export async function DELETE(request) {
  try {
    const { uid } = await request.json()
    if (!uid) return NextResponse.json({ error: 'uid required' }, { status: 400 })

    const { auth, db } = await getAdmin()

    // ลบ Auth account (ถ้ามี)
    try { await auth.deleteUser(uid) } catch(e) {
      if (e.code !== 'auth/user-not-found') throw e
    }

    // ลบ Firestore staff doc
    await db.doc(`staff/${uid}`).delete()

    return NextResponse.json({ ok: true })
  } catch(err) {
    console.error('[DELETE /api/staff/delete]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
