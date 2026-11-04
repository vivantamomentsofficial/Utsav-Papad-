import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { slug, path = '/' } = req.query
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  const siteUrl = (process.env.VITE_SITE_URL || 'https://utsavpapad.vercel.app').replace(/\/$/, '')

  let title = 'Utsav Food Technology - Papad & Food Processing Machinery'
  let description =
    'Manufacturer and exporter of automatic and semi-automatic papad machines from Vadodara, Gujarat since 1989.'
  let image = `${siteUrl}/logo.jpeg`
  const canonicalUrl = `${siteUrl}${String(path).startsWith('/') ? '' : '/'}${path}`

  if (slug && supabaseUrl && supabaseAnonKey) {
    try {
      const response = await fetch(
        `${supabaseUrl}/rest/v1/products?select=name,short_description,images&slug=eq.${encodeURIComponent(String(slug))}&is_active=eq.true&limit=1`,
        {
          headers: {
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${supabaseAnonKey}`,
          },
        }
      )
      if (response.ok) {
        const data = await response.json()
        const product = data?.[0]
        if (product) {
          title = `${product.name} | Utsav Food Technology`
          if (product.short_description) description = product.short_description
          if (product.images?.[0]) {
            image = product.images[0].startsWith('http')
              ? product.images[0]
              : `${siteUrl}${product.images[0]}`
          }
        }
      }
    } catch (err) {
      console.warn('api/og: failed to fetch product metadata', err)
    }
  }

  const escape = (str: string) =>
    str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escape(title)}</title>
  <meta name="description" content="${escape(description)}">
  <link rel="canonical" href="${escape(canonicalUrl)}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${escape(title)}">
  <meta property="og:description" content="${escape(description)}">
  <meta property="og:image" content="${escape(image)}">
  <meta property="og:url" content="${escape(canonicalUrl)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escape(title)}">
  <meta name="twitter:description" content="${escape(description)}">
  <meta name="twitter:image" content="${escape(image)}">
</head>
<body>
  <h1>${escape(title)}</h1>
  <p>${escape(description)}</p>
  <img src="${escape(image)}" alt="${escape(title)}">
</body>
</html>`

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=43200')
  return res.status(200).send(html)
}
