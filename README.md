# EuroDraft

> **Draft your all-time European Dream XI.** Pick legends from historical continental tournament squads since 1960, build your dream team in a tactical formation, and simulate a full tournament.

[![Nuxt UI](https://img.shields.io/badge/Made%20with-Nuxt%20UI-00DC82?logo=nuxt&labelColor=020420)](https://ui.nuxt.com)

---

## What is EuroDraft?

EuroDraft is a web-based fantasy football game built around **historical continental tournament squads**. Instead of picking modern players, you draft legends from tournaments spanning 1960 to 2024.

### Core Loop

1. **Choose a Formation** — 3 random formations are drawn. Pick one (4-4-2, 4-3-3, 4-2-3-1, etc.)
2. **Spin the Roulette** — A random country + year combination appears (e.g. *France 2000*, *Germany 1972*, *Netherlands 1988*)
3. **Pick ONE Player** — Only players who fit your open formation slots are eligible
4. **Repeat** until all 11 positions are filled
5. **Simulate the Tournament** — Your all-time XI competes in a full simulated tournament with group stages, knockout rounds, and finals

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Nuxt 4](https://nuxt.com) |
| UI Components | [@nuxt/ui v4](https://ui.nuxt.com) |
| State Management | [Pinia](https://pinia.vuejs.org) |
| Internationalization | [@nuxtjs/i18n](https://i18n.nuxtjs.org) (10 languages) |
| Styling | Tailwind CSS v4 |
| Data Pipeline | Wikipedia scraper + position enrichment pipeline |
| Unit Tests | [Vitest](https://vitest.dev) |
| E2E / A11y Tests | [Playwright](https://playwright.dev) + [@axe-core/playwright](https://github.com/dequelabs/axe-core-npm) |

---

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

To enrich player position data from an external football data source:

```bash
POSITION_SOURCE_BASE_URL=https://... npm run enrich:positions -- --name "Zinedine Zidane"
# Or enrich all ~4600 players in the database:
POSITION_SOURCE_BASE_URL=https://... npm run enrich:positions -- --db
```

---

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

---

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

---

## Internationalization

EuroDraft is available in **10 languages**:

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

---

## Data Pipeline

- **Player Rosters**: Wikipedia squad tables for all 17 continental tournaments (1960–2024)
- **Player Positions**: Verified specific tactical roles (CB, LB, RB, CDM, CM, CAM, LM, RM, LW, RW, ST, CF)
- **Player Ratings**: Curated historical prime ratings calibrated by position and tournament performance

---

## Roadmap

See [ROADMAP.md](./ROADMAP.md) for planned features and milestones.

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup, commit conventions, and PR workflow.
