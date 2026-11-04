import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const publicDir = path.resolve(__dirname, '../public')
const sitemapPath = path.join(publicDir, 'sitemap.xml')

const siteUrl = (process.env.VITE_SITE_URL || 'https://utsavpapad.vercel.app').replace(/\/$/, '')
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

const staticRoutes = [
  '/',
  '/products',
  '/about',
  '/contact',
]

async function fetchActiveProductSlugs() {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY missing in sitemap generator. Using static routes.')
    return []
  }

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/products?select=slug&is_active=eq.true`, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    return Array.isArray(data) ? data.map((p) => p.slug).filter(Boolean) : []
  } catch (err) {
    console.warn('Failed to fetch product slugs from Supabase for sitemap:', err.message)
    return []
  }
}

async function main() {
  const productSlugs = await fetchActiveProductSlugs()
  const today = new Date().toISOString().slice(0, 10)

  const urls = [
    ...staticRoutes.map((route) => `  <url>
    <loc>${siteUrl}${route}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${route === '/' ? 'daily' : 'weekly'}</changefreq>
    <priority>${route === '/' ? '1.0' : '0.8'}</priority>
  </url>`),
    ...productSlugs.map((slug) => `  <url>
    <loc>${siteUrl}/products/${slug}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>`),
  ]

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`

  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true })
  }
  fs.writeFileSync(sitemapPath, xml, 'utf8')
  console.log(`✓ Generated sitemap.xml with ${urls.length} URLs at ${sitemapPath}`)
}

void main()
