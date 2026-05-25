'use client'
import { incrementArticleReads } from '@/lib/firebase/firestore'

const CAT_COLORS = {
  'ดูแลรักษา': { bg:'var(--adim)', color:'var(--acc)', brd:'var(--abrd)' },
  'Tips':       { bg:'var(--bldim)',color:'var(--blue)',brd:'rgba(24,95,165,.28)' },
  'โปรโมชั่น':  { bg:'var(--gdim)', color:'var(--grn)', brd:'var(--gbrd)' },
  'ฤดูกาล':    { bg:'rgba(234,179,8,.1)',color:'#854F0B',brd:'rgba(234,179,8,.3)' },
  'ความปลอดภัย':{ bg:'var(--errdim)',color:'var(--err)',brd:'rgba(232,92,58,.28)' },
}

export default function ArticleCard({ article, width=210 }) {
  const cat   = CAT_COLORS[article.category] || CAT_COLORS['ดูแลรักษา']
  const isExt = article.type === 'external'

  const handleClick = async () => {
    try { await incrementArticleReads(article.id) } catch {}
    if (isExt && article.sourceUrl) window.open(article.sourceUrl,'_blank','noopener,noreferrer')
    else window.location.href = `/articles/${article.id}`
  }

  return (
    <div onClick={handleClick} className="bg-surf border-token rounded-2xl overflow-hidden cursor-pointer active:opacity-80 flex-shrink-0" style={{ width }}>
      <div className="relative" style={{ height:100, background:'var(--s2)' }}>
        {article.thumbnailUrl
          ? <img src={article.thumbnailUrl} alt={article.title} style={{ width:'100%',height:'100%',objectFit:'cover' }} onError={e=>e.target.style.display='none'} />
          : <div className="flex items-center justify-center h-full text-3xl">{article.icon||'📄'}</div>}
        <div className="absolute top-2 left-2">
          <span className="font-bold px-2 py-0.5 rounded-full" style={{ background:cat.bg,color:cat.color,border:`0.5px solid ${cat.brd}`,fontSize:9 }}>{article.category}</span>
        </div>
      </div>
      <div className="p-2.5">
        <p className="font-syne text-xs font-bold text-t1 leading-snug mb-2" style={{ display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden' }}>{article.title}</p>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1 min-w-0">
            {article.sourceFavicon && <img src={article.sourceFavicon} alt="" style={{ width:12,height:12,borderRadius:2,flexShrink:0 }} onError={e=>e.target.style.display='none'} />}
            <span className="text-t3 truncate" style={{ fontSize:9 }}>{isExt?(article.sourceName||'เว็บภายนอก'):'179 Auto'}</span>
          </div>
          <span className="text-xs font-bold text-acc flex-shrink-0">อ่านต่อ →</span>
        </div>
      </div>
    </div>
  )
}
