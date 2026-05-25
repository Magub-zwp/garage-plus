import {
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, sendPasswordResetEmail, updatePassword,
  GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult,
  onAuthStateChanged,
  EmailAuthProvider, reauthenticateWithCredential,
} from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from './config'
import { createUserDocument } from './firestore'

export const loginWithEmail  = (e, p)  => signInWithEmailAndPassword(auth, e, p).then(c => c.user)
export const forgotPassword  = (email) => sendPasswordResetEmail(auth, email)
export const logout          = ()      => signOut(auth)
export const onAuthChange    = (cb)    => onAuthStateChanged(auth, cb)
export const getCurrentUser  = ()      => auth.currentUser

// FIX BUG-003: ตรวจว่าเป็น mobile หรือไม่ → ใช้ redirect แทน popup
function isMobile() {
  if (typeof window === 'undefined') return false
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
}

export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })

  if (isMobile()) {
    // Mobile: ใช้ redirect (popup ถูก block บน mobile browser)
    await signInWithRedirect(auth, provider)
    return null // จะ redirect ออกไป — ผล handle ใน handleGoogleRedirect
  } else {
    // Desktop: ใช้ popup
    const cred = await signInWithPopup(auth, provider)
    await createUserDocument(cred.user.uid, {
      name: cred.user.displayName || '', email: cred.user.email || '', phone: '',
    })
    return cred.user
  }
}

// เรียกฟังก์ชันนี้ใน login/page.js เพื่อรับผลหลัง Google redirect กลับมา
export async function handleGoogleRedirect() {
  try {
    const result = await getRedirectResult(auth)
    if (!result) return null
    await createUserDocument(result.user.uid, {
      name: result.user.displayName || '', email: result.user.email || '', phone: '',
    })
    return result.user
  } catch {
    return null
  }
}

export async function registerWithEmail(email, password, profile) {
  const cred = await createUserWithEmailAndPassword(auth, email, password)
  await createUserDocument(cred.user.uid, {
    name:             profile.name,
    phone:            profile.phone,
    lineId:           profile.lineId || '',
    email:            cred.user.email,
    birthday:         profile.birthday || '',
    consentAccepted:  profile.consentAccepted  || false,
    consentDate:      profile.consentDate       || null,
    consentVersion:   profile.consentVersion    || '1.0',
    marketingConsent: profile.marketingConsent  || false,
  })
  return cred.user
}

export async function changePassword(currentPassword, newPassword) {
  const user = auth.currentUser
  if (!user) throw new Error('NOT_AUTHENTICATED')
  const credential = EmailAuthProvider.credential(user.email, currentPassword)
  await reauthenticateWithCredential(user, credential)
  await updatePassword(user, newPassword)
}

/**
 * v3 — เช็ค role หลัง login: admin → /dashboard, mechanic → /mech/queue, customer → /home
 */
export async function getDefaultRoute(uid) {
  try {
    const snap = await getDoc(doc(db, 'staff', uid))
    if (snap.exists()) {
      return snap.data().role === 'admin' ? '/staff/dashboard' : '/staff/mech/queue'
    }
  } catch {}
  return '/home'
}

/**
 * เช็คว่า uid เป็น staff หรือไม่
 */
export async function isStaffUser(uid) {
  try {
    const snap = await getDoc(doc(db, 'staff', uid))
    return snap.exists()
  } catch { return false }
}
