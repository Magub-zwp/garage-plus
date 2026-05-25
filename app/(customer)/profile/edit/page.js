'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useUser } from '@/hooks/useUser'
import { updateUserDocument } from '@/lib/firebase/firestore'
import BottomNav from '@/components/customer/BottomNav'

export default function EditProfilePage() {
  const router = useRouter()
  const { uid } = useAuth()
  const { user } = useUser()
  const [form,    setForm]    = useState({ name:'', phone:'', lineId:'', birthday:'' })
  const [saving,  setSaving]  = useState(false)
  const [success, setSuccess] = useState(false)
  const [error,   setError]   = useState('')
  // Load user data into form when available
  useEffect(() => {
    if (user) setForm({ name: user.name||'', phone: user.phone||'', lineId: user.lineId||'', birthday: user.birthday||'' })
  }, [user])

  const handleSave = async () => {
    if (!form.name.trim()) { setError('กรุณากรอกชื่อ-นามสกุล'); return }
    if (!/^0[0-9]{8,9}$/.test(form.phone.replace(/-/g,''))) { setError('รูปแบบเบอร์โทรไม่ถูกต้อง'); return }
    setError(''); setSaving(true)
    try {
      await updateUserDocument(uid, { name: form.name, phone: form.phone, lineId: form.lineId, birthday: form.birthday })
      setSuccess(true)
      setTimeout(() => router.replace('/profile'), 1000)
    } catch { setError('บันทึกไม่สำเร็จ กรุณาลองใหม่') }
    finally { setSaving(false) }
  }
  
  return (
    <div className="page-container pb-24">
      <div className="page-header">
        <Link href="/profile" className="back-btn">‹</Link>
        <h1 className="page-title">แก้ไขโปรไฟล์</h1>
      </div>
      <div className="flex flex-col items-center py-5">
        <div className="w-16 h-16 rounded-full flex items-center justify-center font-syne text-2xl font-extrabold text-white mb-2"
          style={{ background: 'linear-gradient(135deg,var(--acc),#c96e25)' }}>
          {user?.name?.substring(0,2) || '??'}
        </div>
        <button className="text-xs font-semibold text-acc">เปลี่ยนรูปโปรไฟล์</button>
      </div>
      <div className="px-4">
        {error && <div className="mb-4 p-3 rounded-xl text-sm text-err" style={{ background:'var(--errdim)', border:'0.5px solid rgba(232,92,58,.25)' }}>⚠️ {error}</div>}
        {success && <div className="mb-4 p-3 rounded-xl text-sm text-grn" style={{ background:'var(--gdim)', border:'0.5px solid var(--gbrd)' }}>✓ บันทึกสำเร็จ</div>}
        {[
          { k:'name',     label:'ชื่อ-นามสกุล',  req:true, placeholder:'กรอกชื่อ-นามสกุล' },
          { k:'phone',    label:'เบอร์โทรศัพท์', req:true, placeholder:'08X-XXX-XXXX', note:'⚠️ การเปลี่ยนเบอร์จะต้องยืนยัน OTP' },
          { k:'lineId',   label:'LINE ID',        req:false, placeholder:'@lineID' },
          { k:'birthday', label:'วันเกิด',         req:false, type:'date', note:'⚠️ ใช้สำหรับสิทธิ์พิเศษวันเกิด' },
        ].map(({ k, label, req, note, ...rest }) => (
          <div key={k} className="mb-3">
            <label className="field-label">{label} {req && <span className="required-mark">*</span>}</label>
            <input className="input-field" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} {...rest} />
            {note && <p className="text-xs text-acc mt-1">{note}</p>}
          </div>
        ))}
        <button className="btn-primary mb-3 flex items-center justify-center gap-2" onClick={handleSave} disabled={saving}>
          {saving ? <><span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />กำลังบันทึก...</> : 'บันทึกการเปลี่ยนแปลง'}
        </button>
        <Link href="/profile" className="block text-center text-sm text-t2 py-2">ยกเลิก</Link>
      </div>
      <BottomNav />
    </div>
  )
}
