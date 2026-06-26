'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useUser } from '@/hooks/useUser'
import { createBooking } from '@/lib/firebase/firestore'
import BottomNav from '@/components/customer/BottomNav'

const DAYS_TH     = ['อา','จ','อ','พ','พฤ','ศ','ส']
const OFF_DAYS    = [0, 6] // อาทิตย์, เสาร์
const SERVICE_TYPES = ['เปลี่ยนน้ำมัน','ตรวจเช็ค','เบรก','ยาง','แบตเตอรี่','อื่นๆ']
const TIME_SLOTS  = ['08:00','09:00','10:00','11:00','13:00','14:00','15:00','16:00']

function toDateStr(y, m, d) {
  return `${y}-${String(m + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
}

export default function BookPage() {
  const router = useRouter()
  const { uid } = useAuth()
  const { cars, user } = useUser()

  const today = new Date()
  const [viewYear,  setViewYear]  = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  // เวลา 00:00 ของวันนี้ ใช้เทียบว่าวันที่เลือกผ่านไปแล้วหรือยัง (คำนวณครั้งเดียวด้วย useMemo
  // กันไม่ให้ต้องสร้าง Date object ใหม่ทุกครั้งที่ component re-render)
  const todayMidnight = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])
  const [selectedDate, setSelectedDate] = useState(null)
  const [slotData,  setSlotData]  = useState({}) // { 'HH:mm': { booked, max } }
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [selectedTime, setSelectedTime] = useState(null)
  const [selectedCar,  setSelectedCar]  = useState(null)
  const [pickupType,   setPickupType]   = useState('self')
  const [services,     setServices]     = useState([])
  const [note,         setNote]         = useState('')
  const [submitting,   setSubmitting]   = useState(false)
  const [error,        setError]        = useState('')

  // Set default car
  useEffect(() => {
    if (cars.length > 0 && !selectedCar) {
      setSelectedCar(cars.find((c) => c.isMain) || cars[0])
    }
  }, [cars])

  // Fetch slots when date changes
  const fetchSlots = useCallback(async (dateStr) => {
    setSlotsLoading(true)
    setSlotData({})
    setSelectedTime(null)
    try {
      const res = await fetch(`/api/slots?date=${dateStr}`)
      const data = await res.json()
      if (data.slots) {
        const map = {}
        data.slots.forEach((s) => { map[s.time] = s })
        setSlotData(map)
      }
    } catch {
      setError('โหลดข้อมูลคิวไม่ได้ กรุณาลองใหม่')
    } finally {
      setSlotsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedDate) fetchSlots(selectedDate)
  }, [selectedDate, fetchSlots])

  // Calendar helpers
  const daysInMonth  = new Date(viewYear, viewMonth + 1, 0).getDate()
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay()

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11) }
    else setViewMonth((m) => m - 1)
    setSelectedDate(null)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0) }
    else setViewMonth((m) => m + 1)
    setSelectedDate(null)
  }

  // เช็คว่าวันนั้นกดเลือกไม่ได้หรือไม่ (ตรงกับวันหยุดประจำสัปดาห์ หรือเป็นวันที่ผ่านมาแล้ว)
  const isDayDisabled = (day) => {
    const dayOfWeek = (firstDayOfMonth + day - 1) % 7
    const d = new Date(viewYear, viewMonth, day)
    d.setHours(0, 0, 0, 0)
    return OFF_DAYS.includes(dayOfWeek) || d < todayMidnight
  }

  const toggleService = (s) => {
    setServices((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s])
  }

  const handleConfirm = async () => {
    if (!selectedDate) { setError('กรุณาเลือกวันที่'); return }
    if (!selectedTime) { setError('กรุณาเลือกช่วงเวลา'); return }
    if (services.length === 0) { setError('กรุณาเลือกประเภทงานซ่อมอย่างน้อย 1 รายการ'); return }
    if (!selectedCar) { setError('กรุณาเพิ่มรถก่อนทำการจอง'); return }
    setError(''); setSubmitting(true)
    try {
      const bookingId = await createBooking(uid, {
        date:         selectedDate,
        time:         selectedTime,
        carId:        selectedCar.id,
        carPlate:     selectedCar.plate,
        carName:      `${selectedCar.brand} ${selectedCar.model} ${selectedCar.year}`,
        customerName: user?.name || '',
        serviceType:  services,
        pickupType,
        note,
      })
      router.push(`/book/success?id=${bookingId}`)
    } catch (e) {
      if (e.message === 'SLOT_FULL') setError('ขออภัย คิวนี้เต็มแล้ว กรุณาเลือกเวลาอื่น')
      else setError('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง')
    } finally {
      setSubmitting(false)
    }
  }

  const MONTHS_TH = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
  const MONTHS_TH_FULL = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']

  return (
    <div className="page-container pb-28">
      <div className="page-header">
        <Link href="/home" className="back-btn">‹</Link>
        <h1 className="page-title">จองคิวซ่อม</h1>
      </div>

      {/* Pickup type */}
      <p className="field-label px-4 pb-1">ประเภทบริการ <span className="required-mark">*</span></p>
      <div className="grid grid-cols-2 gap-2 px-4 mb-4">
        {[{ key:'self', icon:'🏪', title:'นำรถมาเอง', sub:'เข้าอู่ด้วยตัวเอง' },
          { key:'pickup', icon:'🏠', title:'รับรถถึงบ้าน', sub:'ช่างไปรับ-ส่ง' }].map((p) => (
          <button key={p.key} onClick={() => setPickupType(p.key)}
            className="bg-surf rounded-2xl py-3 px-2 text-center border-token cursor-pointer transition-all"
            style={pickupType === p.key ? { borderColor: 'var(--acc)', background: 'var(--adim)' } : {}}>
            <div className="text-2xl mb-1">{p.icon}</div>
            <p className="text-xs font-bold text-t1">{p.title}</p>
            <p className="text-xs text-t2 mt-0.5">{p.sub}</p>
          </button>
        ))}
      </div>

      {/* Calendar */}
      <p className="field-label px-4 pb-1">เลือกวันที่ <span className="required-mark">*</span></p>
      <div className="flex justify-between items-center px-4 mb-2">
        <button onClick={prevMonth}
          className="w-7 h-7 bg-s2 rounded-lg flex items-center justify-center text-t2 text-xs cursor-pointer border-none">‹</button>
        <p className="font-syne text-sm font-bold text-t1">
          {MONTHS_TH_FULL[viewMonth]} {viewYear + 543}
        </p>
        <button onClick={nextMonth}
          className="w-7 h-7 bg-s2 rounded-lg flex items-center justify-center text-t2 text-xs cursor-pointer border-none">›</button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 px-4 mb-2">
        {DAYS_TH.map((d) => (
          <div key={d} className="text-center py-1 text-xs text-t3 font-semibold">{d}</div>
        ))}
        {Array.from({ length: firstDayOfMonth }).map((_, i) => (
          <div key={`e${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day     = i + 1
          const disabled = isDayDisabled(day)
          const dateStr  = toDateStr(viewYear, viewMonth, day)
          const isSelected = selectedDate === dateStr
          const isToday    = dateStr === toDateStr(today.getFullYear(), today.getMonth(), today.getDate())
          return (
            <button key={day} disabled={disabled}
              onClick={() => setSelectedDate(dateStr)}
              className="relative flex flex-col items-center py-1.5 rounded-xl transition-all cursor-pointer border-none"
              style={{
                background: isSelected ? 'var(--acc)' : isToday ? 'var(--s2)' : 'transparent',
                opacity: disabled ? 0.3 : 1,
              }}>
              <span className="text-xs font-medium"
                style={{ color: isSelected ? '#fff' : disabled ? 'var(--t3)' : 'var(--t1)' }}>
                {day}
              </span>
            </button>
          )
        })}
      </div>

      {/* Time slots */}
      {selectedDate && (
        <>
          <p className="field-label px-4 pb-1 pt-2">ช่วงเวลา <span className="required-mark">*</span></p>
          {slotsLoading ? (
            <div className="flex justify-center py-4">
              <span className="inline-block w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: 'var(--acc)', borderTopColor: 'transparent' }} />
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2 px-4 mb-3">
              {TIME_SLOTS.map((t) => {
                const s       = slotData[t]
                // ถ้า API ไม่ได้ส่ง isFull มาตรงๆ ให้คำนวณเองจากจำนวนที่จองแล้ว/จำนวนรับสูงสุด
                // เพื่อกันไม่ให้ลูกค้าจองคิวที่เต็มแล้วซ้ำ
                const isFull  = s ? (s.isFull ?? (s.max != null && s.booked != null ? s.booked >= s.max : false)) : false
                const isAvail = !isFull
                const isSel   = selectedTime === t
                return (
                  <button key={t} disabled={isFull}
                    onClick={() => setSelectedTime(t)}
                    className="py-2 rounded-xl text-center transition-all cursor-pointer border"
                    style={{
                      background: isSel ? 'var(--acc)' : 'var(--surf)',
                      borderColor: isSel ? 'var(--acc)' : 'var(--brd2)',
                      opacity: isFull ? 0.4 : 1,
                      borderWidth: 0.5,
                    }}>
                    <p className="text-xs font-semibold"
                      style={{ color: isSel ? '#fff' : isFull ? 'var(--t3)' : 'var(--t1)' }}>
                      {t}
                    </p>
                    <p className="mt-0.5" style={{ fontSize: 9, color: isSel ? 'rgba(255,255,255,.7)' : isFull ? 'var(--err)' : 'var(--t3)' }}>
                      {isFull ? 'เต็ม' : isSel ? 'เลือก ✓' : `ว่าง`}
                    </p>
                  </button>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Car selector */}
      {cars.length === 0 ? (
        <div className="mx-4 mb-4 p-4 rounded-2xl flex gap-3 items-center cursor-pointer"
          style={{ background:'var(--adim)', border:'1px dashed var(--abrd)' }}
          onClick={() => router.push('/profile/add-car')}>
          <span className="text-2xl">🚗</span>
          <div className="flex-1">
            <p className="text-sm font-bold text-t1">ยังไม่มีรถในบัญชี</p>
            <p className="text-xs text-acc mt-0.5">กดที่นี่เพื่อเพิ่มรถก่อนจอง →</p>
          </div>
        </div>
      ) : (
        <>
          <p className="field-label px-4 pb-1">รถของคุณ <span className="required-mark">*</span></p>
          <div className="px-4 mb-3 flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {cars.map((car) => (
              <button key={car.id} onClick={() => setSelectedCar(car)}
                className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer transition-all"
                style={{
                  background: selectedCar?.id === car.id ? 'var(--adim)' : 'var(--surf)',
                  borderColor: selectedCar?.id === car.id ? 'var(--abrd)' : 'var(--brd2)',
                  borderWidth: 0.5,
                }}>
                <span className="text-base">🚗</span>
                <div className="text-left">
                  <p className="text-xs font-semibold text-t1">{car.brand} {car.model}</p>
                  <p className="text-xs text-t2">{car.plate}</p>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Service type */}
      <p className="field-label px-4 pb-1">ประเภทงาน <span className="required-mark">*</span></p>
      <div className="flex flex-wrap gap-2 px-4 mb-3">
        {SERVICE_TYPES.map((s) => (
          <button key={s} onClick={() => toggleService(s)}
            className="px-3 py-1.5 rounded-full text-xs border transition-all cursor-pointer"
            style={{
              background: services.includes(s) ? 'var(--adim)' : 'var(--surf)',
              color: services.includes(s) ? 'var(--acc)' : 'var(--t2)',
              borderColor: services.includes(s) ? 'var(--abrd)' : 'var(--brd2)',
              borderWidth: 0.5,
            }}>
            {s}
          </button>
        ))}
      </div>

      {/* Note */}
      <p className="field-label px-4 pb-1">หมายเหตุ</p>
      <div className="px-4 mb-4">
        <textarea className="input-field resize-none" style={{ height: 60, fontSize: 12 }}
          placeholder="รายละเอียดเพิ่มเติม อาการเสีย หรือข้อมูลอื่นๆ..."
          value={note} onChange={(e) => setNote(e.target.value)} />
      </div>

      {error && (
        <div className="mx-4 mb-3 p-3 rounded-xl text-xs text-err flex gap-2"
          style={{ background: 'var(--errdim)', border: '0.5px solid rgba(232,92,58,.25)' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Confirm button */}
      <div className="px-4 mb-6">
        <button
          className="btn-primary flex items-center justify-center gap-2"
          style={(!selectedTime || submitting) ? { background: 'var(--s3)', color: 'var(--t3)' } : {}}
          onClick={handleConfirm}
          disabled={!selectedTime || submitting || cars.length === 0}>
          {submitting ? (
            <><span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />กำลังจอง...</>
          ) : selectedTime ? `ยืนยันการจอง — ${selectedDate} · ${selectedTime} น.` : 'กรุณาเลือกวันและเวลา'}
        </button>
      </div>

      <BottomNav />
    </div>
  )
}
