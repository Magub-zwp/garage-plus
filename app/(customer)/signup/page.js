'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useGuestOnly } from '@/hooks/useAuth'
import { registerWithEmail, getDefaultRoute } from '@/lib/firebase/auth'

function getPwStrength(pw) {
  let s = 0
  if (pw.length >= 8) s += 25; if (pw.length >= 12) s += 15
  if (/[A-Z]/.test(pw)) s += 20; if (/[0-9]/.test(pw)) s += 20
  if (/[^A-Za-z0-9]/.test(pw)) s += 20
  s = Math.min(s, 100)
  if (s < 40) return { score: s, label: 'อ่อนมาก', color: 'var(--err)' }
  if (s < 70) return { score: s, label: 'ปานกลาง', color: 'var(--acc)' }
  return { score: s, label: 'แข็งแกร่ง', color: 'var(--grn)' }
}
// Reusable form field component
function F ({ k, label, req, form, setForm, errors, ...rest }) {
  return (
    <div className="mb-3">
      <label className="field-label">{label} {req && <span className="required-mark">*</span>}</label>
      <input className="input-field" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} {...rest} />
      {errors[k] && <p className="text-xs text-err mt-1">⚠️ {errors[k]}</p>}
    </div>
  )
}
// Main Sign-Up Page Component
export default function SignUpPage() {
  const router = useRouter()
  useGuestOnly()
  const [showPw,          setShowPw]          = useState(false)
  const [loading,         setLoading]         = useState(false)
  const [consentPrivacy,  setConsentPrivacy]  = useState(false) // บังคับ
  const [consentMarketing,setConsentMarketing]= useState(false) // ไม่บังคับ
  const [form,            setForm]            = useState({ name:'', phone:'', lineId:'', email:'', password:'', confirmPw:'' })
  const [errors,          setErrors]          = useState({})
  const pw = getPwStrength(form.password)
  // Validate form fields before submission
  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'กรุณากรอกชื่อ-นามสกุล'
    if (!/^0[0-9]{8,9}$/.test(form.phone.replace(/-/g, ''))) e.phone = 'รูปแบบเบอร์โทรไม่ถูกต้อง'
    if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'รูปแบบอีเมลไม่ถูกต้อง'
    if (form.password.length < 8) e.password = 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร'
    if (form.password !== form.confirmPw) e.confirmPw = 'รหัสผ่านไม่ตรงกัน'
    if (!consentPrivacy) e.consent = 'กรุณายอมรับนโยบายความเป็นส่วนตัวก่อนสมัครสมาชิก'
    return e
  }
  // Handle form submission and user registration
  const handleSubmit = async () => {
    const e = validate(); setErrors(e)
    if (Object.keys(e).length > 0) return
    setLoading(true)
    try {
      const user = await registerWithEmail(form.email, form.password, {
        name:             form.name,
        phone:            form.phone,
        lineId:           form.lineId,
        // PDPA fields — สำคัญต้องบันทึก
        consentAccepted:  true,
        consentDate:      new Date().toISOString(),   // วันเวลาที่ยอมรับ
        consentVersion:   '1.0',                       // version Privacy Policy
        marketingConsent: consentMarketing,
      })
      const route = await getDefaultRoute(user.uid)
      router.replace(route)
    } catch (err) {
      const msg = { 'auth/email-already-in-use': 'อีเมลนี้ถูกใช้งานแล้ว' }[err.code] || 'เกิดข้อผิดพลาด กรุณาลองใหม่'
      setErrors({ submit: msg })
    } finally { setLoading(false) }
  }
  
  
  // Custom checkbox component for consent options
  const Checkbox = ({ checked, onChange, children, required }) => (
    <div className="flex items-start gap-3 rounded-xl p-3 mb-3"
      style={{ background: checked ? 'var(--gdim)' : 'var(--s2)', border: `0.5px solid ${checked ? 'var(--gbrd)' : 'var(--brd)'}` }}>
      <button type="button"
        className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold text-white border-none cursor-pointer"
        style={{ background: checked ? 'var(--grn)' : 'var(--s3)', border: '0.5px solid var(--brd2)', minWidth: 20 }}
        onClick={onChange}>
        {checked ? '✓' : ''}
      </button>
      <p className="text-xs text-t2 leading-relaxed">
        {required && <span className="text-err font-bold">[จำเป็น] </span>}
        {children}
      </p>
    </div>
  )
