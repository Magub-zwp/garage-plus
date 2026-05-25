'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { getArticle, incrementArticleReads } from '@/lib/firebase/firestore'
import BottomNav from '@/components/customer/BottomNav'

export default function ArticleDetailPage() {
  useAuth()
  const { id }      = useParams()
  const [art, setArt] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    getArticle(id).then(a => {
      if (a && a.type === 'external' && a.sourceUrl) {
        // External: redirect to source URL directly
        window.location.replace(a.sourceUrl)
        return
      }
      setArt(a)
      if (a) incrementArticleReads(id).catch(()=>{})
    }).finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="page-container pb-24">
      <div className="flex justify-center pt-20"><span className="inline-block w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor:'var(--acc)',borderTopColor:'transparent' }}/></div>
    </div>
  )

  if (!art) return (
    <div className="page-container pb-24">
      <div className="page-header"><Link href="/articles" className="back-btn">‹</Link><h1 className="page-title">ไม่พบบทความ</h1></div>
    </div>
  )

  return (
    <div className="page-container pb-24">
      <div className="page-header">
        <Link href="/articles" className="back-btn">‹</Link>
        <h1 className="page-title">บทความ</h1>
      </div>
      {art.thumbnailUrl && (
        <div style={{ width:'100%', height:180, overflow:'hidden' }}>
          <img src={art.thumbnailUrl} alt={art.title} style={{ width:'100%',height:'100%',objectFit:'cover' }} />
        </div>
      )}
      <div className="px-4 pt-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background:'var(--adim)',color:'var(--acc)',border:'0.5px solid var(--abrd)' }}>{art.category}</span>
          <span className="text-xs text-t3">{art.reads||0} ครั้งที่อ่าน</span>
        </div>
        <h1 className="font-syne text-lg font-extrabold text-t1 mb-3 leading-snug">{art.title}</h1>
        {art.description && (
          <p className="text-sm text-t2 leading-relaxed mb-4 p-3 rounded-xl" style={{ background:'var(--s2)' }}>{art.description}</p>
        )}
        {art.content && (
          <div className="text-sm text-t1 leading-relaxed whitespace-pre-line">{art.content}</div>
        )}
        <div className="mt-6 pt-4" style={{ borderTop:'0.5px solid var(--brd)' }}>
          <p className="text-xs text-t3">แหล่งที่มา: 179 Auto · Doi Saket</p>
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
