'use client'
import { useState } from 'react'
import { updateCar } from '@/lib/firebase/firestore'
import { Gauge, Calendar, AlertTriangle, CheckCircle2, Edit3 } from 'lucide-react'

export default function MaintenanceTracker({ car, onUpdated }) {
  const [showModal, setShowModal] = useState(false)
  const [newMileage, setNewMileage] = useState('')
  const [saving, setSaving] = useState(false)

  if (!car) return null

  const currentMileage    = Number(car.currentMileage || 0)
  const nextMileage       = Number(car.nextServiceMileage || 0)
  const nextDateStr       = car.nextServiceDate || null
  const serviceType       = car.lastServiceType || 'ตรวจเช็กระยะ / เปลี่ยนถ่ายน้ำมันเครื่อง'

  // ถ้ายังไม่เคยบันทึกรอบบริการเลย
  if (!nextMileage && !nextDateStr && !currentMileage) {
    return null
  }

  // คำนวณระยะทางคงเหลือ
  const kmRemaining = nextMileage > 0 ? nextMileage - currentMileage : null
  const isKmDue = kmRemaining !== null && kmRemaining <= 0
  const isKmNearDue = kmRemaining !== null && kmRemaining > 0 && kmRemaining <= 1000

  // คำนวณวันคงเหลือ
  let daysRemaining = null
  let isDateDue = false
  let isDateNearDue = false
  if (nextDateStr) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const target = new Date(nextDateStr)
    target.setHours(0, 0, 0, 0)
    const diffTime = target - today
    daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    isDateDue = daysRemaining <= 0
    isDateNearDue = daysRemaining > 0 && daysRemaining <= 15
  }

  // สถานะภาพรวม: "อันไหนอันหนึ่งมาถึงก่อน"
  const isOverdue = isKmDue || isDateDue
  const isNearDue = !isOverdue && (isKmNearDue || isDateNearDue)

  const handleUpdateOdometer = async (e) => {
    e.preventDefault()
    const kmNum = Number(newMileage)
    if (!kmNum || kmNum <= 0) return

    setSaving(true)
    try {
      await updateCar(car.id, {
        currentMileage: kmNum,
      })
      if (onUpdated) onUpdated()
      setShowModal(false)
      setNewMileage('')
    } catch (err) {
      console.warn('[updateOdometer]', err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="rounded-3xl p-4 md:p-5 border transition-all relative overflow-hidden"
      style={{
        background: isOverdue
          ? 'linear-gradient(135deg, var(--surf), var(--errdim))'
          : isNearDue
          ? 'linear-gradient(135deg, var(--surf), var(--adim))'
          : 'var(--surf)',
        borderColor: isOverdue
          ? 'var(--err)'
          : isNearDue
          ? 'var(--acc)'
          : 'var(--token)',
      }}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-2xl flex items-center justify-center"
            style={{
              background: isOverdue ? 'var(--errdim)' : isNearDue ? 'var(--adim)' : 'var(--s2)',
              color: isOverdue ? 'var(--err)' : isNearDue ? 'var(--acc)' : 'var(--t1)',
            }}
          >
            <Gauge size={20} />
          </div>
          <div>
            <h4 className="font-syne text-sm font-bold text-t1 leading-snug">
              การบำรุงรักษารอบถัดไป
            </h4>
            <p className="text-[11px] text-t3 truncate max-w-[200px] md:max-w-xs">
              {serviceType}
            </p>
          </div>
        </div>

        {/* Status Badge */}
        {isOverdue ? (
          <span className="badge-red text-[10px] px-2.5 py-1 font-bold flex items-center gap-1 shadow-xs animate-pulse">
            <AlertTriangle size={12} /> ถึงกำหนดแล้ว
          </span>
        ) : isNearDue ? (
          <span className="text-[10px] px-2.5 py-1 font-bold rounded-full bg-adim text-acc border border-acc/40 flex items-center gap-1 shadow-xs">
            ⚠️ ใกล้ถึงกำหนด
          </span>
        ) : (
          <span className="badge-green text-[10px] px-2.5 py-1 font-bold flex items-center gap-1">
            <CheckCircle2 size={12} /> ปกติ
          </span>
        )}
      </div>

      {/* Grid: ระยะทาง vs ระยะเวลา (คู่ขนาน) */}
      <div className="grid grid-cols-2 gap-2.5 my-3">
        {/* กล่องระยะทาง */}
        <div className="p-3 rounded-2xl bg-s2/70 border border-token flex flex-col justify-between">
          <div className="flex items-center gap-1 text-[11px] text-t3 mb-1">
            <Gauge size={13} />
            <span>เกณฑ์ระยะทาง</span>
          </div>
          {nextMileage > 0 ? (
            <div>
              <p className="font-syne text-base md:text-lg font-black text-t1">
                {kmRemaining !== null
                  ? kmRemaining > 0
                    ? `${kmRemaining.toLocaleString()} กม.`
                    : 'เลยกำหนดแล้ว'
                  : '-'}
              </p>
              <p className="text-[10px] text-t3 mt-0.5">
                เป้าหมาย: {nextMileage.toLocaleString()} กม.
              </p>
            </div>
          ) : (
            <p className="text-xs text-t3">ยังไม่ได้ระบุ</p>
          )}
        </div>

        {/* กล่องระยะเวลา */}
        <div className="p-3 rounded-2xl bg-s2/70 border border-token flex flex-col justify-between">
          <div className="flex items-center gap-1 text-[11px] text-t3 mb-1">
            <Calendar size={13} />
            <span>เกณฑ์ระยะเวลา</span>
          </div>
          {nextDateStr ? (
            <div>
              <p className="font-syne text-base md:text-lg font-black text-t1">
                {daysRemaining !== null
                  ? daysRemaining > 0
                    ? `อีก ${daysRemaining} วัน`
                    : 'ครบกำหนดแล้ว'
                  : '-'}
              </p>
              <p className="text-[10px] text-t3 mt-0.5">
                {new Date(nextDateStr).toLocaleDateString('th-TH', { month: 'short', day: 'numeric', year: '2-digit' })}
              </p>
            </div>
          ) : (
            <p className="text-xs text-t3">ยังไม่ได้ระบุ</p>
          )}
        </div>
      </div>

      {/* Rule Notice */}
      <div className="flex items-center justify-between text-[11px] text-t3 pt-2 border-t border-token/60">
        <span className="italic">
          * บำรุงรักษาเมื่อระยะทางหรือระยะเวลา <strong>อันไหนมาถึงก่อน</strong>
        </span>
        <button
          type="button"
          onClick={() => {
            setNewMileage(currentMileage ? String(currentMileage) : '')
            setShowModal(true)
          }}
          className="text-acc font-semibold hover:underline flex items-center gap-1 shrink-0 ml-2 cursor-pointer"
        >
          <Edit3 size={12} />
          <span>อัปเดตไมล์</span>
        </button>
      </div>

      {/* Current mileage badge */}
      {currentMileage > 0 && (
        <div className="mt-2 text-[10px] text-t3 flex items-center gap-1.5">
          <span>เลขไมล์ล่าสุดที่บันทึก:</span>
          <strong className="text-t1 font-mono">{currentMileage.toLocaleString()} กม.</strong>
        </div>
      )}

      {/* Modal อัปเดตเลขไมล์ด้วยตนเองสำหรับลูกค้า */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surf border border-token rounded-3xl p-6 w-full max-w-sm shadow-xl animate-scale-up">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-adim text-acc flex items-center justify-center">
                <Gauge size={18} />
              </div>
              <h3 className="font-syne text-base font-bold text-t1">อัปเดตเลขไมล์ปัจจุบัน</h3>
            </div>
            <p className="text-xs text-t2 mb-4 leading-relaxed">
              เมื่อสังเกตหน้าปัดไมล์รถ สามารถกรอกเพื่อคำนวณระยะคงเหลือก่อนถึงรอบเช็กระยะได้แม่นยำยิ่งขึ้น
            </p>

            <form onSubmit={handleUpdateOdometer}>
              <div className="mb-4">
                <label className="text-xs text-t2 font-medium block mb-1">
                  เลขไมล์บนหน้าปัด (กม.)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    required
                    autoFocus
                    className="input-field pr-12 font-mono text-base font-bold"
                    placeholder="เช่น 86500"
                    value={newMileage}
                    onChange={(e) => setNewMileage(e.target.value)}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-t3 font-medium">
                    กม.
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-s2 text-t2 border border-token hover:text-t1 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={saving || !newMileage}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white shadow-md cursor-pointer transition-opacity"
                  style={{ background: 'var(--acc)', opacity: saving ? 0.7 : 1 }}
                >
                  {saving ? 'กำลังบันทึก...' : 'ยืนยัน'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}