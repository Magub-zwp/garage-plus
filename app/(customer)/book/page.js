'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useUser } from '@/hooks/useUser'
import { authFetch } from '@/lib/api/authFetch'
import BottomNav from '@/components/customer/BottomNav'
import AppIcon from '@/components/common/AppIcon'

const DAYS_TH     = ['อา','จ','อ','พ','พฤ','ศ','ส']
const OFF_DAYS    = [0, 6] // อาทิตย์, เสาร์
const SERVICE_OPTIONS = [
  { id: 'เปลี่ยนน้ำมัน', label: 'เปลี่ยนน้ำมันเครื่อง', icon: 'oil' },
  { id: 'ตรวจเช็ค',     label: 'ตรวจเช็คระยะ/ทั่วไป', icon: 'engine' },
  { id: 'เบรก',         label: 'ระบบเบรก/ผ้าเบรก',    icon: 'brake' },
  { id: 'ยาง',         label: 'ยางและตั้งศูนย์',     icon: 'tire' },
  { id: 'แบตเตอรี่',    label: 'แบตเตอรี่และไฟ',     icon: 'battery' },
  { id: 'ช่วงล่าง',     label: 'โช้คอัพและช่วงล่าง',  icon: 'shock' },
  { id: 'ระบบเกียร์',   label: 'เกียร์/ระบบส่งกำลัง', icon: 'gear' },
  { id: 'อื่นๆ',        label: 'งานซ่อมอื่นๆ',        icon: 'settings' },
]
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

  const todayMidnight = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])
  const [selectedDate, setSelectedDate] = useState(null)
  const [slotData,  setSlotData]  = useState({})
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
  const daysInMonth     = new Date(viewYear, viewMonth + 1, 0).getDate()
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
    if (!selectedDate) { setError('กรุณาเลือกวันที่ต้องการนัดหมาย'); return }
    if (!selectedTime) { setError('กรุณาเลือกช่วงเวลา'); return }
    if (services.length === 0) { setError('กรุณาเลือกประเภทงานซ่อมอย่างน้อย 1 รายการ'); return }
    if (!selectedCar) { setError('กรุณาเพิ่มรถหรือเลือกรถก่อนทำการจอง'); return }
    setError(''); setSubmitting(true)
    try {
      const res = await authFetch('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          date:         selectedDate,
          time:         selectedTime,
          carId:        selectedCar.id,
          carPlate:     selectedCar.plate,
          carName:      `${selectedCar.brand} ${selectedCar.model} ${selectedCar.year}`,
          customerName: user?.name || '',
          serviceType:  services,
          pickupType,
          note,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'ERROR')
      router.push(`/book/success?id=${data.bookingId}`)
    } catch (e) {
      if (e.message === 'SLOT_FULL') setError('ขออภัย คิวนี้เต็มแล้ว กรุณาเลือกเวลาอื่น')
      else setError('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง')
    } finally {
      setSubmitting(false)
    }
  }

  const MONTHS_TH_FULL = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']

  return (
    <div className="page-container pb-28 md:pb-12 pt-2 md:pt-4">
      
      {/* Mobile Page Header */}
      <div className="page-header px-4 md:px-0 mb-2">
        <Link href="/home" className="back-btn">‹</Link>
        <h1 className="page-title text-base md:text-xl font-bold">จองคิวรับบริการ</h1>
      </div>

      {/* Responsive 2-Column Booking Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 px-4 md:px-0">
        
        {/* Left Column (Desktop: 7 cols): Service Type, Calendar & Time Slots */}
        <div className="md:col-span-7 flex flex-col gap-4">
          
          {/* Pickup method */}
          <div className="bg-surf rounded-3xl p-4 border border-token shadow-xs">
            <p className="field-label pb-2 font-bold text-t2">รูปแบบการนำรถเข้ารับบริการ <span className="required-mark">*</span></p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'self',   icon: 'garage', title: 'นำรถมาเอง',   sub: 'นำเข้าอู่ 179 Auto Doi Saket' },
                { key: 'pickup', icon: 'home',   title: 'รับรถถึงบ้าน', sub: 'ช่างบริการรับ-ส่งถึงที่' },
              ].map((p) => {
                const isSelected = pickupType === p.key
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setPickupType(p.key)}
                    className={`rounded-2xl p-3.5 text-left border transition-all cursor-pointer flex items-center gap-3 ${
                      isSelected
                        ? 'border-acc bg-adim shadow-sm'
                        : 'border-token bg-s2/60 hover:bg-s2'
                    }`}
                  >
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isSelected ? 'bg-surf shadow-xs' : 'bg-surf/80'
                    }`}>
                      <AppIcon name={p.icon} size={24} />
                    </div>
                    <div>
                      <p className={`text-xs font-bold ${isSelected ? 'text-acc' : 'text-t1'}`}>{p.title}</p>
                      <p className="text-[11px] text-t3 mt-0.5">{p.sub}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Calendar picker */}
          <div className="bg-surf rounded-3xl p-4 md:p-5 border border-token shadow-xs">
            <div className="flex justify-between items-center mb-3">
              <div>
                <p className="field-label pb-0.5 font-bold text-t2">เลือกวันที่ต้องการจอง <span className="required-mark">*</span></p>
                <p className="text-xs text-t3">เปิดให้บริการวันจันทร์ - เสาร์ (หยุดวันอาทิตย์)</p>
              </div>
              <div className="flex items-center gap-1.5 bg-s2 p-1 rounded-xl border border-token">
                <button
                  type="button"
                  onClick={prevMonth}
                  className="w-7 h-7 bg-surf hover:bg-s3 rounded-lg flex items-center justify-center text-t1 text-sm cursor-pointer border-none shadow-xs"
                >
                  ‹
                </button>
                <span className="font-syne text-xs font-bold text-t1 px-2">
                  {MONTHS_TH_FULL[viewMonth]} {viewYear + 543}
                </span>
                <button
                  type="button"
                  onClick={nextMonth}
                  className="w-7 h-7 bg-surf hover:bg-s3 rounded-lg flex items-center justify-center text-t1 text-sm cursor-pointer border-none shadow-xs"
                >
                  ›
                </button>
              </div>
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-1 text-center mb-1">
              {DAYS_TH.map((d, idx) => (
                <div key={d} className={`py-1 text-xs font-bold ${idx === 0 ? 'text-err' : 'text-t3'}`}>
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                <div key={`empty-${i}`} className="h-9" />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1
                const disabled = isDayDisabled(day)
                const dateStr = toDateStr(viewYear, viewMonth, day)
                const isSelected = selectedDate === dateStr
                const isToday = dateStr === toDateStr(today.getFullYear(), today.getMonth(), today.getDate())

                return (
                  <button
                    key={day}
                    type="button"
                    disabled={disabled}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`h-9 rounded-xl text-xs font-semibold transition-all cursor-pointer flex flex-col items-center justify-center relative ${
                      isSelected
                        ? 'bg-acc text-white shadow-md font-bold'
                        : isToday
                        ? 'bg-adim text-acc border border-acc'
                        : disabled
                        ? 'text-t3 opacity-30 cursor-not-allowed'
                        : 'bg-s2 hover:bg-s3 text-t1'
                    }`}
                  >
                    <span>{day}</span>
                    {isToday && !isSelected && (
                      <span className="w-1 h-1 rounded-full bg-acc absolute bottom-1" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Time Slots */}
          {selectedDate && (
            <div className="bg-surf rounded-3xl p-4 md:p-5 border border-token shadow-xs">
              <div className="flex justify-between items-center mb-3">
                <p className="field-label pb-0 font-bold text-t2">ช่วงเวลานัดหมาย <span className="required-mark">*</span></p>
                <span className="text-xs text-acc font-semibold">วันที่ {selectedDate}</span>
              </div>

              {slotsLoading ? (
                <div className="flex items-center justify-center py-6 gap-2 text-xs text-t2">
                  <span
                    className="inline-block w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
                    style={{ borderColor: 'var(--acc)', borderTopColor: 'transparent' }}
                  />
                  <span>กำลังตรวจสอบคิวว่าง...</span>
                </div>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-4 gap-2">
                  {TIME_SLOTS.map((t) => {
                    const s = slotData[t]
                    const isFull = s ? (s.isFull ?? (s.max != null && s.booked != null ? s.booked >= s.max : false)) : false
                    const isSel = selectedTime === t

                    return (
                      <button
                        key={t}
                        type="button"
                        disabled={isFull}
                        onClick={() => setSelectedTime(t)}
                        className={`py-2.5 px-2 rounded-2xl text-center transition-all cursor-pointer border flex flex-col items-center justify-center ${
                          isSel
                            ? 'bg-acc text-white border-acc shadow-sm'
                            : isFull
                            ? 'bg-s2 border-token opacity-40 cursor-not-allowed'
                            : 'bg-s2 hover:bg-s3 border-token text-t1'
                        }`}
                      >
                        <span className={`text-xs font-bold ${isSel ? 'text-white' : 'text-t1'}`}>{t} น.</span>
                        <span
                          className={`text-[9px] mt-0.5 ${
                            isSel ? 'text-white/90' : isFull ? 'text-err font-medium' : 'text-grn font-semibold'
                          }`}
                        >
                          {isFull ? 'เต็ม' : isSel ? 'เลือกแล้ว' : 'ว่าง'}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Right Column (Desktop: 5 cols): Car Selection, Services, Notes & Confirmation */}
        <div className="md:col-span-5 flex flex-col gap-4">
          
          {/* Car selector */}
          <div className="bg-surf rounded-3xl p-4 md:p-5 border border-token shadow-xs">
            <div className="flex justify-between items-center mb-2">
              <p className="field-label pb-0 font-bold text-t2">รถของคุณ <span className="required-mark">*</span></p>
              <Link href="/profile/add-car" className="text-xs text-acc font-semibold hover:underline">
                + เพิ่มรถใหม่
              </Link>
            </div>

            {cars.length === 0 ? (
              <div
                className="p-4 rounded-2xl flex gap-3 items-center cursor-pointer bg-adim border border-dashed border-acc"
                onClick={() => router.push('/profile/add-car')}
              >
                <div className="w-10 h-10 rounded-xl bg-surf flex items-center justify-center shadow-xs">
                  <AppIcon name="car" size={24} />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-t1">ยังไม่มีรถในบัญชี</p>
                  <p className="text-[11px] text-acc mt-0.5">กดที่นี่เพื่อเพิ่มข้อมูลรถก่อนจอง →</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {cars.map((car) => {
                  const isChosen = selectedCar?.id === car.id
                  return (
                    <button
                      key={car.id}
                      type="button"
                      onClick={() => setSelectedCar(car)}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-2xl border transition-all text-left cursor-pointer ${
                        isChosen
                          ? 'border-acc bg-adim shadow-sm'
                          : 'border-token bg-s2/60 hover:bg-s2'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-xl bg-surf border border-token flex items-center justify-center flex-shrink-0">
                        <AppIcon name="car" size={24} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-t1 truncate">
                          {car.brand} {car.model} {car.year}
                        </p>
                        <p className="text-[11px] text-t2 font-medium">{car.plate}</p>
                      </div>
                      {isChosen && (
                        <span className="w-5 h-5 rounded-full bg-acc text-white flex items-center justify-center text-[10px] font-bold">
                          ✓
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Service options grid */}
          <div className="bg-surf rounded-3xl p-4 md:p-5 border border-token shadow-xs">
            <p className="field-label pb-2 font-bold text-t2">ประเภทงานที่ต้องการซ่อม/บริการ <span className="required-mark">*</span></p>
            <div className="grid grid-cols-2 gap-2">
              {SERVICE_OPTIONS.map((s) => {
                const isChecked = services.includes(s.id)
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleService(s.id)}
                    className={`p-2.5 rounded-2xl border transition-all text-left flex items-center gap-2.5 cursor-pointer ${
                      isChecked
                        ? 'border-acc bg-adim shadow-xs'
                        : 'border-token bg-s2/60 hover:bg-s2'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isChecked ? 'bg-surf shadow-xs' : 'bg-surf/70'
                    }`}>
                      <AppIcon name={s.icon} size={20} />
                    </div>
                    <span className={`text-xs font-medium leading-tight ${
                      isChecked ? 'text-acc font-bold' : 'text-t1'
                    }`}>
                      {s.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Notes */}
          <div className="bg-surf rounded-3xl p-4 border border-token shadow-xs">
            <p className="field-label pb-1.5 font-bold text-t2">หมายเหตุหรืออาการเพิ่มเติม</p>
            <textarea
              className="input-field resize-none rounded-2xl"
              style={{ height: 68, fontSize: 13 }}
              placeholder="แจ้งอาการผิดปกติ เสียงดัง หรือข้อกำหนดพิเศษ..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {/* Error notice */}
          {error && (
            <div
              className="p-3.5 rounded-2xl text-xs text-err flex items-center gap-2 font-medium"
              style={{ background: 'var(--errdim)', border: '0.5px solid rgba(232,92,58,.25)' }}
            >
              ⚠️ {error}
            </div>
          )}

          {/* Booking Summary & Confirm Button */}
          <div className="bg-surf rounded-3xl p-4 border border-token shadow-sm">
            <div className="text-xs text-t2 space-y-1 mb-3 pb-3 border-b border-token">
              <div className="flex justify-between">
                <span>รถ:</span>
                <span className="font-semibold text-t1">{selectedCar ? `${selectedCar.brand} ${selectedCar.plate}` : '-'}</span>
              </div>
              <div className="flex justify-between">
                <span>วันเวลา:</span>
                <span className="font-semibold text-t1">{selectedDate && selectedTime ? `${selectedDate} · ${selectedTime} น.` : 'ยังไม่ระบุ'}</span>
              </div>
              <div className="flex justify-between">
                <span>งานซ่อม:</span>
                <span className="font-semibold text-acc">{services.length > 0 ? services.join(', ') : 'ยังไม่เลือก'}</span>
              </div>
            </div>

            <button
              type="button"
              className="btn-primary flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={(!selectedTime || submitting || !selectedDate) ? { background: 'var(--s3)', color: 'var(--t3)' } : {}}
              onClick={handleConfirm}
              disabled={!selectedDate || !selectedTime || submitting || cars.length === 0}
            >
              {submitting ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>กำลังบันทึกการจอง...</span>
                </>
              ) : selectedTime ? (
                `ยืนยันการจองคิว (${selectedTime} น.)`
              ) : (
                'กรุณาเลือกวันและเวลา'
              )}
            </button>
          </div>

        </div>

      </div>

      <BottomNav />
    </div>
  )
}
