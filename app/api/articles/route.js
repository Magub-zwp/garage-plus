import { NextResponse } from 'next/server'
import { getPublishedArticles, getArticlesByCategory, getAllArticles, createArticle } from '@/lib/firebase/firestore'

/** GET /api/articles?category=all&limit=10&staff=1 */
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const cat   = searchParams.get('category') || 'all'
  const lim   = Math.min(parseInt(searchParams.get('limit') || '10'), 50)
  const staff = searchParams.get('staff') === '1'
  try {
    const articles = staff
      ? await getAllArticles()
      : cat === 'all'
        ? await getPublishedArticles(lim)
        : await getArticlesByCategory(cat, lim)
    return NextResponse.json({ articles })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status:500 })
  }
}

/** POST /api/articles — create new article (staff only via client SDK) */
export async function POST(request) {
  try {
    const body = await request.json()
    const { type, sourceUrl, sourceName, sourceFavicon, title, description,
            thumbnailUrl, category, tags, published, featured, addedBy } = body
    if (!title || !category) return NextResponse.json({ error:'title and category required' }, { status:400 })
    const ref = await createArticle({ type:type||'internal', sourceUrl:sourceUrl||'', sourceName:sourceName||'', sourceFavicon:sourceFavicon||'', title, description:description||'', thumbnailUrl:thumbnailUrl||'', content:body.content||'', category, tags:tags||[], published:!!published, featured:!!featured, addedBy:addedBy||'', scrapedAt:null })
    return NextResponse.json({ id:ref.id }, { status:201 })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status:500 })
  }
}
