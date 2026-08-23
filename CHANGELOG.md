# Changelog

All notable changes to EuroDraft will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.4.0] - 2026-08-23

### Added
- Wordle-style text summary and high-resolution Canvas squad card share modal (`TournamentShareModal.vue`)
- Real vector circular flag drawing on Canvas for user team, all 11 starters, top performers, and match opponents
- Dedicated result sharing API (`/api/share`) and public view page (`/r/[id]`) on `ed.rntm.de`
- Explicit database storage consent toggle for public link generation
- Complete European country lookup utility (`app/utils/country.ts`) standardizing British nations (England, Scotland, Wales, Northern Ireland) and all 55+ European associations
- Full SVG logo integration and multi-color brand typography on share cards
- Position-aware lineup rendering matching exact drafted slot positions on the pitch

### Fixed
- Fixed mobile wrapping on formation names and player tournament performance headers
- Removed redundant finish badges on tournament outcome cards
- Group stage fixtures restored and fully rendered on match timeline
- Balanced vertical geometry on share canvas to comfortably accommodate 6-match runs to the Final
- Rate-limiting optimization on position enrichment pipeline with `--retry-failed` support

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
