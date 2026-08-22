# Contributing to EuroDraft

Thank you for contributing! This guide covers setup, conventions, and workflow.

---

## Development Setup

### Prerequisites

- **Node.js** >= 20
- **npm** >= 10 (or pnpm)
- **Git**
- **gh CLI** (for creating issues: `gh auth login`)

### Setup

```bash
git clone https://github.com/dstN/EuroDraft.git
cd EuroDraft
npm install
npm run dev
```

The dev server runs on `http://localhost:3000`.

---

## Branching Strategy

We use a simple feature branch workflow:

```
main          ← stable releases
development   ← integration branch (PRs merge here)
feature/xxx   ← feature branches (one issue = one branch)
fix/xxx       ← bugfix branches
```

**Always branch from `development`:**

```bash
git checkout development
git pull
git checkout -b fix/my-fix
```

---

## Commit Conventions

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description> (closes #<issue-number>)
```

**Types:**

| Type | When to use |
|---|---|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `test` | Adding or fixing tests |
| `data` | Data pipeline changes (scraper, DB rebuild) |
| `refactor` | Code change with no behavior change |
| `chore` | Tooling, deps, config |

**Examples:**

```bash
git commit -m "feat: formation picker shows mini-pitch with player dots (closes #3)"
git commit -m "fix: squad list scrolls to top after draft pick (closes #2)"
git commit -m "data: rebuild DB with Transfermarkt-enriched positions (closes #9)"
```

---

## Running Tests

```bash
npm run test          # Vitest unit tests
npm run test:e2e      # Playwright e2e tests (requires dev server)
npm run test:a11y     # axe-core a11y audit
```

### Writing Unit Tests

Unit tests live in `tests/unit/`. Use [Vitest](https://vitest.dev):

```ts
import { describe, it, expect } from 'vitest'
import { expandFormationToSlots } from '../../app/composables/useFormations'

describe('expandFormationToSlots', () => {
  it('4-4-2 has LM and RM', () => {
    const f = { id: '4-4-2', label: '4-4-2', slots: { GK: 1, CB: 2, LB: 1, RB: 1, LM: 1, CM: 2, RM: 1, ST: 2 } }
    const slots = expandFormationToSlots(f)
    expect(slots).toContain('LM')
    expect(slots).toContain('RM')
  })
})
```

---

## Rebuilding the Player Database

```bash
npm run build:db
```

This scrapes Wikipedia squad tables for all 17 Euros (1960–2024). Results are cached in `scripts/cache/`.

---

## Adding Player Positions to the Registry

Edit `scripts/player-positions.ts`:

```ts
'playerName': {
  primary: 'CB',
  positions: ['CB', 'RB'],
  base: 'Defender',
  baseRating: 91
}
```

Then run `npm run build:db` to rebuild the database.

---

## Pull Request Checklist

- [ ] Branch created from `development`
- [ ] Commit message follows Conventional Commits with `closes #N`
- [ ] Unit tests added/updated if applicable
- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes
- [ ] Description in PR references the GitHub issue

---

## Issue Reporting

Use the issue templates in `.github/ISSUE_TEMPLATE/`.

For player position corrections, include:
- Player name
- Country + Year
- Current incorrect position
- Correct position (with source: Transfermarkt URL preferred)
