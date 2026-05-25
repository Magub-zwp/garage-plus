'use client'
import { useState, useEffect } from 'react'
import DashboardShell from '@/components/staff/DashboardShell'
import { db } from '@/lib/firebase/config'
import { collection, getDocs } from 'firebase/firestore'

const ROLE_LABEL = { admin:'👑 แอดมิน', mechanic:'🔧 ช่างซ่อม' }
const EMPTY = { name:'', email:'', password:'', role:'mechanic' }

export default function EmployeesPage() {
  const [staff,    setStaff]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form,     setForm]     = useState(EMPTY)
  const [saving,   setSaving]   = useState(false)
  const [msg,      setMsg]      = useState('')
  const [showPw,   setShowPw]   = useState(false)
// Function to fetch staff members from Firestore
  const fetchStaff = async () => {
    try {
      const snap = await getDocs(collection(db,'staff'))
      setStaff(snap.docs.map(d => ({ uid:d.id,...d.data() })))
    } catch(e) {
      console.error('[employees]', e)
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchStaff() }, [])
// Function to handle creating a new staff member
  const handleCreate = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.password) {
      setMsg('กรุณากรอกชื่อ อีเมล และรหัสผ่านให้ครบ')
      return
    }
    if (form.password.length < 8) {
      setMsg('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร')
      return
    }
    setSaving(true); setMsg('')
    try {
      const res = await fetch('/api/staff/create', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name:form.name.trim(), email:form.email.trim(), password:form.password, role:form.role }),
      })
      const data = await res.json()
      if (!res.ok) { setMsg(`❌ ${data.error}`); return }
      await fetchStaff()
      setShowForm(false)
      setForm(EMPTY)
      setMsg(`✅ เพิ่ม ${form.name} สำเร็จ`)
      setTimeout(() => setMsg(''), 3000)
    } catch(e) { setMsg(`❌ ${e.message}`) }
    finally { setSaving(false) }
  }
// Function to handle deleting a staff member
  const handleDelete = async (uid, name) => {
    if (!confirm(`ลบ ${name}? บัญชี Firebase Auth จะถูกลบด้วย`)) return
    try {
      const res = await fetch('/api/staff/delete', {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ uid }),
      })
      const data = await res.json()
      if (!res.ok) { alert(data.error); return }
      setStaff(prev => prev.filter(s => s.uid !== uid))
    } catch(e) { alert(e.message) }
  }
