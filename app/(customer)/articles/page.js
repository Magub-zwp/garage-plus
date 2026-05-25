'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { useArticles } from '@/hooks/useArticles'
import ArticleCard from '@/components/customer/ArticleCard'
import BottomNav from '@/components/customer/BottomNav'

const CATS = ['ทั้งหมด', 'ดูแลรักษา', 'Tips', 'โปรโมชั่น', 'ฤดูกาล', 'ความปลอดภัย']

export default function ArticlesPage() {
  useAuth()
  const [cat, setCat] = useState('ทั้งหมด')
  const { articles, loading } = useArticles(cat === 'ทั้งหมด' ? 'all' : cat, 20)

  return (
    <div className="page-container pb-24">
      <div className="page-header">
        <Link href="/home" className="back-btn">‹</Link>
        <h1 className="page-title">บทความ & เกร็ดความรู้</h1>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 px-4 mb-4 overflow-x-auto no-scrollbar pb-1">
        {CATS.map(c => (
          <button key={c} onClick={() => setCat(c)}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border-none cursor-pointer"
            style={{ background:cat===c?'var(--acc)':`var(--surf)`, color:cat===c?'#fff':'var(--t2)', border:`0.5px solid ${cat===c?'var(--acc)':'var(--brd2)'}` }}>
            {c}
          </button>
        ))}
      </div>
        
      {loading ? (
        <div className="flex justify-center pt-16"><span className="inline-block w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor:'var(--acc)',borderTopColor:'transparent' }}/></div>
      ) : articles.length === 0 ? (
        <div className="flex flex-col items-center pt-16 px-8 text-center">
          <span className="text-4xl mb-3">📰</span>
          <p className="font-syne text-sm font-bold text-t1 mb-1">ยังไม่มีบทความ</p>
          <p className="text-xs text-t2">กลับมาใหม่เร็วๆ นี้</p>
        </div>
      ) : (
        <div className="px-4 flex flex-col gap-3">
          {articles.map(a => (
            <div key={a.id} className="bg-surf border-token rounded-2xl overflow-hidden cursor-pointer active:opacity-80 flex gap-3 items-center p-3"
              onClick={async () => {
                
                if (a.type === 'external' && a.sourceUrl) window.open(a.sourceUrl,'_blank','noopener,noreferrer')
                else window.location.href = `/articles/${a.id}`
              }}>
              {/* Thumbnail */}
              <div className="flex-shrink-0 rounded-xl overflow-hidden relative" style={{ width:72, height:72, background:'var(--s2)' }}>
                {a.thumbnailUrl ? (
                  <>
                    <img src={a.thumbnailUrl} alt="" style={{ width:'100%',height:'100%',objectFit:'cover' }}
                      onError={e => { e.target.style.display='none'; if(e.target.nextSibling) e.target.nextSibling.style.display='flex' }} />
                    <div style={{ display:'none',width:'100%',height:'100%',alignItems:'center',justifyContent:'center',fontSize:24,position:'absolute',top:0,left:0 }}>
                      {a.icon||'📄'}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full text-2xl">{a.icon||'📄'}</div>
                )}
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-syne text-xs font-bold text-t1 leading-snug mb-1"
                  style={{ display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden' }}>
                  {a.title}
                </p>
                <div className="flex items-center gap-1.5">
                  {a.sourceFavicon && <img src={a.sourceFavicon} alt="" style={{ width:11,height:11,borderRadius:2 }} onError={e=>e.target.style.display='none'} />}
                  <span className="text-t3" style={{ fontSize:9 }}>{a.type==='external'?(a.sourceName||'เว็บภายนอก'):'179 Auto'}</span>
                  <span className="text-t3" style={{ fontSize:9 }}>·</span>
                  <span className="text-t3" style={{ fontSize:9 }}>{a.reads||0} อ่าน</span>
                </div>
              </div>
              <span className="text-acc text-sm flex-shrink-0">›</span>
            </div>
          ))}
        </div>
      )}
      <BottomNav />
    </div>
  )
}
