import circleFlags from '@iconify-json/circle-flags/icons.json'

const flagImageCache = new Map<string, HTMLImageElement>()

export function getFlagDataUrl(country: string): string {
  let code = (country || 'eu').toLowerCase().trim()
  if (code === 'cs') code = 'cz'
  if (code === 'cis' || code === 'su') code = 'ru'
  if (code === 'yu') code = 'rs'
  if (code === 'gb') code = 'gb-eng'

  const icon = (circleFlags.icons as Record<string, { body: string }>)[code]
  if (!icon) {
    const fallbackSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><circle cx="256" cy="256" r="256" fill="#1e293b"/><text x="256" y="280" font-size="140" font-family="sans-serif" font-weight="bold" fill="#ffffff" text-anchor="middle">${code.toUpperCase()}</text></svg>`
    return `data:image/svg+xml;utf8,${encodeURIComponent(fallbackSvg)}`
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">${icon.body}</svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

export function loadFlagImage(country: string): Promise<HTMLImageElement> {
  const code = (country || 'eu').toLowerCase().trim()
  if (flagImageCache.has(code)) {
    return Promise.resolve(flagImageCache.get(code)!)
  }

  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      return
    }
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      flagImageCache.set(code, img)
      resolve(img)
    }
    img.onerror = () => {
      resolve(img)
    }
    img.src = getFlagDataUrl(code)
  })
}
