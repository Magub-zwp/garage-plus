import { NextResponse } from 'next/server'
import { fetchOgMeta, validatePublicUrl } from '@/lib/scraper/ogMeta'

/** GET /api/articles/meta?url=https://... */
export async function GET(request) {
  const url = new URL(request.url).searchParams.get('url')
  if (!url) return NextResponse.json({ ok:false, error:'url is required' }, { status:400 })

  const err = validatePublicUrl(url)
  if (err) return NextResponse.json({ ok:false, error:err }, { status:400 })

  try {
    const data = await fetchOgMeta(url)
    return NextResponse.json({ ok:true, data })
  } catch (e) {
    return NextResponse.json({ ok:false, error:`ไม่สามารถดึงข้อมูลจาก URL นี้ได้: ${e.message}` }, { status:422 })
  }
}
