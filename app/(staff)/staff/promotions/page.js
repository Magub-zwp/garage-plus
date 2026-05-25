'use client'
import { useState, useEffect } from 'react'
import DashboardShell from '@/components/staff/DashboardShell'
import { db } from '@/lib/firebase/config'
import { collection, query, orderBy, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore'

const EMPTY = { name:'', reward:'', condition:'', description:'', active:true }

 function F ({ k, label,form,setForm,...rest }) { 
  return(
    <div className="mb-3">
      <label className="field-label">{label}</label>
      <input className="input-field" value={form[k]||''} onChange={e=>setForm({...form,[k]:e.target.value})} {...rest} />
    </div>
  )
}

export default function PromotionsPage() {
  const [promos,   setPromos]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form,     setForm]     = useState(EMPTY)
  const [editId,   setEditId]   = useState(null)
  const [saving,   setSaving]   = useState(false)
  const [msg,      setMsg]      = useState('')
// Function to fetch promotions from Firestore
  const fetchPromos = async () => {
    try {
      const snap = await getDocs(query(collection(db,'promotions'), orderBy('createdAt','desc')))
      setPromos(snap.docs.map(d => ({id:d.id,...d.data()})))
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchPromos() }, [])
// Functions to handle opening the form for creating or editing a promotion
  const openNew  = () => { setForm(EMPTY); setEditId(null); setShowForm(true); setMsg('') }
  const openEdit = (p) => { setForm({ name:p.name, reward:p.reward||'', condition:p.condition||'', description:p.description||'', active:p.active }); setEditId(p.id); setShowForm(true); setMsg('') }

  const handleSave = async () => {
    if (!form.name.trim()) { setMsg('กรุณากรอกชื่อโปรโมชั่น'); return }
    setSaving(true); setMsg('')
    try {
      if (editId) {
        await updateDoc(doc(db,'promotions',editId), { ...form, updatedAt:serverTimestamp() })
      } else {
        await addDoc(collection(db,'promotions'), { ...form, createdAt:serverTimestamp() })
      }
      await fetchPromos()
      setShowForm(false)
    } catch(e) { setMsg(`❌ ${e.message}`) }
    finally { setSaving(false) }
  }
// Function to toggle the active status of a promotion
  const handleToggle = async (p) => {
    await updateDoc(doc(db,'promotions',p.id), { active:!p.active })
    setPromos(prev => prev.map(x => x.id===p.id ? {...x, active:!x.active} : x))
  }

  const handleDelete = async (id) => {
    if (!confirm('ลบโปรโมชั่นนี้?')) return
    await deleteDoc(doc(db,'promotions',id))
    setPromos(prev => prev.filter(x => x.id !== id))
  }



  return (
    <DashboardShell requiredRole="admin">
      <div className="flex justify-between items-center mb-5">
        <h1 className="font-syne text-xl font-bold text-t1">จัดการโปรโมชั่น</h1>
        <button onClick={openNew}
          className="px-4 py-2 rounded-full text-xs font-bold text-white border-none cursor-pointer"
          style={{ background:'var(--acc)' }}>+ เพิ่มโปรโมชั่น</button>
      </div>

      {loading ? (
        <div className="flex justify-center pt-16">
          <span className="inline-block w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor:'var(--acc)', borderTopColor:'transparent' }}/>
        </div>
      ) : promos.length === 0 ? (
        <div className="card p-10 text-center">
          <span className="text-4xl mb-3 block">🎁</span>
          <p className="font-syne text-sm font-bold text-t1 mb-1">ยังไม่มีโปรโมชั่น</p>
          <p className="text-xs text-t2 mb-4">สร้างโปรโมชั่นแรกเพื่อดึงดูดลูกค้า</p>
          <button onClick={openNew} className="text-xs text-acc font-semibold">+ เพิ่มโปรโมชั่น</button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {promos.map(p => (
            <div key={p.id} className="card p-4"
              style={{ borderLeft: `3px solid ${p.active ? 'var(--grn)' : 'var(--brd2)'}` }}>
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <p className="font-syne text-sm font-bold text-t1">{p.name}</p>
                  {p.reward && <p className="text-xs text-acc font-semibold mt-0.5">🎁 {p.reward}</p>}
                  {p.condition && <p className="text-xs text-t2 mt-1">📌 {p.condition}</p>}
                </div>
                <span className={`bdg ml-3 flex-shrink-0 ${p.active ? 'bdg-done' : 'bdg-hold'}`}>
                  {p.active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => handleToggle(p)}
                  className="flex-1 py-1.5 rounded-xl text-xs font-bold cursor-pointer border-none"
                  style={{ background:p.active?'var(--errdim)':'var(--gdim)', color:p.active?'var(--err)':'var(--grn)' }}>
                  {p.active ? 'ปิด' : 'เปิด'}
                </button>
                <button onClick={() => openEdit(p)}
                  className="flex-1 py-1.5 rounded-xl text-xs font-bold cursor-pointer border-none"
                  style={{ background:'var(--adim)', color:'var(--acc)' }}>
                  แก้ไข
                </button>
                <button onClick={() => handleDelete(p.id)}
                  className="py-1.5 px-3 rounded-xl text-xs font-bold cursor-pointer border-none"
                  style={{ background:'var(--errdim)', color:'var(--err)' }}>
                  ลบ
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surf rounded-2xl p-6 w-full max-w-md max-h-screen overflow-y-auto">
            <h3 className="font-syne text-base font-bold text-t1 mb-4">
              {editId ? 'แก้ไขโปรโมชั่น' : 'เพิ่มโปรโมชั่นใหม่'}
            </h3>
            {msg && <div className="mb-3 p-2.5 rounded-xl text-xs text-err bg-errdim">{msg}</div>}
            <F k="name"        label="ชื่อโปรโมชั่น *" placeholder="เช่น ใช้บริการครบ 3 ครั้ง" form={form} setForm={setForm} />
            <F k="reward"      label="รางวัล/สิทธิ์ที่ได้" placeholder="เช่น ตรวจเช็คฟรี 32 รายการ" form={form} setForm={setForm} />
            <F k="condition"   label="เงื่อนไข" placeholder="เช่น สำหรับลูกค้าที่ใช้บริการครบ 3 ครั้ง" form={form} setForm={setForm} />
            <div className="mb-3">
              <label className="field-label">รายละเอียดเพิ่มเติม</label>
              <textarea className="input-field resize-none" style={{ height:70 }}
                value={form.description||''} onChange={e=>setForm({...form,description:e.target.value})}
                placeholder="รายละเอียดเพิ่มเติม..." />
            </div>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs font-bold text-t2">สถานะ:</span>
              <button onClick={() => setForm({...form, active:!form.active})}
                className="relative w-10 h-6 rounded-full cursor-pointer border-none"
                style={{ background: form.active ? 'var(--grn)' : 'var(--s3)' }}>
                <span className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform"
                  style={{ transform: form.active ? 'translateX(16px)' : 'translateX(0)' }} />
              </button>
              <span className="text-xs text-t2">{form.active ? 'Active' : 'Inactive'}</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowForm(false)}
                className="flex-1 py-3 bg-s2 rounded-xl text-sm font-bold text-t1 border-none cursor-pointer">
                ยกเลิก
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-white border-none cursor-pointer"
                style={{ background:'var(--acc)' }}>
                {saving ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  )
}
