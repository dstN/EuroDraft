/**
 * Abbreviates a player's first name(s) to an initial, keeping the surname
 * intact -- e.g. "Edwin van der Sar" -> "E. van der Sar". Used on narrow
 * viewports where full names would otherwise be truncated down to just a
 * few characters before hitting the row's other elements (shirt number,
 * position badge, rating badge).
 */
export function abbreviateFirstName(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length < 2) return name
  const [first, ...rest] = parts
  return `${first!.charAt(0)}. ${rest.join(' ')}`
}