// If registration is successful, show confirmation message
  return (
    <div className="min-h-screen bg-token flex flex-col px-5 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl"
          style={{ background: 'var(--adim)', border: '1.5px solid var(--abrd)' }}>⚙️</div>
        <span className="font-syne text-lg font-extrabold text-t1">Garage<span className="text-acc">Plus</span></span>
      </div>
      <h2 className="font-syne text-2xl font-bold text-t1 mb-1">สมัครสมาชิก</h2>
      <p className="text-t2 text-sm mb-5">179 Auto · Doi Saket · <span className="text-err text-xs">* จำเป็นต้องกรอก</span></p>

      {errors.submit && (
        <div className="mb-4 p-3 rounded-xl text-sm text-err"
        style={{ background: 'var(--errdim)', border: '0.5px solid rgba(232,92,58,.25)' }}>⚠️ {errors.submit}</div>
      )}

      <F k="name"   label="ชื่อ-นามสกุล"   req placeholder="กรอกชื่อ-นามสกุล" form={form} setForm={setForm} errors={errors} />
      <F k="phone"  label="เบอร์โทรศัพท์"  req placeholder="0XX-XXX-XXXX" type="tel" form={form} setForm={setForm} errors={errors} />
      <F k="lineId" label="LINE ID"          placeholder="@lineID (ไม่บังคับ)" form={form} setForm={setForm} errors={errors} />
      <F k="email"  label="อีเมล"           req placeholder="your@email.com" type="email" form={form} setForm={setForm} errors={errors} />

      <div className="mb-3">
        <label className="field-label">รหัสผ่าน <span className="required-mark">*</span></label>
        <div className="relative">
          <input className="input-field pr-10"
            type={showPw ? 'text' : 'password'} placeholder="อย่างน้อย 8 ตัวอักษร"
            value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <button type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-t3 text-sm border-none bg-transparent cursor-pointer"
            onClick={() => setShowPw(!showPw)}>{showPw ? '🙈' : '👁'}</button>
        </div>
        {form.password && (
          <div className="mt-1.5">
            <div className="h-1 rounded-full bg-s3 overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${pw.score}%`, background: pw.color }} />
            </div>
            <p className="text-xs mt-0.5" style={{ color: pw.color }}>{pw.label}</p>
          </div>
        )}
        {errors.password && <p className="text-xs text-err mt-1">⚠️ {errors.password}</p>}
      </div>
      {/* Confirm password field with validation */}
      <div className="mb-4">
        <label className="field-label">ยืนยันรหัสผ่าน <span className="required-mark">*</span></label>
        <input className="input-field"
          type="password" placeholder="••••••••"
          value={form.confirmPw} onChange={(e) => setForm({ ...form, confirmPw: e.target.value })} />
        {errors.confirmPw && <p className="text-xs text-err mt-1">⚠️ {errors.confirmPw}</p>}
      </div>

      {/* PDPA Consent Section */}
      <div className="mb-1">
        <p className="text-xs font-bold text-t3 uppercase tracking-widest mb-2">ความยินยอม (PDPA)</p>

        <Checkbox
          checked={consentPrivacy}
          onChange={() => setConsentPrivacy(!consentPrivacy)}
          required>
          ฉันยินยอมให้ 179 Auto เก็บรวบรวมและใช้ข้อมูลส่วนบุคคลของฉัน
          ตาม <Link href="/privacy-policy" className="text-acc font-semibold underline">นโยบายความเป็นส่วนตัว (PDPA)</Link>
          เพื่อให้บริการจองคิวและติดตามงานซ่อมรถ
        </Checkbox>

        <Checkbox
          checked={consentMarketing}
          onChange={() => setConsentMarketing(!consentMarketing)}>
          ฉันยินยอมรับข่าวสาร โปรโมชั่น และแจ้งเตือนการบำรุงรักษา
          ผ่าน Push Notification และ LINE (ไม่บังคับ — ยกเลิกได้ทุกเมื่อในหน้าตั้งค่า)
        </Checkbox>

        {errors.consent && <p className="text-xs text-err -mt-2 mb-3">⚠️ {errors.consent}</p>}
      </div>
      {/* Submit button — disabled ถ้า privacy consent ยังไม่ถูกเลือก */}
      <button
        className="btn-primary flex items-center justify-center gap-2 mb-4"
        onClick={handleSubmit}
        disabled={loading || !consentPrivacy}
        style={!consentPrivacy ? { background: 'var(--s3)', color: 'var(--t3)' } : {}}>
        {loading
          ? <><span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />กำลังสร้างบัญชี...</>
          : !consentPrivacy ? 'กรุณายอมรับนโยบายก่อน' : 'สร้างบัญชี'}
      </button>

      <p className="text-center text-sm text-t2">
        มีบัญชีแล้ว?{' '}
        <Link href="/login" className="text-acc font-bold">เข้าสู่ระบบ</Link>
      </p>
    </div>
  )
}
