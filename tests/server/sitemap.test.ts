import { describe, expect, it } from 'vitest'
import { callRoute } from './helpers'

const handler = (await import('../../server/routes/sitemap.xml')).default

describe('GET /sitemap.xml', () => {
  it('serves well-formed XML with the correct content type', async () => {
    const res = await callRoute(handler, '/sitemap.xml', '/sitemap.xml')

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('application/xml')
    expect(res.text).toContain('<?xml version="1.0" encoding="UTF-8"?>')
    expect(res.text).toContain('<urlset')
  })

  it('lists every public static route as an absolute URL', async () => {
    const res = await callRoute(handler, '/sitemap.xml', '/sitemap.xml')

    for (const path of ['https://ed.rntm.de/', 'https://ed.rntm.de/draft/formation', 'https://ed.rntm.de/tournament', 'https://ed.rntm.de/compare', 'https://ed.rntm.de/leaderboard', 'https://ed.rntm.de/history', 'https://ed.rntm.de/legal']) {
      expect(res.text).toContain(`<loc>${path}</loc>`)
    }
  })

  it('excludes /r/** and /og/** from the listed routes', async () => {
    const res = await callRoute(handler, '/sitemap.xml', '/sitemap.xml')

    expect(res.text).not.toContain('/r/')
    expect(res.text).not.toContain('/og/')
  })

  it('includes hreflang alternates for every configured locale, plus x-default', async () => {
    const res = await callRoute(handler, '/sitemap.xml', '/sitemap.xml')

    for (const locale of ['en', 'de', 'fr', 'es', 'it', 'pt', 'nl', 'pl', 'tr', 'ru']) {
      expect(res.text).toContain(`hreflang="${locale}"`)
    }
    expect(res.text).toContain('hreflang="x-default"')
  })

  it('prefixes non-default locale alternates with the locale code, and leaves English unprefixed', async () => {
    const res = await callRoute(handler, '/sitemap.xml', '/sitemap.xml')

    expect(res.text).toContain('href="https://ed.rntm.de/tournament"')
    expect(res.text).toContain('href="https://ed.rntm.de/de/tournament"')
    expect(res.text).toContain('href="https://ed.rntm.de/de"')
  })
})
