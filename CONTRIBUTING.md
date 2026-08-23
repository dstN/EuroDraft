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
git commit -m "data: rebuild DB with enriched positions (closes #9)"
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

## Player Position Correction Workflow

EuroDraft maintains an authentic registry of historical positions for players across all 17 European tournaments (1960–2024). Contributors can propose corrections either via GitHub Issues or via a direct Pull Request.

### Option A: Submitting via GitHub Issue Form
1. Open [GitHub Issues](https://github.com/dstN/EuroDraft/issues/new/choose) and select **⚽ Player Position / Rating Correction**.
2. Provide the player's name, tournament edition, current vs. proposed primary/secondary positions, and a reputable source link (e.g. Transfermarkt, match lineup, or historical archive).

### Option B: Submitting a Pull Request
1. Branch from `development`:
   ```bash
   git checkout development
   git pull
   git checkout -b data/correct-position-[player-name]
   ```
2. Edit `scripts/player-positions.ts`:
   ```ts
   'yuri zhirkov': {
     primary: 'LM',
     positions: ['LM', 'LB', 'CM'],
     base: 'Midfielder'
   },
   ```
3. Rebuild the database:
   ```bash
   npm run build:db
   ```
4. Run tests to ensure validation passes:
   ```bash
   npm run test
   ```
5. Commit and open a Pull Request:
   ```bash
   git commit -m "feat(data): correct position for Yuri Zhirkov (closes #10)"
   ```

---

## Pull Request Checklist

- [ ] Branch created from `development`
- [ ] Commit message follows Conventional Commits with `closes #N`
- [ ] Database rebuilt (`npm run build:db`) if `scripts/player-positions.ts` changed
- [ ] Unit tests pass (`npm run test`)
- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes
- [ ] Description in PR references the GitHub issue

---

## Issue Reporting

Use the templates in `.github/ISSUE_TEMPLATE/`:
- **Bug Report**: Report unexpected UI errors, simulation bugs, or styling issues.
- **Feature Request**: Suggest new mechanics, game modes, or UX enhancements.
- **Player Position / Rating Correction**: Report incorrect tactical slots, missing secondary positions, or rating anomalies.
