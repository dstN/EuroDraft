const SITE_URL = 'https://ed.rntm.de'

// Kept in sync manually with nuxt.config.ts's i18n.locales -- small, static,
// and rarely changes, so a shared runtime-config lookup isn't worth the
// indirection. defaultLocale ('en') is unprefixed under the
// prefix_except_default strategy those locales are configured with.
const LOCALES = ['en', 'de', 'fr', 'es', 'it', 'pt', 'nl', 'pl', 'tr', 'ru']
const DEFAULT_LOCALE = 'en'

// Public, static, content-bearing routes only. `/r/[id]` (per-user share
// results) and `/og/[id]` (the OG image endpoint) are deliberately excluded
// -- see robots.txt's Disallow rules for the same two prefixes. `/draft`
// (without /formation) and `/legal/impressum` (a redirect shim to /legal)
// aren't real standalone destinations either.
const ROUTES = ['/', '/draft/formation', '/tournament', '/compare', '/leaderboard', '/history', '/legal']

function localizedPath(route: string, locale: string): string {
  if (locale === DEFAULT_LOCALE) return route
  return route === '/' ? `/${locale}` : `/${locale}${route}`
}

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;')
}

export default defineEventHandler((event) => {
  setHeader(event, 'content-type', 'application/xml; charset=utf-8')
  setHeader(event, 'cache-control', 'public, max-age=86400')

  const urls = ROUTES.map((route) => {
    const alternates = LOCALES
      .map(locale => `      <xhtml:link rel="alternate" hreflang="${locale}" href="${escapeXml(SITE_URL + localizedPath(route, locale))}" />`)
      .join('\n')
    const xDefault = `      <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(SITE_URL + route)}" />`

    return `  <url>
    <loc>${escapeXml(SITE_URL + route)}</loc>
${alternates}
${xDefault}
  </url>`
  }).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}
</urlset>`
})
