#!/usr/bin/env node
// One-time, dev-time render of public/og-image.svg -> public/og-image.png
// using real Chromium (via the project's Playwright devDependency).
//
// Why: Discord (and most social-embed crawlers) don't render inline SVG for
// OpenGraph images. resvg-wasm was tried as a server-side SVG->PNG
// converter and rejected -- it doesn't render text/glyphs at all in this
// environment. Since the default OG card is static, static and rare to
// change, the practical fix is a one-time, dev-only render that gets
// committed as a plain PNG asset, with zero production runtime involved.
//
// Usage: node scripts/render-og-image.mjs
// Re-run and re-commit the resulting PNG whenever public/og-image.svg changes.

import { chromium } from 'playwright'
import { readFile, writeFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const svgPath = join(__dirname, '..', 'public', 'og-image.svg')
const pngPath = join(__dirname, '..', 'public', 'og-image.png')

const WIDTH = 1200
const HEIGHT = 630

const svg = await readFile(svgPath, 'utf8')

const html = `<!doctype html>
<html>
<head><meta charset="utf-8"><style>
  html,body{margin:0;padding:0;width:${WIDTH}px;height:${HEIGHT}px;overflow:hidden;}
  svg{display:block;}
</style></head>
<body>${svg}</body>
</html>`

const browser = await chromium.launch()
// deviceScaleFactor: 1 -- the source is a vector SVG with infinite
// resolution, so rendering at the exact 1200x630 declared in app.vue's
// ogImageWidth/ogImageHeight is already pixel-crisp; no upscaling benefit
// from a higher scale factor, just a larger file.
const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 })
await page.setContent(html, { waitUntil: 'networkidle' })
const pngBuffer = await page.screenshot({ type: 'png' })
await browser.close()

await writeFile(pngPath, pngBuffer)
console.log(`Wrote ${pngPath} (${pngBuffer.length} bytes, ${WIDTH}x${HEIGHT}px)`)
