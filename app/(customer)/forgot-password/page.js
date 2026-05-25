'use client'
import { useState } from 'react'
import Link from 'next/link'
import { forgotPassword } from '@/lib/firebase/auth'

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState('')

  const handleSubmit = async () => {
    if (!/\S+@\S+\.\S+/.test(email)) { setError('รูปแบบอีเมลไม่ถูกต้อง'); return }
    setError(''); setLoading(true)
    try {
      await forgotPassword(email)
      setSent(true)
    } catch {
      setError('ส่งอีเมลไม่สำเร็จ กรุณาตรวจสอบอีเมลอีกครั้ง')
    } finally {
      setLoading(false)
    }
  }
  
  if (sent) {
    return (
      <div className="min-h-screen bg-token flex flex-col items-center justify-center px-5 text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mb-4"
          style={{ background: 'var(--gdim)', border: '2px solid var(--gbrd)' }}>
          📧
        </div>
        <h2 className="font-syne text-xl font-bold text-t1 mb-2">ส่งลิงก์แล้ว!</h2>
        <p className="text-t2 text-sm mb-2 leading-relaxed">
          ระบบส่งลิงก์รีเซ็ตรหัสผ่านไปยัง
        </p>
        <p className="text-acc font-semibold text-sm mb-6">{email}</p>
        <p className="text-t3 text-xs mb-8">กรุณาตรวจสอบ inbox และ spam folder</p>
        <Link href="/login" className="btn-primary px-8 py-3 rounded-2xl text-sm font-bold text-white"
          style={{ background: 'var(--acc)' }}>
          กลับไปหน้า Login
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-token flex flex-col justify-center px-5 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/login" className="w-8 h-8 bg-s2 rounded-xl flex items-center justify-center text-t2 text-sm">‹</Link>
        <span className="font-syne text-lg font-extrabold text-t1">
          Garage<span className="text-acc">Plus</span>
        </span>
      </div>

      <h2 className="font-syne text-2xl font-bold text-t1 mb-2">ลืมรหัสผ่าน?</h2>
      <p className="text-t2 text-sm mb-6 leading-relaxed">
        กรอกอีเมลที่ใช้สมัคร ระบบจะส่งลิงก์รีเซ็ตรหัสผ่านให้ทางอีเมล
      </p>

      {error && (
        <div className="mb-4 p-3 rounded-xl text-sm text-err"
          style={{ background: 'var(--errdim)', border: '0.5px solid rgba(232,92,58,.25)' }}>
          ⚠️ {error}
        </div>
      )}

      <div className="mb-6">
        <label className="field-label">อีเมล <span className="required-mark">*</span></label>
        <input className="input-field" type="email" placeholder="your@email.com"
          value={email} onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()} />
      </div>
      
      <button className="btn-primary flex items-center justify-center gap-2"
        onClick={handleSubmit} disabled={loading}>
        {loading ? (
          <><span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />กำลังส่ง...</>
        ) : 'ส่งลิงก์รีเซ็ตรหัสผ่าน'}
      </button>

      <p className="text-center text-sm text-t2 mt-4">
        จำรหัสผ่านได้แล้ว?{' '}
        <Link href="/login" className="text-acc font-bold">เข้าสู่ระบบ</Link>
      </p>
    </div>
  )
}