// Main render function with loading, error, and empty states
  return (
    <DashboardShell requiredRole="admin">
      <div className="flex justify-between items-center mb-5">
        <div>
          <h1 className="font-syne text-xl font-bold text-t1">จัดการพนักงาน</h1>
          <p className="text-xs text-t2 mt-0.5">{staff.length} คนในระบบ</p>
        </div>
        <button onClick={() => { setShowForm(true); setForm(EMPTY); setMsg('') }}
          className="px-4 py-2 rounded-full text-xs font-bold text-white border-none cursor-pointer"
          style={{ background:'var(--acc)' }}>+ เพิ่มพนักงาน</button>
      </div>

      {msg && !showForm && (
        <div className="mb-4 p-3 rounded-xl text-xs"
          style={{ background:msg.startsWith('✅')?'var(--gdim)':'var(--errdim)', color:msg.startsWith('✅')?'var(--grn)':'var(--err)' }}>
          {msg}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center pt-16">
          <span className="inline-block w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor:'var(--acc)', borderTopColor:'transparent' }}/>
        </div>
      ) : (
        <div className="card overflow-hidden">
          {staff.length === 0 ? (
            <div className="p-10 text-center">
              <span className="text-4xl mb-3 block">🧑‍🔧</span>
              <p className="font-syne text-sm font-bold text-t1 mb-1">ยังไม่มีพนักงาน</p>
              <p className="text-xs text-t2">กด "+ เพิ่มพนักงาน" เพื่อสร้างบัญชีช่างหรือแอดมิน</p>
            </div>
          ) : (
            <table className="data-table" style={{ tableLayout:'fixed', width:'100%' }}>
              <colgroup><col/><col style={{ width:100 }}/><col style={{ width:150 }}/><col style={{ width:56 }}/></colgroup>
              <thead><tr><th>ชื่อ</th><th>Role</th><th>Email</th><th></th></tr></thead>
              <tbody>
                {staff.map(s => (
                  <tr key={s.uid}>
                    <td className="font-semibold text-sm text-t1">{s.name||'-'}</td>
                    <td>
                      <span className={`bdg ${s.role==='admin'?'bdg-rep':'bdg-done'}`}>
                        {ROLE_LABEL[s.role]||s.role}
                      </span>
                    </td>
                    <td className="text-xs text-t2 truncate">{s.email||'-'}</td>
                    <td>
                      <button onClick={() => handleDelete(s.uid, s.name)}
                        className="text-xs font-bold px-2 py-1 rounded-full border-none cursor-pointer"
                        style={{ background:'var(--errdim)', color:'var(--err)' }}>ลบ</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
      // Modal form for adding a new staff member
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surf rounded-2xl p-6 w-full max-w-md">
            <h3 className="font-syne text-base font-bold text-t1 mb-4">เพิ่มพนักงานใหม่</h3>

            {msg && <div className="mb-3 p-2.5 rounded-xl text-xs"
              style={{ background:msg.startsWith('❌')?'var(--errdim)':'var(--gdim)', color:msg.startsWith('❌')?'var(--err)':'var(--grn)' }}>{msg}</div>}

            {[
              { k:'name',  label:'ชื่อ-นามสกุล *',   placeholder:'สมชาย ช่างซ่อม' },
              { k:'email', label:'อีเมล *',            placeholder:'somchai@179auto.com', type:'email' },
            ].map(f => (
              <div key={f.k} className="mb-3">
                <label className="field-label">{f.label}</label>
                <input className="input-field" type={f.type||'text'} placeholder={f.placeholder}
                  value={form[f.k]||''} onChange={e => setForm({...form,[f.k]:e.target.value})} />
              </div>
            ))}
        // Password field with show/hide toggle
            <div className="mb-4">
              <label className="field-label">รหัสผ่านเริ่มต้น * <span className="text-t3 font-normal">(อย่างน้อย 8 ตัว)</span></label>
              <div className="relative">
                <input className="input-field pr-10" type={showPw?'text':'password'}
                  placeholder="ตั้งรหัสผ่านเริ่มต้น" value={form.password||''}
                  onChange={e => setForm({...form,password:e.target.value})} />
                <button type="button" onClick={() => setShowPw(p=>!p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-t3 border-none bg-transparent cursor-pointer text-sm">
                  {showPw?'🙈':'👁'}
                </button>
              </div>
            </div>
            // Role selection buttons
            <div className="mb-4">
              <label className="field-label">Role</label>
              <div className="grid grid-cols-2 gap-2">
                {[{k:'mechanic',l:'🔧 ช่างซ่อม'},{k:'admin',l:'👑 แอดมิน'}].map(r => (
                  <button key={r.k} onClick={() => setForm({...form,role:r.k})}
                    className="py-2.5 rounded-xl text-xs font-bold cursor-pointer border-none"
                    style={{ background:form.role===r.k?'var(--adim)':'var(--s2)', color:form.role===r.k?'var(--acc)':'var(--t2)', border:`0.5px solid ${form.role===r.k?'var(--abrd)':'var(--brd)'}` }}>
                    {r.l}
                  </button>
                ))}
              </div>
            </div>
// Action buttons for canceling or creating the staff member
            <div className="flex gap-2">
              <button onClick={() => { setShowForm(false); setMsg('') }}
                className="flex-1 py-3 bg-s2 rounded-xl text-sm font-bold text-t1 border-none cursor-pointer">
                ยกเลิก
              </button>
              <button onClick={handleCreate} disabled={saving}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-white border-none cursor-pointer flex items-center justify-center gap-2"
                style={{ background:'var(--acc)' }}>
                {saving
                  ? <><span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>กำลังสร้าง...</>
                  : 'สร้างบัญชี'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  )
}
