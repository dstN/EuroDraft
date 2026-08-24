import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const LOCALES_DIR = resolve(__dirname, '../../i18n/locales')

function flattenKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return flattenKeys(value as Record<string, unknown>, path)
    }
    return [path]
  })
}

function loadLocale(file: string): Record<string, unknown> {
  return JSON.parse(readFileSync(resolve(LOCALES_DIR, file), 'utf-8'))
}

const localeFiles = readdirSync(LOCALES_DIR).filter(f => f.endsWith('.json'))
const enKeys = new Set(flattenKeys(loadLocale('en.json')))

describe('i18n locale key parity', () => {
  it('has more than one locale to compare (sanity check the fixture discovery worked)', () => {
    expect(localeFiles.length).toBeGreaterThan(1)
  })

  it.each(localeFiles.filter(f => f !== 'en.json'))('%s defines every key present in en.json', (file) => {
    const keys = new Set(flattenKeys(loadLocale(file)))
    const missing = [...enKeys].filter(k => !keys.has(k))

    expect(missing).toEqual([])
  })

  it.each(localeFiles.filter(f => f !== 'en.json'))('%s has no keys absent from en.json (stale/typo guard)', (file) => {
    const keys = flattenKeys(loadLocale(file))
    const extra = keys.filter(k => !enKeys.has(k))

    expect(extra).toEqual([])
  })
})
