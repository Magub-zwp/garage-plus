'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import DashboardShell from '@/components/staff/DashboardShell'
import { getArticle, updateArticle } from '@/lib/firebase/firestore'

const CATS = ['ดูแลรักษา','Tips','โปรโมชั่น','ฤดูกาล','ความปลอดภัย']

export default function EditArticlePage() {
  const { id } = useParams(); const router = useRouter()
  const [art,     setArt]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => { getArticle(id).then(setArt).finally(()=>setLoading(false)) }, [id])
// Handle save button click
  const handleSave = async () => {
    if (!art.title.trim()) { setError('กรุณากรอกชื่อบทความ'); return }
    setError(''); setSaving(true)
    try {
      await updateArticle(id, { title:art.title, description:art.description, thumbnailUrl:art.thumbnailUrl, sourceName:art.sourceName, content:art.content||'', category:art.category, published:art.published, featured:art.featured||false })
      setSuccess(true); setTimeout(()=>router.replace('/staff/articles'), 1000)
    } catch(e) { setError(e.message) }
    finally { setSaving(false) }
  }

  if (loading) return <DashboardShell requiredRole="admin"><div className="flex justify-center pt-20"><span className="inline-block w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor:'var(--acc)',borderTopColor:'transparent' }}/></div></DashboardShell>
// If article not found, show error message
  return (
    <DashboardShell requiredRole="admin">
      <div className="flex items-center gap-3 mb-5">
        <Link href="/staff/articles" className="text-t2 text-sm">‹ กลับ</Link>
        <h1 className="font-syne text-xl font-bold text-t1">แก้ไขบทความ</h1>
      </div>
      {art && (
        <div className="max-w-2xl card p-5">
          {error && <div className="mb-4 p-3 rounded-xl text-xs text-err bg-errdim">⚠️ {error}</div>}
          {success && <div className="mb-4 p-3 rounded-xl text-xs text-grn bg-gdim">✓ บันทึกสำเร็จ กำลังกลับ...</div>}
          {[{k:'title',l:'ชื่อบทความ',req:true},{k:'description',l:'คำอธิบาย'},{k:'thumbnailUrl',l:'URL รูปภาพ'},{k:'sourceName',l:'ชื่อเว็บต้นทาง'}].map(f=>(
            <div key={f.k} className="mb-3">
              <label className="field-label">{f.l} {f.req&&<span className="required-mark">*</span>}</label>
              <input className="input-field" value={art[f.k]||''} onChange={e=>setArt({...art,[f.k]:e.target.value})} />
            </div>
          ))}
          {art.type==='internal' && (
            <div className="mb-3">
              <label className="field-label">เนื้อหา</label>
              <textarea className="input-field resize-none" style={{ height:120 }} value={art.content||''} onChange={e=>setArt({...art,content:e.target.value})} />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="field-label">หมวดหมู่</label>
              <select className="input-field" value={art.category} onChange={e=>setArt({...art,category:e.target.value})} style={{ appearance:'none' }}>
                {CATS.map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-2 pt-5">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-t1"><input type="checkbox" checked={art.published} onChange={e=>setArt({...art,published:e.target.checked})} className="accent-acc" />เผยแพร่</label>
              <label className="flex items-center gap-2 cursor-pointer text-sm text-t1"><input type="checkbox" checked={art.featured||false} onChange={e=>setArt({...art,featured:e.target.checked})} className="accent-acc" />Featured (home)</label>
            </div>
          </div>
          <button onClick={handleSave} disabled={saving} className="w-full py-3 rounded-xl text-sm font-bold text-white border-none cursor-pointer" style={{ background:'var(--acc)' }}>
            {saving?'กำลังบันทึก...':'บันทึกการเปลี่ยนแปลง'}
          </button>
        </div>
      )}
    </DashboardShell>
  )
}
