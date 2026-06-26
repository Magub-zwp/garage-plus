import {
  doc, getDoc, setDoc, updateDoc, deleteDoc, addDoc,
  collection, query, where, orderBy, limit,
  getDocs, onSnapshot, serverTimestamp, increment, runTransaction,
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

// ─── Slots
// ช่วงเวลาเปิดรับจอง (ไม่มีช่วงพักเที่ยง 12:00)
const DEFAULT_TIMES = ['08:00','09:00','10:00','11:00','13:00','14:00','15:00','16:00']
// ถ้ายังไม่มี doc ของวันนั้นใน Firestore ให้ใช้ค่า default (แต่ละช่วงรับได้ 1 คัน)
const defaultSlots  = () => Object.fromEntries(DEFAULT_TIMES.map(t => [t, {booked:0, max:1}]))
export const getSlots   = async (date) => { const s = await getDoc(doc(db,'slots',date)); return s.exists()?s.data():defaultSlots() }
export const listenSlots = (date, cb)  => onSnapshot(doc(db,'slots',date), s => cb(s.exists()?s.data():defaultSlots()))

// ─── Bookings
export async function createBooking(userId, data) {
  const { date, time } = data
  const slotRef    = doc(db, 'slots', date)
  const bookingRef = doc(collection(db, 'bookings'))
  // ใช้ transaction เพื่อป้องกัน race condition:
  // อ่านและเขียน slot + booking ใน atomic operation เดียว
  // ถ้ามีคนจอง slot เดียวกันพร้อมกัน คนที่ 2 จะได้รับ error SLOT_FULL
  await runTransaction(db, async tx => {
    const slotSnap = await tx.get(slotRef)
    const slotData = slotSnap.exists() ? slotSnap.data() : defaultSlots()
    const slot = slotData[time]
    if (!slot) throw new Error('INVALID_TIME')
    if (slot.booked >= slot.max) throw new Error('SLOT_FULL')
    if (slotSnap.exists()) tx.update(slotRef, {[`${time}.booked`]: increment(1)})
    else tx.set(slotRef, {...slotData, [time]:{booked:1, max:1}})
    tx.set(bookingRef, { userId, customerName: data.customerName||'', ...data, status:'pending', bookingRef:`#BK${Date.now().toString().slice(-6)}`, repairId:null, cancelReason:'', cancelledAt:null, createdAt:serverTimestamp(), updatedAt:serverTimestamp() })
  })
  return bookingRef.id
}
export const getBooking          = async (id)      => { const s = await getDoc(doc(db,'bookings',id)); return s.exists()?{id:s.id,...s.data()}:null }
export const listenUserBookings  = (uid, cb)       => onSnapshot(query(collection(db,'bookings'),where('userId','==',uid),orderBy('createdAt','desc')), s => cb(s.docs.map(d=>({id:d.id,...d.data()}))))
export async function cancelBooking(bookingId, reason='') {
  const ref  = doc(db,'bookings',bookingId)
  const snap = await getDoc(ref)
  if (!snap.exists()) throw new Error('BOOKING_NOT_FOUND')
  const { date, time, status } = snap.data()
  // ยกเลิกได้เฉพาะสถานะ pending/confirmed เท่านั้น (ถ้าซ่อมไปแล้วยกเลิกไม่ได้)
  if (!['pending','confirmed'].includes(status)) throw new Error('CANNOT_CANCEL')
  // transaction: เปลี่ยน status booking + คืน slot ให้ว่างพร้อมกัน
  await runTransaction(db, async tx => {
    tx.update(ref, { status:'cancelled', cancelReason:reason, cancelledAt:serverTimestamp(), updatedAt:serverTimestamp() })
    tx.update(doc(db,'slots',date), {[`${time}.booked`]: increment(-1)})
  })
}

// ─── Repairs
// ฟัง repair ที่กำลังดำเนินการอยู่ของลูกค้า (ใช้แสดงสถานะบนหน้า /status)
export const listenActiveRepairByUser = (uid, cb) =>
  onSnapshot(query(collection(db,'repairs'), where('userId','==',uid), where('status','in',['waiting','diagnosing','repairing','qc']), orderBy('createdAt','desc'), limit(1)),
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
