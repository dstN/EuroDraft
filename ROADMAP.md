# EuroDraft Roadmap

This document tracks all planned features by milestone.

> For detailed issue tracking, see [GitHub Issues](https://github.com/dstN/EuroDraft/issues).

---

## Milestone 1 — Core Draft MVP ✅ Complete

- [x] Nuxt 4 + @nuxt/ui v4 project setup
- [x] Wikipedia squad scraper (all 17 Euros, 1960–2024)
- [x] 4658 historical players in `eurodraft_db.json`
- [x] Formation selection (11 tactical formations)
- [x] Roulette mechanic (random country + year)
- [x] Draft page with squad list + tactical pitch
- [x] Direct click-to-place pitch interaction (no popup)
- [x] Position-sorted squad list (GK → DEF → MID → FWD)
- [x] Tournament simulation (group stage + knockouts)
- [x] Match report pages
- [x] Vector flags via @iconify-json/circle-flags
- [x] Light/dark theme toggle
- [x] Language switcher (10 locales)

---

## Milestone 2 — Data Quality ✅ Complete

- [x] Historical player position registry (350+ legends)
- [x] Calibrated star ratings (Zidane 94, Blanc 90, etc.)
- [x] LM/RM positions playable by wide midfielders + wingers
- [x] **Position enrichment pipeline for authentic player roles** (#8)
- [x] **Full DB re-scrape with enriched positions** (#9)
- [x] Player position correction workflow (issue template + PR flow) (#10)

---

## Milestone 3 — UX Polish ✅ Complete

- [x] Formation picker shows mini-pitch with player dots (#3)
- [x] Squad list auto-scrolls to top after pick (#2)
- [x] Pitch height matches squad panel height (#1)
- [x] Complete i18n translations for all 10 locales (#4)
- [x] Player stat cards with PAC/SHO/PAS/DRI/DEF/PHY breakdown (#11)
- [x] Animation: player disc flies from list to pitch slot on draft (#12)
- [x] Sound effects (optional, with toggle) (#13)
- [x] Mobile: swipe between squad list and pitch panels (#14)

---

## Milestone 4 — Quality & Documentation ✅ Complete

- [x] Vitest unit tests for formations + stores (#5)
- [x] Playwright e2e draft flow tests (#5)
- [x] axe-core a11y audit (#5)
- [x] README, CHANGELOG, CONTRIBUTING (#6)
- [x] GitHub issue templates + PR template (#6)
- [x] Roadmap (#7)
- [x] GitHub issues created for all planned work (#7)

---

## Milestone 5 — Community & Sharing ✅ Complete

- [x] Share your drafted XI as a canvas image card
- [x] Wordle-style text summary share with top scorers and line ratings
- [x] Dedicated result sharing API and public view route (`/r/[id]`) on `ed.rntm.de`
- [x] Opt-in explicit database storage consent
- [x] Global Leaderboard: submit your squad OVR score (#15)
- [x] "Challenge" mode: given a random formation, must pick exactly 1 player per roulette spin (#16)
- [x] Compare two squads head-to-head (#17)
- [x] Twitter/X card meta tags for shareable results (#18)

---

## Milestone 6 — Extended Content 🚧 In Progress

- [ ] Global tournament edition (International squads, 1958–2022) (#19) — needs a new data pipeline, deferred
- [ ] European Club edition (Top continental club squads) (#20) — needs a new data pipeline, deferred
- [x] "Legend Mode": only players with 90+ rating available (#21)
- [x] Custom formation builder (#22)
- [x] Save/load drafts (localStorage) (#23)
