'use client'
import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { GoogleAuthProvider, linkWithPopup } from 'firebase/auth'
import { useAuth } from '@/hooks/useAuth'
import { useUser } from '@/hooks/useUser'
import { updateUserDocument } from '@/lib/firebase/firestore'
import { deleteAllUserData } from '@/lib/firebase/deleteUserData'
import { auth } from '@/lib/firebase/config'
import BottomNav from '@/components/customer/BottomNav'

function Toggle({ on, onChange }) {
  return (
    <button onClick={() => onChange(!on)} className="relative w-10 h-6 rounded-full flex-shrink-0 transition-colors cursor-pointer border-none"
      style={{ background: on ? 'var(--acc)' : 'var(--s3)', border:'0.5px solid var(--brd2)' }}>
      <span className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform"
        style={{ transform: on ? 'translateX(16px)' : 'translateX(0)' }} />
    </button>
  )
}
// Settings page for managing user preferences and account actions
export default function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <SettingsPageContent />
    </Suspense>
  )
}

function SettingsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { uid } = useAuth()
  const { user } = useUser()
  const [isDark,  setIsDark]  = useState(true)
  const [notifs,  setNotifs]  = useState({ status:true, promo:true, maintenance:true, line:false })
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [showDelete,    setShowDelete]   = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteError,    setDeleteError]    = useState('')
  const [deleting,       setDeleting]       = useState(false)
  const [linkMsg,        setLinkMsg]        = useState('')
  const [linking,        setLinking]        = useState(false)

  // เช็คสถานะการเชื่อมบัญชีที่ redirect กลับมาจาก /api/auth/line/callback (โหมด link)
  useEffect(() => {
    if (searchParams.get('lineLinked') === '1') setLinkMsg('เชื่อมบัญชี LINE สำเร็จ ✓')
    if (searchParams.get('lineLinkError') === 'already_linked') setLinkMsg('บัญชี LINE นี้ถูกเชื่อมกับบัญชีอื่นไปแล้ว')
  }, [searchParams])

  const providers  = auth.currentUser?.providerData?.map(p => p.providerId) || []
  const hasGoogle  = providers.includes('google.com')
  const hasLine    = !!user?.lineId

  // เชื่อมบัญชี Google เข้ากับบัญชีปัจจุบัน (native Firebase Auth linking)
  const linkGoogle = async () => {
    setLinking(true); setLinkMsg('')
    try {
      await linkWithPopup(auth.currentUser, new GoogleAuthProvider())
      setLinkMsg('เชื่อมบัญชี Google สำเร็จ ✓')
    } catch (e) {
      setLinkMsg(e.code === 'auth/credential-already-in-use'
        ? 'บัญชี Google นี้ถูกใช้กับอีกบัญชีอยู่แล้ว ไม่สามารถเชื่อมซ้ำได้'
        : 'เชื่อมบัญชี Google ไม่สำเร็จ')
    } finally { setLinking(false) }
  }

  // เชื่อมบัญชี LINE: ขอ signed state จาก server ก่อน แล้วค่อย redirect ไป LINE OAuth
  const linkLine = async () => {
    setLinking(true); setLinkMsg('')
    try {
      const token = await auth.currentUser.getIdToken()
      const res  = await fetch('/api/auth/line/link-init', { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else { setLinkMsg(data.error || 'เชื่อมบัญชี LINE ไม่สำเร็จ'); setLinking(false) }
    } catch {
      setLinkMsg('เชื่อมบัญชี LINE ไม่สำเร็จ'); setLinking(false)
    }
  }

  useEffect(() => {
    if (user?.notifPrefs) setNotifs(user.notifPrefs)
    if (user?.darkMode !== undefined) setIsDark(user.darkMode)
  }, [user])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
    localStorage.setItem('gp_dark', isDark ? '1' : '0')
  }, [isDark])
  // Save preferences to Firestore
  const savePrefs = async (newNotifs, newDark) => {
    setSaving(true); setSaved(false)
    try {
      await updateUserDocument(uid, { notifPrefs: newNotifs, darkMode: newDark })
      setSaved(true); setTimeout(() => setSaved(false), 2000)
    } finally { setSaving(false) }
  }
  // Toggle individual notification preference
  const toggleNotif = (k) => {
    const n = { ...notifs, [k]: !notifs[k] }
    setNotifs(n); savePrefs(n, isDark)
  }
  // Toggle dark mode preference
  const toggleDark = () => {
    const d = !isDark; setIsDark(d); savePrefs(notifs, d)
  }
  // Handle account deletion with password confirmation
  return (
    <div className="page-container pb-24">
      <div className="page-header"><Link href="/profile" className="back-btn">‹</Link><h1 className="page-title">การตั้งค่า</h1>
        {saving && <span className="text-xs text-t3">กำลังบันทึก...</span>}
        {saved  && <span className="text-xs text-grn">บันทึกแล้ว ✓</span>}
      </div>
      <div className="px-4 pt-2">
        <p className="text-xs font-bold text-t3 uppercase tracking-widest mb-2">การแสดงผล</p>
        {[
          { icon:'🌙', bg:'rgba(59,130,246,.1)', title:'โหมดสี', sub:'Dark / Light', right:
            <div className="flex gap-1.5">
              {['dark','light'].map((m) => (
                <button key={m} onClick={() => { setIsDark(m==='dark'); savePrefs(notifs, m==='dark') }}
                  className="sel-pill text-xs cursor-pointer border-none"
                  style={(m==='dark'&&isDark)||(m==='light'&&!isDark) ? { background:'var(--acc)', color:'#fff', borderColor:'var(--acc)' } : {}}>
                  {m === 'dark' ? 'Dark' : 'Light'}
                </button>
              ))}
            </div>
          },
        ].map(({ icon, bg, title, sub, right }) => (
          <div key={title} className="profile-row">
            <div className="profile-row-icon" style={{ background:bg }}>{icon}</div>
            <div className="flex-1"><p className="text-sm font-medium text-t1">{title}</p>{sub && <p className="text-xs text-t2 mt-0.5">{sub}</p>}</div>
            {right}
          </div>
        ))}
        <p className="text-xs font-bold text-t3 uppercase tracking-widest mb-2 mt-4">การแจ้งเตือน</p>
        {[
          { k:'status',      icon:'🔧', bg:'var(--adim)',              title:'อัปเดตสถานะซ่อม' },
          { k:'promo',       icon:'🎁', bg:'var(--gdim)',              title:'โปรโมชั่น & ส่วนลด' },
          { k:'maintenance', icon:'📅', bg:'rgba(59,130,246,.1)',      title:'เตือนบำรุงรักษา' },
          { k:'line',        icon:'💬', bg:'rgba(168,85,247,.1)',      title:'แจ้งเตือนผ่าน LINE' },
        ].map(({ k, icon, bg, title }) => (
          <div key={k} className="profile-row">
            <div className="profile-row-icon" style={{ background:bg }}>{icon}</div>
            <div className="flex-1"><p className="text-sm font-medium text-t1">{title}</p></div>
            <Toggle on={notifs[k]} onChange={() => toggleNotif(k)} />
          </div>
        ))}
        {linkMsg && (
          <div className="mb-3 p-3 rounded-xl text-xs text-t1" style={{ background:'var(--adim)', border:'0.5px solid var(--abrd)' }}>{linkMsg}</div>
        )}
        <p className="text-xs font-bold text-t3 uppercase tracking-widest mb-2 mt-4">เชื่อมบัญชี</p>
        <div className="profile-row">
          <div className="profile-row-icon" style={{ background:'rgba(66,133,244,.1)' }}>🔵</div>
          <div className="flex-1"><p className="text-sm font-medium text-t1">Google</p><p className="text-xs text-t2 mt-0.5">{hasGoogle ? 'เชื่อมแล้ว' : 'ยังไม่ได้เชื่อม'}</p></div>
          {!hasGoogle && (
            <button disabled={linking} onClick={linkGoogle}
              className="text-xs font-bold px-3 py-1.5 rounded-full cursor-pointer border-none"
              style={{ background:'var(--adim)', color:'var(--acc)' }}>เชื่อม</button>
          )}
        </div>
        <div className="profile-row">
          <div className="profile-row-icon" style={{ background:'rgba(0,185,0,.1)' }}>💬</div>
          <div className="flex-1"><p className="text-sm font-medium text-t1">LINE</p><p className="text-xs text-t2 mt-0.5">{hasLine ? 'เชื่อมแล้ว' : 'ยังไม่ได้เชื่อม'}</p></div>
          {!hasLine && (
            <button disabled={linking} onClick={linkLine}
              className="text-xs font-bold px-3 py-1.5 rounded-full cursor-pointer border-none"
              style={{ background:'rgba(0,185,0,.12)', color:'#00B900' }}>เชื่อม</button>
          )}
        </div>
        <p className="text-xs font-bold text-t3 uppercase tracking-widest mb-2 mt-4">ความเป็นส่วนตัว</p>
        <Link href="/settings/change-password">
          <div className="profile-row">
            <div className="profile-row-icon" style={{ background:'var(--errdim)' }}>🔒</div>
            <div className="flex-1"><p className="text-sm font-medium text-t1">เปลี่ยนรหัสผ่าน</p></div>
            <span className="text-t3 text-base">›</span>
          </div>
        </Link>
        <div className="profile-row" style={{ borderBottom:'none' }}>
          <div className="profile-row-icon" style={{ background:'var(--errdim)' }}>🗑️</div>
          <div className="flex-1"><p className="text-sm font-medium text-err">ลบบัญชี</p><p className="text-xs text-t2 mt-0.5">ข้อมูลทั้งหมดจะถูกลบถาวร</p></div>
          <span className="text-t3 text-base">›</span>
        </div>
      </div>
        <p className="text-xs font-bold text-t3 uppercase tracking-widest mb-2 mt-4">PDPA — ข้อมูลของคุณ</p>
        <div className="profile-row">
          <div className="profile-row-icon" style={{ background:'var(--gdim)' }}>📋</div>
          <div className="flex-1"><p className="text-sm font-medium text-t1">นโยบายความเป็นส่วนตัว</p></div>
          <a href="/privacy-policy" className="text-t3 text-base">›</a>
        </div>
        <div className="profile-row">
          <div className="profile-row-icon" style={{ background:'var(--adim)' }}>📢</div>
          <div className="flex-1"><p className="text-sm font-medium text-t1">รับข่าวสาร/โปรโมชั่น</p><p className="text-xs text-t2 mt-0.5">อีเมลและ Push Notification</p></div>
          <Toggle on={notifs.promo} onChange={() => toggleNotif('promo')} />
        </div>
        <div className="profile-row" style={{ borderBottom:'none' }}>
          <div className="profile-row-icon" style={{ background:'var(--errdim)' }}>🗑️</div>
          <div className="flex-1"><p className="text-sm font-medium text-err">ลบข้อมูลของฉัน</p><p className="text-xs text-t2 mt-0.5">ลบบัญชีและข้อมูลทั้งหมดถาวร</p></div>
          <button onClick={() => setShowDelete(true)} className="text-xs font-bold px-3 py-1.5 rounded-full cursor-pointer border-none" style={{ background:'var(--errdim)', color:'var(--err)' }}>ลบ</button>
        </div>
      <p className="text-center text-xs text-t3 mt-6 mb-2">Garage Plus v3.0 · 179 Auto</p>
      {showDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-6">
          <div className="bg-surf rounded-3xl p-6 w-full max-w-sm">
            <div className="text-4xl mb-3 text-center">⚠️</div>
            <h3 className="font-syne text-base font-bold text-t1 mb-2 text-center">ลบข้อมูลทั้งหมด?</h3>
            <p className="text-xs text-t2 leading-relaxed mb-4 text-center">
              ข้อมูลส่วนตัวทั้งหมดจะถูกลบถาวร<br/>ไม่สามารถกู้คืนได้
            </p>
            <div className="mb-4">
              <label className="field-label">ยืนยันด้วยรหัสผ่าน</label>
              <input type="password" className="input-field"
                placeholder="กรอกรหัสผ่านปัจจุบัน"
                value={deletePassword}
                onChange={e => { setDeletePassword(e.target.value); setDeleteError('') }} />
              {deleteError && <p className="text-xs text-err mt-1">{deleteError}</p>}
            </div>
            <div className="flex gap-2">
              <button className="flex-1 py-3 bg-s2 rounded-2xl text-sm font-bold text-t1 border-none cursor-pointer"
                onClick={() => { setShowDelete(false); setDeletePassword(''); setDeleteError('') }}>
                ยกเลิก
              </button>
              <button className="flex-1 py-3 rounded-2xl text-sm font-bold text-white border-none cursor-pointer flex items-center justify-center gap-2"
                style={{ background:'var(--err)' }}
                disabled={deleting}
                onClick={async () => {
                  if (!deletePassword) { setDeleteError('กรุณากรอกรหัสผ่าน'); return }
                  setDeleting(true); setDeleteError('')
                  try {
                    const { EmailAuthProvider, reauthenticateWithCredential } = await import('firebase/auth')
                    const { auth } = await import('@/lib/firebase/config')
                    const user = auth.currentUser
                    if (user && user.providerData?.[0]?.providerId === 'password') {
                      const cred = EmailAuthProvider.credential(user.email, deletePassword)
                      await reauthenticateWithCredential(user, cred)
                    }
                    await deleteAllUserData()
                    router.replace('/login')
                  } catch(e) {
                    if (['auth/wrong-password','auth/invalid-credential'].includes(e.code))
                      setDeleteError('รหัสผ่านไม่ถูกต้อง')
                    else setDeleteError(e.message)
                  } finally { setDeleting(false) }
                }}>
                {deleting
                  ? <><span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>กำลังลบ...</>
                  : 'ยืนยันลบข้อมูล'}
              </button>
            </div>
          </div>
        </div>
      )}
      <BottomNav />
    </div>
  )
}
