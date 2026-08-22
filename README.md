# EuroDraft

> **Draft your all-time UEFA Euro XI.** Pick legends from every UEFA European Championship squad since 1960, build your dream team in a tactical formation, and simulate a full tournament.

[![Nuxt UI](https://img.shields.io/badge/Made%20with-Nuxt%20UI-00DC82?logo=nuxt&labelColor=020420)](https://ui.nuxt.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

---

## What is EuroDraft?

EuroDraft is a web-based fantasy football game built around **historical UEFA European Championship squads**. Instead of picking modern players, you draft legends from every Euro tournament from 1960 to 2024.

### Core Loop

1. **Choose a Formation** — 3 random formations are drawn. Pick one (4-4-2, 4-3-3, 4-2-3-1, etc.)
2. **Spin the Roulette** — A random country + year combination appears (e.g. *France 2000*, *Germany 1972*, *Netherlands 1988*)
3. **Pick ONE Player** — Only players who fit your open formation slots are eligible
4. **Repeat** until all 11 positions are filled
5. **Simulate the Tournament** — Your all-time XI competes in a full simulated Euro with real group stages, knockout rounds, and finals

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Nuxt 4](https://nuxt.com) |
| UI Components | [@nuxt/ui v4](https://ui.nuxt.com) |
| State Management | [Pinia](https://pinia.vuejs.org) |
| Internationalization | [@nuxtjs/i18n](https://i18n.nuxtjs.org) (10 languages) |
| Styling | Tailwind CSS v4 |
| Data Pipeline | Wikipedia scraper + Transfermarkt enrichment |
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

### Scrape Transfermarkt Positions

To enrich player position data from Transfermarkt:

```bash
npm run scrape:positions -- --name "Zinedine Zidane"
```

---

## Commands

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Build for production |
| `npm run build:db` | Rebuild player database from Wikipedia |
| `npm run scrape:positions` | Scrape Transfermarkt for position data |
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

## Data Sources

- **Player Rosters**: Wikipedia squad tables for all 17 UEFA Euro tournaments (1960–2024)
- **Player Positions**: Transfermarkt `div.detail-position__box` for verified specific roles (CB, LB, CDM, CAM, LW, etc.)
- **Player Ratings**: Curated historical prime ratings for 350+ legends, calibrated by position and peak years

---

## Roadmap

See [ROADMAP.md](./ROADMAP.md) for planned features and milestones.

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup, commit conventions, and PR workflow.

---

## License

MIT © 2025 EuroDraft Contributors
