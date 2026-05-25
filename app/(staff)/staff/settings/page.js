'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import DashboardShell from '@/components/staff/DashboardShell'
import { db } from '@/lib/firebase/config'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { changePassword } from '@/lib/firebase/auth'
import { getSession } from '@/lib/staff/session'

export default function StaffSettingsPage() {
  const router  = useRouter()
  const session = typeof window !== 'undefined' ? getSession() : null
  const isAdmin = session?.role === 'admin'

  const [shopInfo, setShopInfo] = useState({
    shopName: '179 Auto',
    shopAddress: '179 หมู่ 2 ต.ป่าป้อง อ.ดอยสะเก็ด จ.เชียงใหม่ 50220',
    shopPhone: '',
    shopEmail: '',
    shopLine: '',
    lineWebhook: '',
    slotsPerHour: 1,
    openTime: '08:00',
    closeTime: '17:00',
    offDays: [0, 6],
  })
  const [isDark,   setIsDark]   = useState(true)
  const [pw,       setPw]       = useState({ current:'', newPw:'', confirm:'' })
  const [pwMsg,    setPwMsg]    = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    const dark = localStorage.getItem('gp_staff_dark') !== '0'
    setIsDark(dark)
    if (!isAdmin) { setLoading(false); return }

    getDoc(doc(db, 'config', 'shop'))
      .then(snap => { if (snap.exists()) setShopInfo(prev => ({...prev,...snap.data()})) })
      .finally(() => setLoading(false))
  }, [])

  const handleSaveShop = async () => {
    setSaving(true); setSaved(false)
    try {
      await setDoc(doc(db,'config','shop'), { ...shopInfo, updatedAt: serverTimestamp() }, { merge:true })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch(e) { alert(e.message) }
    finally { setSaving(false) }
  }

  const handleChangePw = async () => {
    if (!pw.current || !pw.newPw) { setPwMsg('กรุณากรอกรหัสผ่านให้ครบ'); return }
    if (pw.newPw !== pw.confirm)  { setPwMsg('รหัสผ่านใหม่ไม่ตรงกัน'); return }
    if (pw.newPw.length < 8)      { setPwMsg('รหัสผ่านต้องมีอย่างน้อย 8 ตัว'); return }
    setPwSaving(true); setPwMsg('')
    try {
      await changePassword(pw.current, pw.newPw)
      setPwMsg('✅ เปลี่ยนรหัสผ่านสำเร็จ')
      setPw({ current:'', newPw:'', confirm:'' })
    } catch(e) {
      const msgs = { 'auth/wrong-password':'รหัสผ่านปัจจุบันไม่ถูกต้อง' }
      setPwMsg(msgs[e.code] || e.message)
    } finally { setPwSaving(false) }
  }

  const toggleDark = () => {
    const next = !isDark
    setIsDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('gp_staff_dark', next ? '1' : '0')
  }

  const DAYS_TH = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัส','ศุกร์','เสาร์']

  return (
    <DashboardShell>
      <div className="flex justify-between items-center mb-6">
        <h1 className="font-syne text-xl font-bold text-t1">ตั้งค่า</h1>
        {saved && <span className="text-xs text-grn font-bold">✓ บันทึกแล้ว</span>}
      </div>

      <div className="max-w-2xl flex flex-col gap-5">

        {/* Display */}
        <div className="card p-5">
          <h2 className="font-syne text-sm font-bold text-t1 mb-4">การแสดงผล</h2>
          <div className="flex justify-between items-center">
            <span className="text-sm text-t1">Dark Mode</span>
            <button onClick={toggleDark}
              className="relative w-10 h-6 rounded-full cursor-pointer border-none"
              style={{ background: isDark ? 'var(--acc)' : 'var(--s3)' }}>
              <span className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform"
                style={{ transform: isDark ? 'translateX(16px)' : 'translateX(0)' }} />
            </button>
          </div>
        </div>

        {/* Change Password */}
        <div className="card p-5">
          <h2 className="font-syne text-sm font-bold text-t1 mb-4">เปลี่ยนรหัสผ่าน</h2>
          {pwMsg && (
            <div className="mb-3 p-2.5 rounded-xl text-xs"
              style={{ background: pwMsg.startsWith('✅')?'var(--gdim)':'var(--errdim)', color: pwMsg.startsWith('✅')?'var(--grn)':'var(--err)' }}>
              {pwMsg}
            </div>
          )}
          {[
            { k:'current', label:'รหัสผ่านปัจจุบัน', placeholder:'••••••••' },
            { k:'newPw',   label:'รหัสผ่านใหม่',      placeholder:'อย่างน้อย 8 ตัว' },
            { k:'confirm', label:'ยืนยันรหัสผ่านใหม่', placeholder:'••••••••' },
          ].map(f => (
            <div key={f.k} className="mb-3">
              <label className="field-label">{f.label}</label>
              <input type="password" className="input-field" placeholder={f.placeholder}
                value={pw[f.k]} onChange={e => setPw({...pw,[f.k]:e.target.value})} />
            </div>
          ))}
          <button onClick={handleChangePw} disabled={pwSaving}
            className="w-full py-3 rounded-xl text-sm font-bold text-white border-none cursor-pointer"
            style={{ background:'var(--acc)' }}>
            {pwSaving ? 'กำลังเปลี่ยน...' : 'เปลี่ยนรหัสผ่าน'}
          </button>
        </div>

        {/* Admin: Shop settings */}
        {isAdmin && (
          <div className="card p-5">
            <h2 className="font-syne text-sm font-bold text-t1 mb-4">ข้อมูลอู่ (Admin เท่านั้น)</h2>
            {loading ? (
              <div className="flex justify-center py-8">
                <span className="inline-block w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
                  style={{ borderColor:'var(--acc)', borderTopColor:'transparent' }}/>
              </div>
            ) : (
              <>
                {[
                  { k:'shopName',    label:'ชื่อร้าน',         placeholder:'179 Auto' },
                  { k:'shopAddress', label:'ที่อยู่',           placeholder:'ที่อยู่ร้าน' },
                  { k:'shopPhone',   label:'เบอร์โทร',          placeholder:'0XX-XXX-XXXX' },
                  { k:'shopEmail',   label:'Email',             placeholder:'shop@email.com' },
                  { k:'lineWebhook', label:'LINE Webhook URL',  placeholder:'https://...' },
                ].map(f => (
                  <div key={f.k} className="mb-3">
                    <label className="field-label">{f.label}</label>
                    <input className="input-field" placeholder={f.placeholder}
                      value={shopInfo[f.k]||''} onChange={e => setShopInfo({...shopInfo,[f.k]:e.target.value})} />
                  </div>
                ))}

                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div>
                    <label className="field-label">เปิด</label>
                    <input type="time" className="input-field" value={shopInfo.openTime||'08:00'}
                      onChange={e => setShopInfo({...shopInfo,openTime:e.target.value})} />
                  </div>
                  <div>
                    <label className="field-label">ปิด</label>
                    <input type="time" className="input-field" value={shopInfo.closeTime||'17:00'}
                      onChange={e => setShopInfo({...shopInfo,closeTime:e.target.value})} />
                  </div>
                  <div>
                    <label className="field-label">Slot/ชม.</label>
                    <input type="number" className="input-field" min={1} max={5}
                      value={shopInfo.slotsPerHour||1}
                      onChange={e => setShopInfo({...shopInfo,slotsPerHour:parseInt(e.target.value)||1})} />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="field-label mb-2">วันหยุด</label>
                  <div className="flex gap-2 flex-wrap">
                    {DAYS_TH.map((d,i) => {
                      const isOff = (shopInfo.offDays||[]).includes(i)
                      return (
                        <button key={i}
                          onClick={() => {
                            const days = isOff
                              ? (shopInfo.offDays||[]).filter(x => x !== i)
                              : [...(shopInfo.offDays||[]), i]
                            setShopInfo({...shopInfo, offDays:days})
                          }}
                          className="px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer border-none"
                          style={{ background:isOff?'var(--errdim)':'var(--s2)', color:isOff?'var(--err)':'var(--t2)', border:`0.5px solid ${isOff?'rgba(232,92,58,.3)':'var(--brd2)'}` }}>
                          {d}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <button onClick={handleSaveShop} disabled={saving}
                  className="w-full py-3 rounded-xl text-sm font-bold text-white border-none cursor-pointer"
                  style={{ background:'var(--acc)' }}>
                  {saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูลอู่'}
                </button>
              </>
            )}
          </div>
        )}

      </div>
    </DashboardShell>
  )
}
