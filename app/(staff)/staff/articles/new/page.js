'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import DashboardShell from '@/components/staff/DashboardShell'
import { createArticle } from '@/lib/firebase/firestore'
import { getSession } from '@/lib/staff/session'

const CATS = ['ดูแลรักษา','Tips','โปรโมชั่น','ฤดูกาล','ความปลอดภัย']

export default function NewArticlePage() {
  const router  = useRouter()
  const [type,      setType]      = useState('external')
  const [url,       setUrl]       = useState('')
  const [fetching,  setFetching]  = useState(false)
  const [fetchError, setFetchError] = useState('')
  const [form,      setForm]      = useState({ title:'', description:'', thumbnailUrl:'', sourceName:'', sourceFavicon:'', content:'' })
  const [preview,   setPreview]   = useState(null)
  const [category,  setCategory]  = useState('ดูแลรักษา')
  const [tags,      setTags]      = useState('')
  const [published, setPublished] = useState(true)
  const [featured,  setFeatured]  = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')
// Function to fetch metadata from given URL and populate form
  const fetchMeta = async () => {
    if (!url.trim()) { setFetchError('กรุณากรอก URL'); return }
    setFetching(true); setFetchError(''); setPreview(null)
    try {
      const res  = await fetch(`/api/articles/meta?url=${encodeURIComponent(url.trim())}`)
      const data = await res.json()
      if (!data.ok) { setFetchError(data.error || 'ดึงข้อมูลไม่ได้'); return }
      const d = data.data
      setForm({ title:d.title, description:d.description, thumbnailUrl:d.image, sourceName:d.siteName, sourceFavicon:d.favicon, content:'' })
      setPreview(d)
    } catch { setFetchError('เกิดข้อผิดพลาด กรุณาลองใหม่') }
    finally { setFetching(false) }
  }
// Function to handle save button click, with option to publish immediately or save as draft
  const handleSave = async (publish) => {
    if (!form.title.trim()) { setError('กรุณากรอกชื่อบทความ'); return }
    if (!category) { setError('กรุณาเลือกหมวดหมู่'); return }
    setError(''); setSaving(true)
    try {
      const session = getSession()
      const tagArr  = tags.split(',').map(t=>t.trim()).filter(Boolean)
      await createArticle({
        type, sourceUrl:type==='external'?url.trim():'',
        sourceName:form.sourceName, sourceFavicon:form.sourceFavicon,
        title:form.title, description:form.description,
        thumbnailUrl:form.thumbnailUrl, content:form.content,
        category, tags:tagArr, published:publish, featured,
        addedBy:session?.uid||'', scrapedAt:type==='external'?new Date():null,
      })
      router.replace('/staff/articles?refresh=' + Date.now())
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  return (
    <DashboardShell requiredRole="admin">
      <div className="flex items-center gap-3 mb-5">
        <Link href="/staff/articles" className="text-t2 hover:text-t1 text-sm">‹ กลับ</Link>
        <h1 className="font-syne text-xl font-bold text-t1">เพิ่มบทความ / URL</h1>
      </div>

      {/* Type selector */}
      <div className="grid grid-cols-2 gap-3 mb-5 max-w-lg">
        {[{k:'external',icon:'🔗',t:'วาง URL จากเว็บ',s:'ดึง metadata อัตโนมัติ'},{k:'internal',icon:'📝',t:'เขียนเอง',s:'สร้าง content ในระบบ'}].map(tp=>(
          <button key={tp.k} onClick={()=>setType(tp.k)}
            className="rounded-xl p-4 text-left cursor-pointer border-none"
            style={{ background:type===tp.k?'var(--adim)':'var(--surf)', border:`0.5px solid ${type===tp.k?'var(--abrd)':'var(--brd2)'}` }}>
            <div style={{ fontSize:22 }} className="mb-2">{tp.icon}</div>
            <div className="font-syne text-sm font-bold text-t1">{tp.t}</div>
            <div className="text-t3 text-xs mt-1">{tp.s}</div>
          </button>
        ))}
      </div>

      <div className="max-w-2xl flex flex-col gap-5">
        {/* URL Input (external) */}
        {type === 'external' && (
          <div className="card p-5">
            <label className="field-label mb-2">URL บทความจากเว็บภายนอก <span className="required-mark">*</span></label>
            <div className="flex gap-2">
              <input className="input-field flex-1" type="url" placeholder="https://www.headlightmag.com/..." value={url} onChange={e=>setUrl(e.target.value)} onKeyDown={e=>e.key==='Enter'&&fetchMeta()} />
              <button onClick={fetchMeta} disabled={fetching}
                className="px-4 py-2 rounded-xl text-sm font-bold text-white border-none cursor-pointer flex-shrink-0 flex items-center gap-2"
                style={{ background:'var(--acc)' }}>
                {fetching?<><span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>ดึง...</>:'✨ ดึงข้อมูล'}
              </button>
            </div>
            {fetchError && <p className="text-xs text-err mt-2">⚠️ {fetchError}</p>}
            <p className="text-xs text-t3 mt-2">รองรับ: Headlight Magazine, Pantip, Sanook Auto, YouTube, และเว็บส่วนใหญ่ที่มี Open Graph tags</p>

            {/* Preview */}
            {preview && (
              <div className="mt-4 p-3 rounded-xl flex gap-3 items-center" style={{ background:'var(--gdim)', border:'0.5px solid var(--gbrd)' }}>
                {preview.image && <img src={preview.image} alt="" style={{ width:64,height:64,objectFit:'cover',borderRadius:8,flexShrink:0 }} onError={e=>e.target.style.display='none'} />}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    {preview.favicon && <img src={preview.favicon} alt="" style={{ width:14,height:14,borderRadius:2 }} />}
                    <span className="text-xs font-semibold text-grn">{preview.siteName}</span>
                  </div>
                  <p className="text-sm font-bold text-t1 truncate">{preview.title}</p>
                  <p className="text-xs text-t2 mt-0.5 truncate">{preview.description}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Editable Fields */}
        <div className="card p-5">
          <h3 className="font-syne text-sm font-bold text-t1 mb-4">{type==='external'?'ตรวจสอบ/แก้ไขข้อมูล':'กรอกข้อมูลบทความ'}</h3>
          {error && <div className="mb-4 p-3 rounded-xl text-xs text-err bg-errdim" style={{ border:'0.5px solid rgba(232,92,58,.25)' }}>⚠️ {error}</div>}

          <div className="mb-3">
            <label className="field-label">ชื่อบทความ <span className="required-mark">*</span></label>
            <input className="input-field" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="ชื่อบทความ..." />
          </div>
          <div className="mb-3">
            <label className="field-label">คำอธิบายสั้น</label>
            <textarea className="input-field resize-none" style={{ height:72 }} value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="คำอธิบายย่อ..." />
          </div>
          <div className="mb-3">
            <label className="field-label">URL รูปภาพปก</label>
            <input className="input-field" value={form.thumbnailUrl} onChange={e=>setForm({...form,thumbnailUrl:e.target.value})} placeholder="https://..." />
            {form.thumbnailUrl && <img src={form.thumbnailUrl} alt="" style={{ marginTop:8,height:80,borderRadius:8,objectFit:'cover' }} onError={e=>e.target.style.display='none'} />}
          </div>
          {type === 'external' && (
            <div className="mb-3">
              <label className="field-label">ชื่อเว็บต้นทาง (source)</label>
              <input className="input-field" value={form.sourceName} onChange={e=>setForm({...form,sourceName:e.target.value})} placeholder="เช่น Headlight Magazine" />
            </div>
          )}
          {type === 'internal' && (
            <div className="mb-3">
              <label className="field-label">เนื้อหาบทความ</label>
              <textarea className="input-field resize-none" style={{ height:160 }} value={form.content} onChange={e=>setForm({...form,content:e.target.value})} placeholder="เขียนเนื้อหาบทความที่นี่..." />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="field-label">หมวดหมู่ <span className="required-mark">*</span></label>
              <select className="input-field" value={category} onChange={e=>setCategory(e.target.value)} style={{ appearance:'none' }}>
                {CATS.map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Tags (คั่นด้วย ,)</label>
              <input className="input-field" value={tags} onChange={e=>setTags(e.target.value)} placeholder="น้ำมัน, เบรก, บำรุง" />
            </div>
          </div>

          <div className="flex gap-4 mb-5">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-t1">
              <input type="checkbox" checked={featured} onChange={e=>setFeatured(e.target.checked)} className="accent-acc" />
              ปักหมุดบน Home (Featured)
            </label>
          </div>

          <div className="flex gap-3">
            <button onClick={()=>handleSave(true)} disabled={saving}
              className="flex-1 py-3 rounded-xl text-sm font-bold text-white border-none cursor-pointer flex items-center justify-center gap-2"
              style={{ background:'var(--acc)' }}>
              {saving?<><span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>บันทึก...</>:'🚀 เผยแพร่ทันที'}
            </button>
            <button onClick={()=>handleSave(false)} disabled={saving}
              className="flex-1 py-3 rounded-xl text-sm font-semibold text-t1 border-none cursor-pointer"
              style={{ background:'var(--s2)', border:'0.5px solid var(--brd2)' }}>
              บันทึกร่าง
            </button>
          </div>
        </div>
      </div>
    </DashboardShell>
  )
}
