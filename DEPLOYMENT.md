# Deployment — Netcup / Plesk (Phusion Passenger)

How to get EuroDraft running on the same Netcup + Plesk (Phusion Passenger)
setup as this account's other apps (GourMerge, bewerby, footyguess). This is
written from that shared operational history, not from generic Passenger
docs — see "Where this came from" at the bottom before treating any of it as
gospel for this specific app.

EuroDraft is simpler than GourMerge: no auth, no sessions, no scheduled
jobs. MySQL is entirely optional — the `/leaderboard` feature and durable
(restart-surviving) share links (`/r/<id>`) use it when `DATABASE_URL` is
set; everything else (draft, tournament sim, OG images) runs from the
bundled Nitro server with no database at all.

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

## Startup file: use app.js, not .output/server/index.mjs directly

Passenger's Node.js loader has historically used `require()` internally,
which cannot load a file Node treats as an ES module — and this repo's
`package.json` sets `"type": "module"`, same as every other app on this
account. In practice, across this account's own apps, the picture was
mixed going in:

- **footyguess** points its Startup File directly at
  `.output/server/index.mjs` — no wrapper — and that is documented as its
  current production configuration.
- **GourMerge** uses a plain `app.js` (importing the Nitro output
  dynamically) as its documented production path.
- **bewerby** hit `ERR_REQUIRE_ESM` with a plain `.js` startup file and had
  to switch to a `.cjs` wrapper.

**Verified live on ed.rntm.de's first real deploy**: pointing Application
Startup File directly at `.output/server/index.mjs` (footyguess's approach)
failed — every route, including plain static assets once Document Root was
correctly split, came back as Passenger's generic "Web application could
not be started" (no `ERR_REQUIRE_ESM` specifically surfaced in the panel's
access log, only in whatever Passenger's own deeper log holds — never
retrieved directly, since app.js resolved it first). Switching to
GourMerge's exact `app.js` wrapper — same account, same Netcup/Plesk
hosting, same Node 26.7.0, same `"type": "module"` — fixed it:

```js
// app.js — place at the project root (Application Root)
import('./.output/server/index.mjs')
```

Point Application Startup File at `app.js`, and upload it alongside
`.output/` and `package.json` (deploy.yml does this automatically). If a
future Node/Passenger upgrade ever makes even this fail with
`ERR_REQUIRE_ESM` in Passenger's log, bewerby's `.cjs`-wrapper fallback is
the next thing to try:

```js
// entry.cjs — place at the project root (Application Root) instead of app.js
import('./.output/server/index.mjs')
```

The `.cjs` extension forces Node to treat this specific file as CommonJS
regardless of the package's `"type": "module"`, which matters if Passenger's
`require()`-based loader stops accepting a plain `.js` file for some reason
— `import()` inside it still reaches the real ESM server the same way.

Do not add `PassengerAppType` / `PassengerStartupFile` directives to
`.htaccess` as a fallback. On this same Netcup/Plesk setup that has caused
Apache to reject `.htaccess` outright (`PassengerAppType not allowed here`),
which 500s **every** request under the vhost, static files included. The
panel's Node.js fields are the only place to configure this here.

## What to upload

An earlier version of `nuxt.config.ts` set `nitro.externals.inline: ['mysql2']`,
reasoning that the driver's own code should be bundled into the build output
rather than left as a bare `node_modules` import. That setting is gone now —
verified live, against a real reachable database, not just a build check:
inlining mysql2 through Nitro's Rollup bundler breaks its own internal
code-generation (a CJS/ESM interop mismatch in a dependency mysql2 uses to
build fast query parsers) with `TypeError: genFunc$1 is not a function` on
every actual query. Connection-only checks like `/api/health`'s old `SELECT 1`
before this was caught didn't exercise that path, which is exactly why it
went unnoticed. Without the override, Nitro's *default* behavior already
does what the override was trying to achieve: it traces mysql2 (pure JS, no
native bindings) and copies the real, unmangled package into
`.output/server/node_modules/mysql2` automatically — confirmed present after
a build, and confirmed working end-to-end against a live database (share
create → read → process restart → read again, still resolves). Upload just:

- `app.js` (the startup shim — see the section above)
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
2. **Run all three migrations once**, from any machine that can reach the DB:
   ```sh
   mysql -u <user> -p <dbname> < server/db/migrations/001_create_leaderboard.sql
   mysql -u <user> -p <dbname> < server/db/migrations/002_create_shared_runs.sql
   mysql -u <user> -p <dbname> < server/db/migrations/003_add_og_image_to_shared_runs.sql
   ```
   001 and 002 are `CREATE TABLE IF NOT EXISTS`, safe to re-run. 003 is a
   plain `ALTER TABLE ADD COLUMN` (no portable `IF NOT EXISTS` for a column
   across MySQL/MariaDB versions) -- running it twice errors clearly
   ("Duplicate column name") rather than doing anything unexpected, but
   don't run it twice on purpose. Without it, share links still work; they
   just fall back to the old SVG-based OG image (which most social-embed
   crawlers, including Discord's, don't render) instead of the real
   result-card PNG -- see `server/utils/shareStorage.ts`.
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
