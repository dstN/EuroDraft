# Deployment — Netcup / Plesk (Phusion Passenger)

How to get EuroDraft running on the same Netcup + Plesk (Phusion Passenger)
setup as this account's other apps (GourMerge, bewerby, footyguess). This is
written from that shared operational history, not from generic Passenger
docs — see "Where this came from" at the bottom before treating any of it as
gospel for this specific app.

EuroDraft is simpler than GourMerge: no auth, no sessions, no scheduled
jobs. The only optional server-side state is the `/leaderboard` feature's
MySQL table — everything else (draft, tournament sim, share links, OG
images) runs from the bundled Nitro server with no database at all.

## Architecture: two roots, not one

| Concept              | Points at                  | Contains                                        |
| --------------------- | --------------------------- | ------------------------------------------------ |
| **Application Root** | the project root you upload | startup file, `.output/`, `package.json`         |
| **Document Root**    | `.output/public`            | only the static assets Nitro emitted             |

Apache serves anything that physically exists under Document Root directly,
**bypassing Node entirely**. If Document Root were set to Application Root
instead, requests like `GET /package.json` or `GET /server/utils/db.ts`
would be served as plain static files. Plesk's Node.js panel exposes
Application Root and Document Root as two separate fields for exactly this
reason — as of this writing Plesk does not warn if both are left identical,
so double-check this by hand.

## Startup file: try the simple option first

Passenger's Node.js loader has historically used `require()` internally,
which cannot load a file Node treats as an ES module — and this repo's
`package.json` sets `"type": "module"`, same as every other app on this
account. In practice, across this account's own apps, the picture is mixed:

- **footyguess** points its Startup File directly at
  `.output/server/index.mjs` — no wrapper — and that is documented as its
  current production configuration.
- **GourMerge** also uses a plain `app.js` (importing the Nitro output
  dynamically) as its documented production path.
- **bewerby** hit `ERR_REQUIRE_ESM` with a plain `.js` startup file and had
  to switch to a `.cjs` wrapper — verified live against a real failure, not
  a guess.

That's contradictory enough within this account's own history that it's
probably a Passenger-version or vhost difference, not a settled fact. So:

**Try this first** — set Application Startup File to `.output/server/index.mjs`
directly (footyguess's approach, and the simplest — nothing to upload
beyond the build output itself).

**If Passenger's error log shows `ERR_REQUIRE_ESM`**, add this wrapper
instead:

```js
// entry.cjs — place at the project root (Application Root)
require('./.output/server/index.mjs')
```

Wait — `require()` can't load ESM either, which is the whole problem.
Use `import()` instead, which is valid inside a `.cjs` file:

```js
// entry.cjs
import('./.output/server/index.mjs')
```

The `.cjs` extension forces Node to treat this specific file as CommonJS
regardless of the package's `"type": "module"`, so Passenger's `require()`
can load *this* file — which then reaches the real ESM server via a dynamic
`import()`, valid from CommonJS. Point Application Startup File at
`entry.cjs` instead, and upload it alongside `.output/`.

Do not add `PassengerAppType` / `PassengerStartupFile` directives to
`.htaccess` as a fallback. On this same Netcup/Plesk setup that has caused
Apache to reject `.htaccess` outright (`PassengerAppType not allowed here`),
which 500s **every** request under the vhost, static files included. The
panel's Node.js fields are the only place to configure this here.

## What to upload

`nuxt.config.ts` sets `nitro.externals.inline: ['mysql2']` so the driver's
actual code is bundled into the build output rather than left as a bare
`node_modules` import — verified by building and grepping `.output/server/`
for `from 'mysql2'` before and after adding that option (present, then
gone; `mysql2` also drops out of `.output/server/package.json`'s dependency
list once inlined). Without that line the build still succeeds, but the
server throws `ERR_MODULE_NOT_FOUND` on `/api/leaderboard`/`/api/health`
unless `node_modules/mysql2` is also uploaded — do not remove it. Upload
just:

- The startup file (`.output/server/index.mjs` directly, or `entry.cjs` —
  whichever the section above ends up using)
- `.output/` (all of it — `public/`, `server/`)
- `package.json` (Passenger reads this for app metadata)

Do **not** upload `node_modules/`, `app/`, `server/db/`, `.git/`, or any dev
config (`vitest.config.ts`, `eslint.config.mjs`, `tsconfig.json`, …).

## Build & deploy

```sh
# 1. Build locally or in CI — never on the shared host (chroot has no
#    npm/node_modules install story; see GourMerge's RUNBOOK.md for why).
npm ci
npm run typecheck && npm run lint && npm run test
npm run build

# 2. Upload the startup file + .output/ + package.json to Application Root.

# 3. Restart Passenger:
mkdir -p tmp && touch tmp/restart.txt
#    (or the panel's "Restart App" button, if the panel is being used
#    instead of SSH for this step)

# 4. Smoke-test:
curl -s https://<domain>/api/health
#    Expect {"status":"ok","database":"not_configured","playerDatabase":"ok"}
#    before the leaderboard DB is provisioned, or "connected" after.
#    "playerDatabase":"unreachable" (status 503) means the upload is
#    incomplete -- draft and tournament (the whole product) are broken even
#    though the server itself started. Re-check that .output/public/ made it
#    into the upload.
```

## Environment variables

Set under **Websites & Domains → \<domain\> → Node.js → Custom environment
variables** in the Plesk panel — not `.htaccess`, not a repo file. Restart
Passenger after any change.

