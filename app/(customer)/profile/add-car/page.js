'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { addCar } from '@/lib/firebase/firestore'
import BottomNav from '@/components/customer/BottomNav'

const CAR_TYPES = [
  { key:'sedan',  icon:'🚗', label:'เก๋ง/SUV'      },
  { key:'pickup', icon:'🚙', label:'กระบะ'          },
  { key:'moto',   icon:'🏍️', label:'มอเตอร์ไซค์'   },
  { key:'van',    icon:'🚐', label:'รถตู้'           },
]
const BRANDS = ['Toyota','Honda','Isuzu','Ford','Mazda','Mitsubishi','Nissan','Suzuki','อื่นๆ (ระบุ)']

// Reusable form field component
function Field({ label, req, error, children }) {
  return (
    <div className="mb-3">
      <label className="field-label">
        {label} {req && <span className="required-mark">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-err mt-1">⚠️ {error}</p>}
    </div>
  )
}

export default function AddCarPage() {
  const router   = useRouter()
  const { uid }  = useAuth()
  const [type,   setType]   = useState('sedan')
  const [brand,  setBrand]  = useState('Toyota')
  const [form,   setForm]   = useState({ customBrand:'', model:'', year:'', plate:'', color:'', vin:'' })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const isOther = brand === 'อื่นๆ (ระบุ)'
  const set = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }))

  const validate = () => {
    const e = {}
    if (isOther && !form.customBrand.trim()) e.customBrand = 'กรุณาระบุยี่ห้อ'
    if (!form.model.trim()) e.model = 'กรุณากรอกรุ่น'
    const yr = parseInt(form.year)
    if (!form.year || yr < 1990 || yr > new Date().getFullYear() + 1) e.year = 'ปีผลิตไม่ถูกต้อง'
    if (!form.plate.trim()) e.plate = 'กรุณากรอกทะเบียนรถ'
    return e
  }
  
  const handleSubmit = async () => {
    const e = validate(); setErrors(e)
    if (Object.keys(e).length > 0) return
    setSaving(true)
    try {
      await addCar(uid, {
        type,
        brand:  isOther ? form.customBrand : brand,
        model:  form.model,
        year:   parseInt(form.year),
        plate:  form.plate.trim().toUpperCase(),
        color:  form.color,
        vin:    form.vin,
        isMain: false,
      })
      router.replace('/profile')
    } catch {
      setErrors({ submit: 'บันทึกไม่สำเร็จ กรุณาลองใหม่' })
    } finally {
      setSaving(false)
    }
  }
  
  return (
    <div className="page-container pb-24">
      <div className="page-header">
        <Link href="/profile" className="back-btn">‹</Link>
        <h1 className="page-title">เพิ่มรถคันใหม่</h1>
      </div>

      {/* Car type */}
      <p className="field-label px-4 pb-2">ประเภทรถ <span className="required-mark">*</span></p>
      <div className="grid grid-cols-4 gap-2 px-4 mb-4">
        {CAR_TYPES.map((t) => (
          <button key={t.key} onClick={() => setType(t.key)}
            className="bg-surf rounded-2xl py-3 text-center cursor-pointer border-none"
            style={type === t.key
              ? { border:'0.5px solid var(--abrd)', background:'var(--adim)' }
              : { border:'0.5px solid var(--brd)' }}>
            <div className="text-2xl mb-1">{t.icon}</div>
            <p className="text-xs font-semibold text-t1 leading-tight">{t.label}</p>
          </button>
        ))}
      </div>

      <div className="px-4">
        {errors.submit && (
          <div className="mb-3 p-3 rounded-xl text-sm text-err"
            style={{ background:'var(--errdim)', border:'0.5px solid rgba(232,92,58,.25)' }}>
            ⚠️ {errors.submit}
          </div>
        )}

        {/* Brand select */}
        <Field label="ยี่ห้อ" req>
          <select className="input-field" value={brand}
            onChange={(e) => setBrand(e.target.value)}
            style={{ appearance:'none' }}>
            {BRANDS.map((b) => <option key={b}>{b}</option>)}
          </select>
        </Field>

        {/* Custom brand */}
        {isOther && (
          <Field label="ระบุยี่ห้อ" req error={errors.customBrand}>
            <input className="input-field" placeholder="พิมพ์ยี่ห้อรถ..."
              value={form.customBrand} onChange={set('customBrand')} />
          </Field>
        )}

        {/* Model */}
        <Field label="รุ่น" req error={errors.model}>
          <input className="input-field" placeholder="เช่น Fortuner, Civic, D-Max"
            value={form.model} onChange={set('model')} />
        </Field>

        {/* Year */}
        <Field label="ปีที่ผลิต" req error={errors.year}>
          <input className="input-field" placeholder="เช่น 2022"
            type="number" min={1990} max={new Date().getFullYear() + 1}
            value={form.year} onChange={set('year')} />
        </Field>

        {/* Plate */}
        <Field label="ทะเบียนรถ" req error={errors.plate}>
          <input className="input-field" placeholder="เช่น ชม 1234"
            value={form.plate} onChange={set('plate')} />
        </Field>

        {/* Color */}
        <Field label="สีรถ">
          <input className="input-field" placeholder="เช่น ขาว, เทา, ดำ"
            value={form.color} onChange={set('color')} />
        </Field>

        {/* VIN */}
        <Field label="เลขตัวถัง VIN (ไม่บังคับ)">
          <input className="input-field"
            placeholder="17 หลัก — ช่วยสั่งอะไหล่ได้แม่นยำ"
            value={form.vin} onChange={set('vin')} maxLength={17} />
        </Field>

        <button className="btn-primary mb-3 flex items-center justify-center gap-2"
          onClick={handleSubmit} disabled={saving}>
          {saving
            ? <><span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>กำลังบันทึก...</>
            : 'เพิ่มรถ'}
        </button>
        <Link href="/profile" className="block text-center text-sm text-t2 py-2">ยกเลิก</Link>
      </div>

      <BottomNav />
    </div>
  )
}
