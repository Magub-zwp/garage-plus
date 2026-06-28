import { NextResponse } from 'next/server'
import { getAdmin } from '@/lib/firebase/admin'
import { requireAdmin } from '@/lib/api/verifyAuth'

/** GET /api/articles?category=all&limit=10&staff=1 */
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const cat   = searchParams.get('category') || 'all'
  const lim   = Math.min(parseInt(searchParams.get('limit') || '10'), 50)
  const staff = searchParams.get('staff') === '1'

  try {
    const { db } = await getAdmin()
    let snap

    if (staff) {
      snap = await db.collection('articles').orderBy('createdAt', 'desc').get()
    } else if (cat === 'all') {
      snap = await db.collection('articles')
        .where('published', '==', true)
        .orderBy('createdAt', 'desc')
        .limit(lim)
        .get()
    } else {
      snap = await db.collection('articles')
        .where('published', '==', true)
        .where('category', '==', cat)
        .orderBy('createdAt', 'desc')
        .limit(lim)
        .get()
    }

    const articles = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    return NextResponse.json({ articles })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

/** POST /api/articles — create new article (admin only) */
export async function POST(request) {
  const caller = await requireAdmin(request)
  if (!caller) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const {
      type, sourceUrl, sourceName, sourceFavicon,
      title, description, thumbnailUrl, content,
      category, tags, published, featured, addedBy,
    } = body

    if (!title || !category) {
      return NextResponse.json({ error: 'title and category required' }, { status: 400 })
    }

    const { db } = await getAdmin()
    const { FieldValue } = await import('firebase-admin/firestore')

    const ref = await db.collection('articles').add({
      type:          type         || 'internal',
      sourceUrl:     sourceUrl    || '',
      sourceName:    sourceName   || '',
      sourceFavicon: sourceFavicon || '',
      title,
      description:   description  || '',
      thumbnailUrl:  thumbnailUrl  || '',
      content:       content       || '',
      category,
      tags:          tags          || [],
      published:     !!published,
      featured:      !!featured,
      addedBy:       addedBy       || caller.uid,
      scrapedAt:     null,
      createdAt:     FieldValue.serverTimestamp(),
    })

    return NextResponse.json({ id: ref.id }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
