import { parse } from 'node-html-parser'

/**
 * ฟังก์ชันนี้ถูกเรียกจาก /api/articles/meta เพื่อดึงข้อมูล Open Graph จาก URL ที่ผู้ใช้ส่งมา
 * Fetch Open Graph metadata from a public URL
 * Used by /api/articles/meta — never called from browser (CORS)
 */
export async function fetchOgMeta(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; GaragePlus/3.0; +https://garageplus.app)',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'th,en;q=0.9',
    },
    signal: AbortSignal.timeout(8000),
    redirect: 'follow',
  })

  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const html = await res.text()
  const root = parse(html)

  const og   = (prop) => root.querySelector(`meta[property="og:${prop}"]`)?.getAttribute('content') || ''
  const meta = (name) => root.querySelector(`meta[name="${name}"]`)?.getAttribute('content') || ''

  const hostname  = new URL(url).hostname
  const title     = og('title')       || root.querySelector('title')?.text || ''
  const desc      = og('description') || meta('description') || ''
  const image     = og('image')       || meta('image') || ''
  const siteName  = og('site_name')   || hostname.replace(/^www\./, '')
  const canonical = og('url')         || url
  const favicon   = `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`

  return {
    title:    title.trim().substring(0, 200),
    description: desc.trim().substring(0, 500),
    image:    image.trim(),
    siteName: siteName.trim().substring(0, 100),
    url:      canonical.trim(),
    favicon,
  }
}

/**
 * Validate URL — block private/internal IPs (SSRF protection)
 */
export function validatePublicUrl(urlStr) {
  let parsed
  try { parsed = new URL(urlStr) } catch { return 'URL ไม่ถูกต้อง' }
  if (!['http:','https:'].includes(parsed.protocol)) return 'รองรับเฉพาะ http/https'
  const h = parsed.hostname
  const privatePatterns = [
    /^localhost$/, /^127\./, /^0\./, /^::1$/,
    /^10\./, /^172\.(1[6-9]|2\d|3[01])\./, /^192\.168\./,
    /^169\.254\./, /^fc00:/, /^fd/, /^fe80:/,
  ]
  if (privatePatterns.some(p => p.test(h))) return 'ไม่รองรับ URL ภายในระบบ'
  return null // null = valid
}
