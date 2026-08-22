/**
 * Name normalization utilities
 * Handles diacritics removal, casing, and normalization for matching and deduplication
 */

export function normalizeName(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // remove combining diacritics
    .replace(/[øØ]/g, 'o')
    .replace(/[æÆ]/g, 'ae')
    .replace(/ß/g, 'ss')
    .replace(/[ñÑ]/g, 'n')
    .replace(/[łŁ]/g, 'l')
    .replace(/[đĐ]/g, 'd')
    .replace(/[çÇ]/g, 'c')
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Generate a deterministic player ID: e.g. "es-2024-lamine-yamal"
 */
export function generatePlayerId(country: string, year: number, name: string): string {
  const norm = normalizeName(name).replace(/\s+/g, '-')
  return `${country.toLowerCase()}-${year}-${norm}`
}
