'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { loginWithEmail } from '@/lib/firebase/auth'
import { getSession, saveSession } from '@/lib/staff/session'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'

export default function StaffLoginPage() {
  const router = useRouter()
  const [role,    setRole]    = useState('admin')
  const [email,   setEmail]   = useState('')
  const [pw,      setPw]      = useState('')
  const [showPw,  setShowPw]  = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  useEffect(() => { if (getSession()) router.replace('/staff/dashboard') }, [])
// Function to handle staff login with email and password
  const handleLogin = async () => {
    if (!email || !pw) { setError('กรุณากรอกอีเมลและรหัสผ่าน'); return }
    setError(''); setLoading(true)
    try {
      const user = await loginWithEmail(email, pw)
      const snap = await getDoc(doc(db, 'staff', user.uid))
      if (!snap.exists()) { setError('บัญชีนี้ไม่มีสิทธิ์เข้าใช้ Staff Portal'); setLoading(false); return }
      const staffData = snap.data()
      if (staffData.role !== role) { setError(`บัญชีนี้เป็น ${staffData.role==='admin'?'Admin':'ช่าง'} ไม่ใช่ ${role==='admin'?'Admin':'ช่าง'}`); setLoading(false); return }
      saveSession({ uid:user.uid, name:staffData.name||email, role:staffData.role, email:user.email })
      router.replace(staffData.role === 'admin' ? '/staff/dashboard' : '/staff/mech/queue')
    } catch (e) {
      const msgs = { 'auth/invalid-credential':'อีเมลหรือรหัสผ่านไม่ถูกต้อง', 'auth/too-many-requests':'ลองหลายครั้งเกินไป', 'auth/invalid-email':'รูปแบบอีเมลไม่ถูกต้อง', 'auth/user-disabled':'บัญชีนี้ถูกระงับการใช้งาน' }
      setError(msgs[e.code] || 'เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-tok flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="bg-surf rounded-2xl border-tok2 p-7">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl bg-adim border-acc">⚙️</div>
            <div>
              <div className="font-syne text-lg font-extrabold text-t1">Garage<em style={{ color:'var(--acc)',fontStyle:'normal' }}>Plus</em></div>
              <div className="text-t3 uppercase tracking-widest" style={{ fontSize:10 }}>Staff Portal — 179 Auto</div>
            </div>
          </div>
          <h2 className="font-syne text-xl font-bold text-t1 mb-1">เข้าสู่ระบบ</h2>
          <p className="text-t2 text-xs mb-5">เลือก Role แล้วกรอกข้อมูล</p>

          <div className="grid grid-cols-2 gap-2 mb-5">
            {[{k:'admin',icon:'👑',t:'แอดมิน',s:'จัดการทั้งหมด'},{k:'mechanic',icon:'🔧',t:'ช่างซ่อม',s:'งานของตนเอง'}].map(r => (
              <button key={r.k} onClick={() => setRole(r.k)}
                className="rounded-xl p-3 text-center cursor-pointer transition-all"
                style={{ background:role===r.k?(r.k==='admin'?'var(--adim)':'var(--gdim)'):'var(--s2)', border:`0.5px solid ${role===r.k?(r.k==='admin'?'var(--abrd)':'var(--gbrd)'):'var(--brd2)'}` }}>
                <div style={{ fontSize:20 }} className="mb-1">{r.icon}</div>
                <div className="font-syne text-xs font-bold" style={{ color:role===r.k?(r.k==='admin'?'var(--acc)':'var(--grn)'):'var(--t1)' }}>{r.t}</div>
                <div className="text-t3 mt-0.5" style={{ fontSize:10 }}>{r.s}</div>
              </button>
            ))}
          </div>

          {error && <div className="mb-4 p-3 rounded-xl text-xs text-err bg-errdim" style={{ border:'0.5px solid rgba(232,92,58,.25)' }}>⚠️ {error}</div>}

          <div className="mb-3">
            <label className="field-label">อีเมล <span className="required-mark">*</span></label>
            <input className="input-field" type="email" placeholder="your@email.com" value={email} onChange={e=>setEmail(e.target.value)} />
          </div>
          <div className="mb-5">
            <label className="field-label">รหัสผ่าน <span className="required-mark">*</span></label>
            <div className="relative">
              <input className="input-field pr-10" type={showPw?'text':'password'} placeholder="••••••••" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleLogin()} />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-t3 text-sm border-none bg-transparent cursor-pointer" onClick={()=>setShowPw(!showPw)}>{showPw?'🙈':'👁'}</button>
            </div>
          </div>
          <button onClick={handleLogin} disabled={loading}
            className="w-full py-3 border-none rounded-xl font-syne text-sm font-extrabold text-white cursor-pointer flex items-center justify-center gap-2"
            style={{ background:role==='admin'?'var(--acc)':'var(--grn)' }}>
            {loading?<><span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>กำลังเข้า...</>:'เข้าสู่ระบบ'}
          </button>
        </div>
        <p className="text-center text-xs text-t3 mt-4">Staff Portal · Garage Plus v3.0</p>
      </div>
    </div>
  )
}
