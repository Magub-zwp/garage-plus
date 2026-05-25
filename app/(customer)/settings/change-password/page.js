'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { useAuthContext } from '@/context/AuthContext'
import { changePassword } from '@/lib/firebase/auth'
import BottomNav from '@/components/customer/BottomNav'

function getPwStrength(pw) {
  let s = 0
  if (pw.length >= 8) s+=25; if (pw.length >= 12) s+=15
  if (/[A-Z]/.test(pw)) s+=20; if (/[0-9]/.test(pw)) s+=20; if (/[^A-Za-z0-9]/.test(pw)) s+=20
  s = Math.min(s,100)
  if (s < 40) return { score:s, label:'อ่อนมาก', color:'var(--err)' }
  if (s < 70) return { score:s, label:'ปานกลาง', color:'var(--acc)' }
  return { score:s, label:'แข็งแกร่ง', color:'var(--grn)' }
}

export default function ChangePasswordPage() {
  const { firebaseUser } = useAuthContext()
  useAuth()
  // Form state
  const [form,    setForm]    = useState({ current:'', newPw:'', confirm:'' })
  const [show,    setShow]    = useState({ current:false, newPw:false, confirm:false })
  const [errors,  setErrors]  = useState({})
  const [success, setSuccess] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const strength = getPwStrength(form.newPw)

  // ตรวจว่า login ด้วย provider อะไร
  const providers = firebaseUser?.providerData?.map(p => p.providerId) || []
  const isEmailUser   = providers.includes('password')
  const isGoogleUser  = providers.includes('google.com')
  const isLineUser    = !isEmailUser && !isGoogleUser

  const validate = () => {
    const e = {}
    if (!form.current) e.current = 'กรุณากรอกรหัสผ่านปัจจุบัน'
    if (form.newPw.length < 8) e.newPw = 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร'
    if (form.newPw !== form.confirm) e.confirm = 'รหัสผ่านไม่ตรงกัน'
    if (form.newPw === form.current) e.newPw = 'รหัสผ่านใหม่ต้องไม่เหมือนรหัสผ่านเดิม'
    return e
  }

  const handleSubmit = async () => {
    const e = validate(); setErrors(e)
    if (Object.keys(e).length > 0) return
    setSaving(true)
    try {
      await changePassword(form.current, form.newPw)
      setSuccess(true)
    } catch(err) {
      if (['auth/wrong-password','auth/invalid-credential'].includes(err.code))
        setErrors({ current:'รหัสผ่านปัจจุบันไม่ถูกต้อง' })
      else setErrors({ submit:'เกิดข้อผิดพลาด กรุณาลองใหม่' })
    } finally { setSaving(false) }
  }

  // Google/LINE users cannot change password here
  if (isGoogleUser || isLineUser) {
    return (
      <div className="page-container pb-24">
        <div className="page-header">
          <Link href="/settings" className="back-btn">‹</Link>
          <h1 className="page-title">เปลี่ยนรหัสผ่าน</h1>
        </div>
        <div className="mx-4 mt-6 p-5 rounded-2xl"
          style={{ background:'var(--adim)', border:'0.5px solid var(--abrd)' }}>
          <div className="text-3xl mb-3 text-center">
            {isGoogleUser ? '🔑' : '💬'}
          </div>
          <p className="font-syne text-sm font-bold text-t1 text-center mb-2">
            {isGoogleUser ? 'บัญชี Google' : 'บัญชี LINE'}
          </p>
          <p className="text-xs text-t2 leading-relaxed text-center">
            {isGoogleUser
              ? 'คุณเข้าสู่ระบบด้วย Google\nการเปลี่ยนรหัสผ่านต้องทำผ่าน Google Account Settings'
              : 'คุณเข้าสู่ระบบด้วย LINE\nไม่มีรหัสผ่านสำหรับบัญชีประเภทนี้'}
          </p>
          {isGoogleUser && (
            <a href="https://myaccount.google.com/security"
              target="_blank" rel="noopener noreferrer"
              className="mt-4 block w-full py-3 rounded-2xl text-sm font-bold text-white text-center"
              style={{ background:'var(--acc)' }}>
              ไปที่ Google Account →
            </a>
          )}
        </div>
        <BottomNav />
      </div>
    )
  }
  // Email/password users can change password here
  if (success) return (
    <div className="min-h-screen bg-token flex flex-col items-center justify-center px-6 text-center">
      <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mb-4"
        style={{ background:'var(--gdim)', border:'2px solid var(--gbrd)' }}>✓</div>
      <h2 className="font-syne text-xl font-bold text-t1 mb-2">เปลี่ยนรหัสผ่านสำเร็จ</h2>
      <p className="text-sm text-t2 mb-6">กรุณาใช้รหัสผ่านใหม่ในการเข้าสู่ระบบครั้งถัดไป</p>
      <Link href="/settings" className="px-8 py-3 rounded-2xl text-sm font-bold text-white"
        style={{ background:'var(--acc)' }}>กลับไปการตั้งค่า</Link>
    </div>
  )
  // Render form for email/password users
  return (
    <div className="page-container pb-24">
      <div className="page-header">
        <Link href="/settings" className="back-btn">‹</Link>
        <h1 className="page-title">เปลี่ยนรหัสผ่าน</h1>
      </div>
      <div className="mx-4 mb-4 p-3 rounded-2xl text-xs text-t2 leading-relaxed border-token"
        style={{ background:'var(--s2)' }}>
        🔒 รหัสผ่านใหม่ควรมีความยาวอย่างน้อย 8 ตัวอักษร ประกอบด้วยตัวอักษรพิมพ์ใหญ่ ตัวเลข และอักขระพิเศษ
      </div>
      {errors.submit && (
        <div className="mx-4 mb-3 p-3 rounded-xl text-sm text-err"
          style={{ background:'var(--errdim)', border:'0.5px solid rgba(232,92,58,.25)' }}>
          ⚠️ {errors.submit}
        </div>
      )}
      <div className="px-4">
        {[
          { k:'current', label:'รหัสผ่านปัจจุบัน',  req:true },
          { k:'newPw',   label:'รหัสผ่านใหม่',        req:true, showStrength:true },
          { k:'confirm', label:'ยืนยันรหัสผ่านใหม่',  req:true },
        ].map(({ k, label, req, showStrength }) => (
          <div key={k} className="mb-3">
            <label className="field-label">{label} {req && <span className="required-mark">*</span>}</label>
            <div className="relative">
              <input className="input-field pr-10" type={show[k] ? 'text' : 'password'} placeholder="••••••••"
                value={form[k]} onChange={e => setForm({...form,[k]:e.target.value})} />
              <button type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-t3 text-sm border-none bg-transparent cursor-pointer"
                onClick={() => setShow({...show,[k]:!show[k]})}>
                {show[k] ? '🙈' : '👁'}
              </button>
            </div>
            {showStrength && form.newPw && (
              <div className="mt-1.5">
                <div className="h-1 rounded-full bg-s3 overflow-hidden">
                  <div className="h-full rounded-full transition-all"
                    style={{ width:`${strength.score}%`, background:strength.color }} />
                </div>
                <p className="text-xs mt-0.5" style={{ color:strength.color }}>{strength.label}</p>
              </div>
            )}
            {errors[k] && <p className="text-xs text-err mt-1">⚠️ {errors[k]}</p>}
          </div>
        ))}
        <button className="btn-primary mb-3 flex items-center justify-center gap-2"
          onClick={handleSubmit} disabled={saving}>
          {saving
            ? <><span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>กำลังบันทึก...</>
            : 'บันทึกรหัสผ่านใหม่'}
        </button>
        <Link href="/settings" className="block text-center text-sm text-t2 py-2">ยกเลิก</Link>
      </div>
      <BottomNav />
    </div>
  )
}
