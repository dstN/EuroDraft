# Changelog

All notable changes to EuroDraft will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.6.0] - 2026-08-23

### Changed
- Lighthouse Performance score raised from 53 to 85 (Accessibility/Best Practices/SEO already at 100): scoped the ~2.8MB player database load out of `app.vue` into a route middleware (`ensure-database`) applied only to `/draft/**` and `/tournament/**`, cutting homepage FCP/LCP from ~17s to ~3s under throttled network simulation
- Static assets (CSS/JS) are now actually served gzip/brotli-compressed. `node-server` was transferring a ~270KB CSS chunk uncompressed despite the client requesting it, costing ~6s under Lighthouse's throttled simulation -- worked around a Nitro bug where the node-server preset's static-asset manifest is frozen before its own build-time compression runs, by building twice (`scripts/build.mjs`) so the second build's manifest sees the first build's compressed output
- Added runtime response compression (`server/middleware/compression.ts`) for SSR pages and API/JSON responses, which aren't covered by the static-asset manifest at all
- Pre-warm the player database cache at server startup (`server/plugins/warm-player-db.ts`) instead of paying the ~250ms read+parse cost inline on whichever request happens to be first after a (re)start

### Added
- Branded error page (`app/error.vue`) for 404/400/429/500/503, matching the app's design system with football-themed copy per status code, replacing Nuxt's generic default

### Fixed
- Every error page (any 404, any thrown error) was served as a completely blank page to any real visitor whose browser requests compression -- effectively everyone. The response compression middleware claimed `Content-Encoding: br` while shipping zero actual bytes, because Nitro's internal error-render request (a re-fetch of `/__nuxt_error?...`) passed through compression under a *different* status code than the outer response ultimately used

---

## [0.5.0] - 2026-08-23

### Added
- Flying player-disc animation from squad list to pitch slot on draft, with an arrival pulse ripple (#12)
- Synth-generated sound effects (tick, spin, draft chime, reroll swoosh) via a Web Audio API store with a persisted mute toggle (#13)
- Mobile swipe gestures between the squad list and pitch panels (#14)
- Extra time and penalty shootouts in knockout matches, with narrated timeline events and "(AET)" / penalty-score labeling throughout the tournament UI
- Dynamic per-share Open Graph card (`/og/:id`) and SSR-rendered meta tags on `/r/:id`, so shared links show the real team/outcome/stats instead of generic site defaults (#18)
- Head-to-head squad comparison (`/compare`): load two shared squads, compare DEF/MID/ATT/OVERALL, and simulate a showdown through the real match engine (#17)
- "Challenge Mode": randomly assigned formation, no rerolls, combinable with Legend Mode (#16)
- Global leaderboard backed by a real MySQL/MariaDB table (`mysql2`, no native bindings) rather than the ephemeral in-memory share store, with opt-in submission, `/api/health`, and a `DEPLOYMENT.md` runbook for the Netcup/Passenger host (#15)
- "Legend Mode": drafting restricted to 90+ rated players, with a graceful "no eligible squads left" state for scarce-position dead ends (#21)
- Custom formation and tactic builder: pick exact position counts with a live pitch preview (#22)
- Local draft history (`/history`): every completed run auto-saves to localStorage (capped at 20), with an expand-to-view-squad accordion, delete-one, and clear-all (#23)
- `app/utils/pitchLayout.ts`: shared, count-generic pitch-coordinate logic for `FormationPitch.vue`/`MiniFormationPitch.vue`, replacing ~140 lines of duplicated, hard-coded-per-count logic — required for the custom formation builder to render arbitrary position combinations without overlap

### Changed
- The player database (~2.8MB) no longer loads eagerly on every page via `app.vue` — scoped to a route middleware (`ensure-database`) on only `/draft/**` and `/tournament/**`, the two routes that actually touch it. Cut homepage FCP/LCP roughly in half under Lighthouse's throttled network simulation (~17s → ~8s)

### Fixed
- `currentCountryDisplayName` fell back to a raw country code (e.g. "ua") instead of the full name; now uses the existing `getCountryName()` util
- Starting a new draft without a hard reload kept the previous session's reroll count, drafted-player blocklist, and roulette used-team-keys
- 4-3-2-1 (Christmas Tree) formation's central-midfield trio collapsed two dots onto the same coordinate
- Roulette flag stayed on its Netherlands fallback for the very first squad shown on a fresh `/draft` visit (the silent initial spin never triggered the reel's sync watcher); nation name also revealed instantly on reroll instead of waiting for the spin animation to settle
- Pitch discs visually overlapping despite numerically distinct coordinates (e.g. 4-1-2-1-2's CB landing almost on top of LB/RB) — the coordinate-spread formula stretched too wide for low counts relative to fixed-position neighbors
- Top nav silently overflowed off-screen on mobile once enough links (Compare, Leaderboard) were added; now horizontally scrollable
- Page visibly shifted left when opening a dropdown/modal, since the scroll-lock library hides the scrollbar without `scrollbar-gutter` reserving its space (missed `body`, the element actually locked, on the first attempt)
- GDPR self-service portal read/exported/wiped *all* of localStorage, not just EuroDraft's own keys — the "wipe my data" button in particular called `localStorage.clear()` unconditionally, which could delete an unrelated site's data sharing the same origin
- Language-switcher flag requested `circle-flags:gb` (unbundled, logged a load failure) instead of `circle-flags:gb-eng`, which the rest of the app already uses consistently for English

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
