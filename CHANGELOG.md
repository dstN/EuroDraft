# Changelog

All notable changes to EuroDraft will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- External position enrichment pipeline for verified player roles (closes #8)
- Full database re-scrape with enriched positions (closes #9)

---

## [0.3.0] - 2026-08-22

### Added
- Formation picker shows mini tactical pitch with colored player dots (#3)
- Complete translations for all 10 locales: de, fr, es, it, pt, nl, pl, ru, tr (#4)
- Vitest unit tests for formations composable (#5)
- Playwright e2e draft flow tests (#5)
- axe-core a11y tests for all pages (#5)
- Comprehensive README, CHANGELOG, CONTRIBUTING, PR/issue templates (#6)
- ROADMAP.md with milestone planning (#7)
- GitHub issues and milestones via gh CLI (#7)
- Position enrichment pipeline (cheerio + Playwright fallback) (#8)

### Fixed
- Tactical pitch height now matches squad panel height (#1)
- Squad list auto-scrolls to top when new team appears after draft pick (#2)
- LM/RM slots now pickable with correct winger/wide midfielder pool (#9)
- `frank leboeuf` and similar names with ligature characters now match correctly in registry

---

## [0.2.0] - 2026-08-21

### Added
- Authentic historical player positions via `scripts/player-positions.ts` registry (350+ legends)
- Calibrated historical star ratings: Zidane 94, Blanc 90, Thuram 90, Deschamps 89, Barthez 89
- Granular position specificity: CB, LB, RB, CDM, CM, CAM, LM, RM, LW, RW, ST, CF
- Vector circular flags via `@iconify-json/circle-flags`
- Working light/dark theme toggle
- Language switcher in header (10 locales)
- Direct click-to-place pitch interaction (no popup/modal)
- Position-sorted squad list: GK → DEF → MID → FWD with section headers

### Fixed
- Tactical pitch visible in drafting mode alongside squad list
- Rosicky correctly assigned as CAM, not Striker
- All players with shirt #7 no longer defaulting to RM incorrectly

---

## [0.1.0] - 2026-08-21

### Added
- Initial Nuxt 4 + @nuxt/ui v4 project setup
- Wikipedia squad scraper for all 17 Euros (1960–2024)
- 4658 real historical players in `public/eurodraft_db.json`
- 11 tactical formations (4-3-3, 4-4-2, 4-2-3-1, 3-5-2, etc.)
- Formation selection page with 3 random picks
- Roulette mechanic: random country + year combination
- Draft page: pick one player per roulette spin
- Tactical pitch component (`FormationPitch.vue`)
- Tournament simulation with group stage + knockout rounds
- Match report pages with OVR-based simulation
- i18n framework with 10 language stubs
- Pinia stores: `draft.ts`, `roulette.ts`
