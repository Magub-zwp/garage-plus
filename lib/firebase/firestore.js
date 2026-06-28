import {
  doc, getDoc, setDoc, updateDoc, deleteDoc, addDoc,
  collection, query, where, orderBy, limit,
  getDocs, onSnapshot, serverTimestamp, increment,
} from 'firebase/firestore'
import { db } from './config'

// ─── Users 
export async function createUserDocument(uid, data) {
  const ref  = doc(db, 'users', uid)
  const snap = await getDoc(ref)
  if (!snap.exists()) {
    await setDoc(ref, {
      name:'', phone:'', email:'', lineId:'', birthday:'',
      points:0, usageCount:0, memberSince:serverTimestamp(),
      notifPrefs:{ status:true, promo:true, maintenance:true, line:false },
      darkMode:true, language:'th', fcmToken:'',
      // PDPA consent fields
      consentAccepted:  false,
      consentDate:      null,
      consentVersion:   '1.0',
      marketingConsent: false,
      ...data,
    })
  }
}
export const getUserDocument    = async (uid) => { const s = await getDoc(doc(db,'users',uid)); return s.exists()?{id:s.id,...s.data()}:null }
export const updateUserDocument = (uid, data) => updateDoc(doc(db,'users',uid), {...data, updatedAt:serverTimestamp()})
export const listenUser         = (uid, cb)   => onSnapshot(doc(db,'users',uid), s => cb(s.exists()?{id:s.id,...s.data()}:null))

export async function deleteUserData(uid) {
  // Soft delete: mark deleted, let Cloud Function clean up
  await updateDoc(doc(db,'users',uid), { deleted:true, deletedAt:serverTimestamp() })
}

// ─── Cars 
export const addCar       = (uid, data) => addDoc(collection(db,'cars'), {...data, userId:uid, createdAt:serverTimestamp()}).then(r=>r.id)
export const updateCar    = (id, data)  => updateDoc(doc(db,'cars',id), data)
export const deleteCar    = (id)        => deleteDoc(doc(db,'cars',id))
export const listenUserCars = (uid, cb) => onSnapshot(query(collection(db,'cars'), where('userId','==',uid), orderBy('createdAt')), s => cb(s.docs.map(d=>({id:d.id,...d.data()}))))
export const getUserCars    = async (uid) => { const s = await getDocs(query(collection(db,'cars'),where('userId','==',uid),orderBy('createdAt'))); return s.docs.map(d=>({id:d.id,...d.data()})) }

// ─── Bookings
// สร้าง/ยกเลิก ทำผ่าน server (/api/bookings, /api/bookings/[id]) เพื่อความปลอดภัย + กัน race condition
// ที่นี่เหลือเฉพาะการอ่าน
export const getBooking          = async (id) => { const s = await getDoc(doc(db,'bookings',id)); return s.exists()?{id:s.id,...s.data()}:null }
export const listenUserBookings  = (uid, cb)  => onSnapshot(query(collection(db,'bookings'),where('userId','==',uid),orderBy('createdAt','desc')), s => cb(s.docs.map(d=>({id:d.id,...d.data()}))))

// ─── Repairs
// ฟัง repair ที่กำลังดำเนินการอยู่ของลูกค้า (ใช้แสดงสถานะบนหน้า /status)
export const listenActiveRepairByUser = (uid, cb) =>
  onSnapshot(query(collection(db,'repairs'), where('userId','==',uid), where('status','in',['waiting','diagnosing','awaiting_approval','repairing','qc']), orderBy('createdAt','desc'), limit(1)),
    s => cb(s.empty?null:{id:s.docs[0].id,...s.docs[0].data()}))
export const getRepairHistory = async (uid) => {
  const s = await getDocs(query(collection(db,'repairs'), where('userId','==',uid), where('status','==','done'), orderBy('createdAt','desc')))
  return s.docs.map(d=>({id:d.id,...d.data()}))
}

// ─── Notifications
export const listenNotifications    = (uid, cb) => onSnapshot(query(collection(db,'notifications'), where('userId','==',uid), orderBy('createdAt','desc'), limit(30)), s => cb(s.docs.map(d=>({id:d.id,...d.data()}))))
export const markNotificationRead   = (id)      => updateDoc(doc(db,'notifications',id), {unread:false})

// ─── Articles (v3) 
export async function getPublishedArticles(lim=10) {
  const s = await getDocs(query(collection(db,'articles'), where('published','==',true), orderBy('createdAt','desc'), limit(lim)))
  return s.docs.map(d=>({id:d.id,...d.data()}))
}
export async function getArticlesByCategory(cat, lim=10) {
  const s = await getDocs(query(collection(db,'articles'), where('published','==',true), where('category','==',cat), orderBy('createdAt','desc'), limit(lim)))
  return s.docs.map(d=>({id:d.id,...d.data()}))
}
export async function getFeaturedArticles(lim=5) {
  const s = await getDocs(query(collection(db,'articles'), where('published','==',true), where('featured','==',true), orderBy('createdAt','desc'), limit(lim)))
  return s.docs.map(d=>({id:d.id,...d.data()}))
}
export const getArticle = async (id) => { const s = await getDoc(doc(db,'articles',id)); return s.exists()?{id:s.id,...s.data()}:null }
export const createArticle = (data) => addDoc(collection(db,'articles'), {...data, reads:0, createdAt:serverTimestamp(), updatedAt:serverTimestamp()})
export const updateArticle = (id, data) => updateDoc(doc(db,'articles',id), {...data, updatedAt:serverTimestamp()})
export const deleteArticle = (id)       => updateDoc(doc(db,'articles',id), {published:false, deleted:true, updatedAt:serverTimestamp()})
export const incrementArticleReads = (id) => updateDoc(doc(db,'articles',id), {reads:increment(1)})

// Staff: get all articles (including unpublished)
export async function getAllArticles() {
  const s = await getDocs(query(collection(db,'articles'), where('deleted','!=',true), orderBy('deleted'), orderBy('createdAt','desc')))
  return s.docs.map(d=>({id:d.id,...d.data()}))
}