| Variable       | Required | Description                                                        |
| --------------- | -------- | -------------------------------------------------------------------- |
| `DATABASE_URL` | no       | `mysql://user:pass@host:3306/dbname`. Unset = leaderboard shows "coming soon" and share links (`/r/<id>`) are ephemeral (in-memory, per worker); everything else works normally. |
| `NODE_ENV`     | no       | Set by Passenger from the panel's Application Mode — don't set it manually. Also gates the contact form's failure mode below. |
| `SMTP_HOST` / `MAIL_HOST` | see below | SMTP server hostname. |
| `SMTP_PORT` / `MAIL_PORT` | no       | Default `587`. |
| `SMTP_USER` / `MAIL_USER` | no       | Default `system@rntm.de`. |
| `SMTP_PASS` / `MAIL_PASS` / `SMTP_PASSWORD` | see below | SMTP password. |
| `SMTP_SECURE` | no       | `true` forces implicit TLS; otherwise inferred from `SMTP_PORT === 465`. |
| `SMTP_FROM`    | no       | Default `"EuroDraft System" <system@rntm.de>`. |
| `CONTACT_RECIPIENT` | no  | Where contact-form submissions are sent. Default `info@rntm.de`. |

`SMTP_HOST`/`MAIL_HOST` and `SMTP_PASS`/`MAIL_PASS`/`SMTP_PASSWORD` are
required *together* for the contact form (`server/api/contact.post.ts`) to
actually send mail. Without them: in dev, submissions are logged to the
console instead (`mock: true` in the response); **in production, the
endpoint returns `503`** rather than falsely reporting success — check
`GET /api/health`'s `contactForm` field (`"configured"` /
`"not_configured"`), which only counts against overall health when
`NODE_ENV=production`.

Nitro's `node-server` preset reads `PORT`/`HOST` itself; Passenger sets
those before spawning the process, so no extra config should be needed
there (this is standard Passenger Node.js behavior — "control is inversed",
per Passenger's own docs — not specific to this app).

## Provisioning the database (optional, do this when ready)

The rest of the app does not need this — it's fine to deploy without it and
add it later. Provisioning it does two things at once: it turns on the
`/leaderboard` feature, and it makes share links (`/r/<id>`) durable --
without `DATABASE_URL`, share links live only in the memory of the worker
process that created them (see `server/utils/shareStorage.ts`), so they
vanish on restart and don't resolve on a sibling Passenger worker.

1. **Plesk → Databases → Add Database.** Create a MySQL/MariaDB database
   (e.g. `eurodraft`) and a user scoped to it.
2. **Run both migrations once**, from any machine that can reach the DB:
   ```sh
   mysql -u <user> -p <dbname> < server/db/migrations/001_create_leaderboard.sql
   mysql -u <user> -p <dbname> < server/db/migrations/002_create_shared_runs.sql
   ```
   Each is a single `CREATE TABLE IF NOT EXISTS`, safe to re-run.
3. **Set `DATABASE_URL`** under Node.js → Custom environment variables, in
   the `mysql://user:pass@host:3306/dbname` form, then restart Passenger.
4. **Verify**: `curl -s https://<domain>/api/health` should report
   `"database":"connected"`, `/leaderboard` should stop showing "Coming
   Soon", and a share link created after this point should still resolve
   after a Passenger restart.

If MariaDB and the app's MySQL client version ever mismatch (this has come
up before on this account — MariaDB's `mysqldump` against a MySQL 8.4
server), that's a `mysqldump`/backup-tooling concern, not a runtime one:
this app's own queries are plain `INSERT`/`SELECT`/`DELETE` with no
version-specific syntax.

## Backups (once the leaderboard DB exists)

The dataset is small and low-stakes (team name + score, no accounts, no
passwords), so a lightweight approach is enough — nothing like GourMerge's
full backup/restore drill is warranted here:

```sh
mysqldump --no-create-info -u <user> -p <dbname> leaderboard | gzip > leaderboard-$(date +%F).sql.gz
```

Schedule via Plesk → Scheduled Tasks → **Run a command** if `mysqldump` is
available on the host (confirm with `command -v mysqldump`), same pattern
GourMerge already uses.

## GDPR

`/api/gdpr/export` and `/api/gdpr/delete` already cover leaderboard entries
tied to a share ID, alongside the existing share-link records — no separate
leaderboard-specific self-service flow was added, since it hooks into the
same shareId-keyed request that already exists.

## Health check

`GET /api/health` returns `200 {"status":"ok", "database": "not_configured" | "connected" | "disconnected", "playerDatabase": "ok" | "unreachable"}`.

`database` is `503` only when `DATABASE_URL` is set but unreachable (an
unconfigured DB is healthy, not a problem — the app doesn't need it).
`playerDatabase` is unconditional and always `503`s if `"unreachable"` — the
player database is not optional, draft and tournament are the whole product.
`"unreachable"` means the upload was incomplete (`.output/public/` missing or
partial), not a config problem — re-check the upload, not an env var. Point
an uptime monitor (e.g. UptimeRobot, same as this account's other apps) at
this endpoint once the app is live.

## Where this came from

Written by reading `DEPLOYMENT.md` / `README.md` / `docs/RUNBOOK.md` from
`bewerby`, `GourMerge`, and `footyguess` in the same parent folder — real,
partly production-verified history for this exact Netcup/Plesk setup —
rather than generic Phusion Passenger documentation. The startup-file
section above is honest about where that history actually disagrees
(footyguess and GourMerge use unwrapped ESM/`.js`; bewerby needed the
`.cjs` wrapper after a live failure). None of this has been tested against
a real EuroDraft deployment yet — treat the first real deploy as the actual
verification, and update this file with whatever it finds, the same way
bewerby's own runbook was corrected after its first live run.
