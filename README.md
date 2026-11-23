# EuroDraft

> Draft an all-time European XI from the continental tournament squads since 1960, line it up in a formation and simulate a full tournament.

[![Nuxt UI](https://img.shields.io/badge/Made%20with-Nuxt%20UI-00DC82?logo=nuxt&labelColor=020420)](https://ui.nuxt.com)

## What is EuroDraft?

EuroDraft is a browser fantasy football game. Every player you can pick played in a continental tournament squad between 1960 and 2024.

### Core Loop

1. Choose a formation. The game draws 3 at random (4-4-2, 4-3-3, 4-2-3-1, etc.) and you pick one.
2. Spin the roulette. It lands on a country and year, e.g. *France 2000*, *Germany 1972* or *Netherlands 1988*.
3. Pick one player from that squad. Only players who fit an open slot in your formation are eligible.
4. Repeat until all 11 positions are filled.
5. Simulate the tournament: group stage, knockout rounds and final.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Nuxt 4](https://nuxt.com) |
| UI Components | [@nuxt/ui v4](https://ui.nuxt.com) |
| State Management | [Pinia](https://pinia.vuejs.org) |
| Internationalization | [@nuxtjs/i18n](https://i18n.nuxtjs.org) (10 languages) |
| Styling | Tailwind CSS v4 |
| Data Pipeline | Wikipedia scraper + position enrichment pipeline |
| Database (optional) | MySQL/MariaDB via [mysql2](https://github.com/sidorares/node-mysql2), backs the global leaderboard only |
| Unit Tests | [Vitest](https://vitest.dev) |
| E2E / A11y Tests | [Playwright](https://playwright.dev) + [@axe-core/playwright](https://github.com/dequelabs/axe-core-npm) |

## Getting Started

### Prerequisites

- Node.js >= 20
- npm >= 10 (or pnpm)

### Installation

```bash
git clone https://github.com/dstN/EuroDraft.git
cd EuroDraft
npm install
```

### Development

```bash
npm run dev
# → http://localhost:3000
```

### Rebuild the Player Database

The `public/eurodraft_db.json` is pre-built. To regenerate from Wikipedia:

```bash
npm run build:db
```

### Enrich Player Positions

To fill in position data from an external football data source:

```bash
POSITION_SOURCE_BASE_URL=https://... npm run enrich:positions -- --name "Zinedine Zidane"
# Or enrich all ~4600 players in the database:
POSITION_SOURCE_BASE_URL=https://... npm run enrich:positions -- --db
```

## Commands

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Build for production |
| `npm run build:db` | Rebuild player database from Wikipedia |
| `npm run enrich:positions` | Enrich position data for players |
| `npm run test` | Run Vitest unit tests |
| `npm run test:e2e` | Run Playwright e2e tests |
| `npm run test:a11y` | Run accessibility audit |
| `npm run lint` | Lint code |
| `npm run typecheck` | TypeScript type check |

## Project Structure

```
EuroDraft/
├── app/
│   ├── assets/css/        # Global styles + CSS vars
│   ├── components/        # Vue components (draft/, shared/, layout/)
│   ├── composables/       # Reusable composables (useFormations, etc.)
│   ├── layouts/           # Nuxt layouts (default.vue)
│   ├── pages/             # Nuxt pages (/, /draft, /draft/formation, /tournament, /match)
│   ├── stores/            # Pinia stores (draft.ts, roulette.ts)
│   └── types/             # TypeScript type definitions
├── i18n/locales/          # 10 locale translation files (en, de, fr, es, it, pt, nl, pl, ru, tr)
├── public/                # Static assets (eurodraft_db.json)
├── scripts/               # Data pipeline scripts (build-db.ts, player-positions.ts)
├── server/                # Nuxt server routes
└── tests/                 # Unit (Vitest) + E2E/a11y (Playwright) tests
```

## Internationalization

EuroDraft is available in 10 languages:

| Language | Code |
|---|---|
| English | `en` |
| German | `de` |
| French | `fr` |
| Spanish | `es` |
| Italian | `it` |
| Portuguese | `pt` |
| Dutch | `nl` |
| Polish | `pl` |
| Russian | `ru` |
| Turkish | `tr` |

## Data Pipeline

Rosters come from the Wikipedia squad tables of all 17 continental tournaments (1960–2024). Each player has a verified tactical role (CB, LB, RB, CDM, CM, CAM, LM, RM, LW, RW, ST, CF) and a curated rating for their prime, calibrated by position and tournament performance.

## Roadmap

See [ROADMAP.md](./ROADMAP.md) for planned features and milestones.

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for the Netcup + Phusion Passenger production runbook.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup, commit conventions, and PR workflow.
