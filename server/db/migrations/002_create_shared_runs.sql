-- EuroDraft shared tournament run links (the /r/<id> feature).
-- Run this once against the production database before the app is deployed
-- with DATABASE_URL set. Safe to re-run (IF NOT EXISTS).
--
-- Manual run:
--   mysql -u <user> -p <dbname> < server/db/migrations/002_create_shared_runs.sql
--
-- Without DATABASE_URL configured, share links still work but only for the
-- lifetime of the worker process that created them (see
-- server/utils/shareStorage.ts's in-memory fallback) -- they do not survive
-- a restart and do not resolve on a sibling Passenger worker. This table
-- removes both limitations.

CREATE TABLE IF NOT EXISTS shared_runs (
  id VARCHAR(20) PRIMARY KEY,
  team_name VARCHAR(24) NOT NULL,
  team_emblem VARCHAR(16) NOT NULL DEFAULT 'eu',
  formation VARCHAR(24) NOT NULL,
  team_ovr TINYINT UNSIGNED NOT NULL,
  outcome VARCHAR(20) NOT NULL,
  def_rating TINYINT UNSIGNED NOT NULL,
  mid_rating TINYINT UNSIGNED NOT NULL,
  att_rating TINYINT UNSIGNED NOT NULL,
  overall_rating TINYINT UNSIGNED NOT NULL,
  -- Opaque snapshots (full squad, match-by-match results, run stats) --
  -- read back as a unit for the /r/<id> page and the OG image, never
  -- queried by field, so JSON columns fit better here than a relational
  -- breakout would.
  run_stats JSON NULL,
  squad JSON NOT NULL,
  matches JSON NOT NULL,
  -- SHA-256 hex of the deletion token issued once at creation (see
  -- server/utils/shareStorage.ts's verifyDeleteToken) -- proves ownership
  -- for DELETE /api/share/:id and the GDPR export/delete endpoints. The
  -- raw token itself is never stored.
  delete_token_hash CHAR(64) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
