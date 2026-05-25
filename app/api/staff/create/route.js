import { NextResponse } from 'next/server'

/**
 * POST /api/staff/create
 * สร้าง Firebase Auth account + /staff/{uid} document สำหรับพนักงานใหม่
 * ต้องการ FIREBASE_ADMIN_PRIVATE_KEY ใน .env.local
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

export async function POST(request) {
  try {
    const { name, email, password, role } = await request.json()

    if (!name?.trim() || !email?.trim() || !password || !role) {
      return NextResponse.json({ error: 'กรุณากรอกข้อมูลให้ครบ' }, { status: 400 })
    }
    if (!['admin','mechanic'].includes(role)) {
      return NextResponse.json({ error: 'role ต้องเป็น admin หรือ mechanic' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัว' }, { status: 400 })
    }

    const { auth, db } = await getAdmin()

    // สร้าง Firebase Auth user
    const newUser = await auth.createUser({
      email:       email.trim(),
      password,
      displayName: name.trim(),
    })

    // สร้าง /staff/{uid} document
    await db.doc(`staff/${newUser.uid}`).set({
      name:      name.trim(),
      email:     email.trim(),
      role,
      createdAt: new Date(),
    })

    return NextResponse.json({ uid: newUser.uid, message: 'สร้างพนักงานสำเร็จ' }, { status: 201 })

  } catch(err) {
    console.error('[POST /api/staff/create]', err)
    const msgs = {
      'auth/email-already-exists': 'อีเมลนี้มีบัญชีอยู่แล้ว',
      'auth/invalid-email':        'รูปแบบอีเมลไม่ถูกต้อง',
      'auth/weak-password':        'รหัสผ่านต้องมีอย่างน้อย 6 ตัว',
    }
    return NextResponse.json(
      { error: msgs[err.code] || err.message },
      { status: err.code?.startsWith('auth/') ? 400 : 500 }
    )
  }
}
