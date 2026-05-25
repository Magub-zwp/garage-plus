import { NextResponse } from 'next/server'
import { getArticle, updateArticle, deleteArticle, incrementArticleReads } from '@/lib/firebase/firestore'

export async function GET(request, { params }) {
  const article = await getArticle(params.id)
  if (!article) return NextResponse.json({ error:'NOT_FOUND' }, { status:404 })
  // Count read (fire-and-forget)
  const noCount = new URL(request.url).searchParams.get('nocount') === '1'
  if (!noCount && article.type === 'internal') incrementArticleReads(params.id).catch(()=>{})
  return NextResponse.json({ article })
}
export async function PATCH(request, { params }) {
  try {
    const body = await request.json()
    await updateArticle(params.id, body)
    return NextResponse.json({ ok:true })
  } catch (e) { return NextResponse.json({ error:e.message }, { status:500 }) }
}
export async function DELETE(request, { params }) {
  try { await deleteArticle(params.id); return NextResponse.json({ ok:true }) }
  catch (e) { return NextResponse.json({ error:e.message }, { status:500 }) }
}
