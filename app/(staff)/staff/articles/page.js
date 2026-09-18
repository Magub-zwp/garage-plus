'use client'
import { useState, useEffect, Suspense } from 'react'
// useSearchParams ทำให้ component re-render เมื่อ URL เปลี่ยน
// จึงใช้ trigger refetch รายการบทความโดยอัตโนมัติหลังกลับมาจากหน้าสร้างบทความใหม่
import { useSearchParams } from 'next/navigation'
import DashboardShell from '@/components/staff/DashboardShell'
import Link from 'next/link'
import { getAllArticles, updateArticle, deleteArticle } from '@/lib/firebase/firestore'
import { Plus, Newspaper, Link2, FileText } from 'lucide-react'

export default function StaffArticlesPage() {
  return (
    <Suspense fallback={null}>
      <StaffArticlesPageContent />
    </Suspense>
  )
}

function StaffArticlesPageContent() {
  const searchParams = useSearchParams()
  const [articles, setArticles] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState('all')

  
  useEffect(() => {
    setLoading(true)
    getAllArticles().then(setArticles).catch(console.error).finally(() => setLoading(false))
  }, [searchParams.get('refresh')])
// Function to toggle publish status of an article
  const togglePublish = async (id, current) => {
    await updateArticle(id, { published: !current })
    setArticles(prev => prev.map(a => a.id===id ? {...a, published:!a.published} : a))
  }
  const handleDelete = async (id) => {
    if (!confirm('ลบบทความนี้?')) return
    await deleteArticle(id)
    setArticles(prev => prev.filter(a => a.id!==id))
  }

  const shown = filter==='all' ? articles : articles.filter(a => a.type===filter)
// Filter articles based on selected type (all, external, internal)
  return (
    <DashboardShell requiredRole="admin">
      <div className="flex justify-between items-center mb-5">
        <h1 className="font-syne text-xl font-bold text-t1">จัดการบทความ</h1>
        <Link href="/staff/articles/new">
          <button className="px-4 py-2 rounded-full text-xs font-bold text-white border-none cursor-pointer flex items-center gap-1.5"
            style={{ background:'var(--acc)' }}>
            <Plus size={14} />
            <span>เพิ่มบทความ / URL</span>
          </button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label:'ทั้งหมด',           value:articles.length,                                      color:'var(--t1)' },
          { label:'External (ลิงก์)',  value:articles.filter(a=>a.type==='external').length,       color:'var(--blue)' },
          { label:'Internal (เขียนเอง)',value:articles.filter(a=>a.type==='internal').length,      color:'var(--acc)' },
        ].map(s => (
          <div key={s.label} className="card p-4 text-center">
            <div className="text-t2 text-xs mb-1">{s.label}</div>
            <div className="font-syne text-2xl font-extrabold" style={{ color:s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {[
          { k:'all',      l:'ทั้งหมด',   Icon: null },
          { k:'external', l:'External', Icon: Link2 },
          { k:'internal', l:'Internal', Icon: FileText }
        ].map(f => {
          const isSel = filter === f.k
          return (
            <button key={f.k} onClick={() => setFilter(f.k)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold border-none cursor-pointer flex items-center gap-1.5"
              style={{
                background: isSel ? 'var(--acc)' : 'var(--surf)',
                color:      isSel ? '#fff' : 'var(--t2)',
                border:     `0.5px solid ${isSel ? 'var(--acc)' : 'var(--brd2)'}`
              }}>
              {f.Icon && <f.Icon size={13} />}
              <span>{f.l}</span>
            </button>
          )
        })}
      </div>
// Article list or loading/error states
      {loading ? (
        <div className="flex justify-center pt-16">
          <span className="inline-block w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor:'var(--acc)', borderTopColor:'transparent' }}/>
        </div>
      ) : shown.length === 0 ? (
        <div className="card p-10 text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-2xl bg-s2 text-t3 flex items-center justify-center mb-3">
            <Newspaper size={24} strokeWidth={1.75} />
          </div>
          <p className="font-syne text-sm font-bold text-t1 mb-1">ยังไม่มีบทความ</p>
          <p className="text-xs text-t2">กด "+ เพิ่มบทความ" เพื่อเริ่มต้น</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="data-table" style={{ tableLayout:'fixed', width:'100%' }}>
            <colgroup><col/><col style={{ width:90 }}/><col style={{ width:80 }}/><col style={{ width:64 }}/><col style={{ width:56 }}/></colgroup>
            <thead>
              <tr><th>ชื่อ</th><th>ประเภท</th><th>หมวด</th><th>สถานะ</th><th></th></tr>
            </thead>
            <tbody>
              {shown.map(a => (
                <tr key={a.id}>
                  <td className="text-sm font-semibold text-t1 truncate">{a.title||'-'}</td>
                  <td><span className={`bdg ${a.type==='external'?'bdg-hold':'bdg-done'}`}>{a.type==='external'?'🔗 Link':'📝 Own'}</span></td>
                  <td className="text-xs text-t2">{a.category||'-'}</td>
                  <td>
                    <button onClick={() => togglePublish(a.id, a.published)}
                      className="text-xs font-bold px-2 py-1 rounded-full border-none cursor-pointer"
                      style={{ background:a.published?'var(--gdim)':'var(--s2)', color:a.published?'var(--grn)':'var(--t3)' }}>
                      {a.published?'เผยแพร่':'ซ่อน'}
                    </button>
                  </td>
                  <td>
                    <button onClick={() => handleDelete(a.id)}
                      className="text-xs font-bold px-2 py-1 rounded-full border-none cursor-pointer"
                      style={{ background:'var(--errdim)', color:'var(--err)' }}>ลบ</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardShell>
  )
}
