'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useGuestOnly } from '@/hooks/useAuth'
import { loginWithEmail, loginWithGoogle, getDefaultRoute } from '@/lib/firebase/auth'
import { signInWithCustomToken } from 'firebase/auth'
import { auth } from '@/lib/firebase/config'

export default function LoginPage() {
  const router  = useRouter()
  const params  = useSearchParams()
  useGuestOnly()

  const [showPw,  setShowPw]  = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [form,    setForm]    = useState({ email: '', password: '' })
  const redirectTimerRef = useRef(null)

  // รับ flag line_auth=1 ที่ callback redirect มาให้ แล้ว fetch token จาก http-only cookie
  // (token ไม่โผล่ใน URL อีกต่อไป — ป้องกัน token leak ใน browser history)
  useEffect(() => {
    const lineAuth    = params.get('line_auth')
    const returnState = params.get('state')
    const lineError   = params.get('error')

    if (lineError) {
      setError('เข้าสู่ระบบด้วย LINE ไม่สำเร็จ กรุณาลองใหม่')
      return
    }
    if (lineAuth !== '1') return

    // ตรวจสอบ CSRF state ฝั่ง client
    const savedState = sessionStorage.getItem('line_oauth_state')
    sessionStorage.removeItem('line_oauth_state')
    if (savedState && returnState && returnState !== savedState) {
      setError('เกิดข้อผิดพลาดด้านความปลอดภัย กรุณาลองใหม่')
      return
    }

    setLoading(true)
    fetch('/api/auth/line/token')
      .then((r) => r.json())
      .then(async ({ token, error }) => {
        if (error || !token) throw new Error('no_token')
        const cred = await signInWithCustomToken(auth, token)
        const route = await getDefaultRoute(cred.user.uid)
        router.replace(route)
      })
      .catch(() => setError('LINE token ไม่ถูกต้อง กรุณาลองใหม่'))
      .finally(() => setLoading(false))
  }, [params])

  // cleanup timer on unmount
  useEffect(() => () => clearTimeout(redirectTimerRef.current), [])

  const handleLogin = async () => {
    if (!form.email || !form.password) { setError('กรุณากรอกอีเมลและรหัสผ่าน'); return }
    if (!/\S+@\S+\.\S+/.test(form.email)) { setError('รูปแบบอีเมลไม่ถูกต้อง'); return }
    setError(''); setLoading(true)
    try {
      const user = await loginWithEmail(form.email, form.password)
      const route = await getDefaultRoute(user.uid)
      router.replace(route)
    } catch (e) {
      const msgs = {
        'auth/user-not-found':     'ไม่พบบัญชีผู้ใช้นี้',
        'auth/wrong-password':     'รหัสผ่านไม่ถูกต้อง',
        'auth/invalid-credential': 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
        'auth/too-many-requests':  'ลองหลายครั้งเกินไป กรุณารอสักครู่',
      }
      setError(msgs[e.code] || 'เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally { setLoading(false) }
  }

  // เช็คว่ากำลังเข้าเว็บผ่าน origin ที่ไม่ปลอดภัยอยู่หรือไม่ (เช่น http://<LAN-IP>:3000)
  // เพราะ origin แบบนี้จะทำให้ Google/LINE OAuth ล้ม (redirect_uri / authorized domain ไม่ตรงที่ลงทะเบียนไว้)
  // ใช้เช็คก่อนเริ่ม flow login เพื่อเตือนผู้ใช้ให้ชัดเจนแทนที่จะปล่อยให้ login ล้มแบบงงๆ
  const isUnsafeOrigin = () =>
    typeof window !== 'undefined' &&
    location.protocol === 'http:' &&
    !['localhost', '127.0.0.1'].includes(location.hostname)

  // ตั้ง timeout ไว้สำรอง เผื่อ redirect กลับจาก Google ถูกบล็อกบนมือถือ (เช่น popup/redirect ไม่ทำงาน)
  // ถ้าครบเวลาแล้วยังไม่มี user กลับมา จะตัด loading แล้วแจ้ง error ให้ผู้ใช้รู้ ไม่ปล่อยให้หน้าค้าง
  const handleGoogle = async () => {
    setError(''); setLoading(true)
    clearTimeout(redirectTimerRef.current)
    if (isUnsafeOrigin()) {
      setLoading(false)
      setError(`Google ใช้ไม่ได้บน ${location.host} — ต้องเข้าผ่าน localhost หรือโดเมน HTTPS (Vercel) ที่เพิ่มไว้ใน Firebase Authorized domains`)
      return
    }
    try {
      const user = await loginWithGoogle()
      if (user) {
        const route = await getDefaultRoute(user.uid)
        router.replace(route)
      } else {
        redirectTimerRef.current = setTimeout(() => {
          setLoading(false)
          setError('Google Sign-In ใช้งานไม่ได้บน IP/port นี้ กรุณาเพิ่ม Authorized domain ใน Firebase Console')
        }, 6000)
      }
    } catch {
      setError('เข้าสู่ระบบด้วย Google ไม่สำเร็จ กรุณาลองใหม่')
      setLoading(false)
    }
  }

  // สร้างและบันทึก state แบบสุ่มไว้ใน sessionStorage ก่อน redirect ไป LINE
  // เพื่อใช้ตรวจสอบ (CSRF protection) ตอนรับ callback กลับมาว่าเป็น request ที่เราเริ่มเองจริง
  const handleLine = () => {
    const channelId = process.env.NEXT_PUBLIC_LINE_CHANNEL_ID
    if (!channelId || channelId === '1234567890') {
      setError('LINE Login ยังไม่ได้ตั้งค่า (NEXT_PUBLIC_LINE_CHANNEL_ID)')
      return
    }
    if (isUnsafeOrigin()) {
      // redirect_uri จะกลายเป็น http://<LAN-IP>/... ซึ่งไม่ตรงกับ Callback URL ใน LINE Console
      setError(`LINE Login ใช้ไม่ได้บน ${location.host} — Callback URL ต้องตรงกับที่ลงทะเบียนใน LINE Console (ใช้โดเมน HTTPS/Vercel)`)
      return
    }
    const state = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
    sessionStorage.setItem('line_oauth_state', state) // บันทึกไว้ verify หลัง callback
    const redirect = encodeURIComponent(`${window.location.origin}/api/auth/line/callback`)
    const url = `https://access.line.me/oauth2/v2.1/authorize?` +
      `response_type=code&client_id=${channelId}&redirect_uri=${redirect}` +
      `&state=${state}&scope=profile%20openid`
    window.location.href = url
  }

  return (
    <div className="min-h-screen bg-token flex flex-col justify-center px-5 py-8">
      <div className="flex items-center gap-3 mb-7">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl"
          style={{ background: 'var(--adim)', border: '1.5px solid var(--abrd)' }}>⚙️</div>
        <span className="font-syne text-lg font-extrabold text-t1">Garage<span className="text-acc">Plus</span></span>
      </div>

      <h2 className="font-syne text-2xl font-bold text-t1 mb-1">ยินดีต้อนรับ 👋</h2>
      <p className="text-t2 text-sm mb-6">179 Auto · Doi Saket · เข้าสู่ระบบเพื่อจัดการรถของคุณ</p>

      {error && (
        <div className="mb-4 p-3 rounded-xl text-sm text-err flex gap-2"
          style={{ background: 'var(--errdim)', border: '0.5px solid rgba(232,92,58,.25)' }}>
          ⚠️ {error}
        </div>
      )}

      <div className="mb-3">
        <label className="field-label">อีเมล <span className="required-mark">*</span></label>
        <input className="input-field" type="email" placeholder="your@email.com"
          value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      </div>

      <div className="mb-2">
        <label className="field-label">รหัสผ่าน <span className="required-mark">*</span></label>
        <div className="relative">
          <input className="input-field pr-10" type={showPw ? 'text' : 'password'}
            placeholder="••••••••" value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()} />
          <button type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-t3 text-sm border-none bg-transparent cursor-pointer"
            onClick={() => setShowPw(!showPw)}>{showPw ? '🙈' : '👁'}</button>
        </div>
      </div>

      <div className="text-right mb-5">
        <Link href="/forgot-password" className="text-xs text-acc font-semibold">ลืมรหัสผ่าน?</Link>
      </div>

      <button className="btn-primary mb-4 flex items-center justify-center gap-2"
        onClick={handleLogin} disabled={loading}>
        {loading
          ? <><span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />กำลังเข้าสู่ระบบ...</>
          : 'เข้าสู่ระบบ'}
      </button>

      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-px" style={{ background: 'var(--brd2)' }} />
        <span className="text-xs text-t3">หรือเข้าสู่ระบบด้วย</span>
        <div className="flex-1 h-px" style={{ background: 'var(--brd2)' }} />
      </div>

      <div className="grid grid-cols-2 gap-2 mb-6">
        <button onClick={handleGoogle} disabled={loading}
          className="py-3 bg-surf rounded-xl text-xs font-semibold border-none cursor-pointer flex items-center justify-center gap-2"
          style={{ border: '0.5px solid var(--brd2)' }}>
          🔵 Google
        </button>
        <button onClick={handleLine} disabled={loading}
          className="py-3 rounded-xl text-xs font-bold border-none cursor-pointer flex items-center justify-center gap-2 text-white"
          style={{ background: '#00B900' }}>
          💬 LINE
        </button>
      </div>

      <p className="text-center text-sm text-t2">
        ยังไม่มีบัญชี?{' '}
        <Link href="/signup" className="text-acc font-bold">สมัครสมาชิก</Link>
      </p>
    </div>
  )
}
