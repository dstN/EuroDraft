import type { SharedRunRecord } from './shareStorage'

const OUTCOME_LABELS: Record<string, string> = {
  winner: 'CONTINENTAL CHAMPIONS',
  runner_up: 'TOURNAMENT RUNNER-UP',
  semi_final: 'SEMI-FINALIST · TOP 4',
  quarter_final: 'QUARTER-FINALIST · TOP 8',
  group_stage: 'GROUP STAGE EXIT'
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value
}

/** Renders a 1200x630 Open Graph card for a shared tournament run, matching the site's static og-image.svg style */
export function renderShareOgImage(record: SharedRunRecord | undefined): string {
  const teamName = escapeXml(truncate(record?.teamName || 'Dream XI', 26))
  const formation = escapeXml(record?.formation || '4-4-2')
  const ovr = Number.isFinite(record?.teamOVR) ? record!.teamOVR : 0
  const outcomeLabel = OUTCOME_LABELS[record?.outcome ?? ''] ?? 'TOURNAMENT RESULT'
  const isWinner = record?.outcome === 'winner'
  const lineRatings = record?.lineRatings ?? { def: 0, mid: 0, att: 0, overall: ovr }

  const stat = (label: string, value: number, x: number) => `
    <g transform="translate(${x}, 410)" text-anchor="middle">
      <text font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="800" fill="#9ca3af" letter-spacing="2">${label}</text>
      <text y="42" font-family="system-ui, -apple-system, sans-serif" font-size="40" font-weight="900" fill="#ffffff">${value}</text>
    </g>`

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <linearGradient id="badgeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${isWinner ? '#fbbf24' : '#10b981'}" />
      <stop offset="100%" stop-color="${isWinner ? '#d97706' : '#047857'}" />
    </linearGradient>
    <filter id="cardShadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#000000" flood-opacity="0.5" />
    </filter>
  </defs>

  <rect width="1200" height="630" fill="#060b10" />
  <circle cx="600" cy="150" r="420" fill="${isWinner ? '#fbbf24' : '#10b981'}" opacity="0.12" filter="blur(90px)" />
  <rect x="80" y="60" width="1040" height="510" rx="28" fill="none" stroke="#ffffff" stroke-width="1.5" opacity="0.08" />

  <!-- EuroDraft wordmark -->
  <text x="600" y="110" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="26" font-weight="900" letter-spacing="-0.5">
    <tspan fill="#ffffff">Euro</tspan><tspan fill="#fbbf24">Draft</tspan>
  </text>

  <!-- Outcome badge -->
  <g transform="translate(600, 175)" filter="url(#cardShadow)">
    <rect x="-260" y="-28" width="520" height="56" rx="28" fill="url(#badgeGrad)" />
    <text text-anchor="middle" y="8" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="900" fill="#060b10" letter-spacing="2">${outcomeLabel}</text>
  </g>

  <!-- Team name -->
  <text x="600" y="290" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="64" font-weight="900" fill="#ffffff" letter-spacing="-1">${teamName}</text>

  <!-- Formation -->
  <text x="600" y="330" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="700" fill="#34d399" letter-spacing="4">${formation} FORMATION</text>

  <!-- Line rating stats row -->
  ${stat('DEF', lineRatings.def, 375)}
  ${stat('MID', lineRatings.mid, 525)}
  ${stat('ATT', lineRatings.att, 675)}
  ${stat('OVERALL', lineRatings.overall, 850)}

  <!-- Footer -->
  <text x="600" y="545" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="600" fill="#6b7280" letter-spacing="1">Draft Historical Squads &amp; Battle in Simulated Championships</text>
</svg>`
}
