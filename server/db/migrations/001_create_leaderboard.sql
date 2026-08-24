-- EuroDraft leaderboard table.
-- Run this once against the production database before the app is deployed
-- with DATABASE_URL set. Safe to re-run (IF NOT EXISTS).
--
-- Manual run:
--   mysql -u <user> -p <dbname> < server/db/migrations/001_create_leaderboard.sql

CREATE TABLE IF NOT EXISTS leaderboard (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  team_name VARCHAR(24) NOT NULL,
  team_emblem VARCHAR(16) NOT NULL DEFAULT 'eu',
  formation VARCHAR(24) NOT NULL,
  ovr TINYINT UNSIGNED NOT NULL,
  def_rating TINYINT UNSIGNED NOT NULL,
  mid_rating TINYINT UNSIGNED NOT NULL,
  att_rating TINYINT UNSIGNED NOT NULL,
  outcome VARCHAR(20) NOT NULL,
  -- Link back to /r/<share_id>. Since a leaderboard submission requires
  -- DATABASE_URL to be configured in the first place (see
  -- server/api/leaderboard.post.ts), shared_runs (002_create_shared_runs.sql)
  -- is persisted in the same database alongside this table -- no soft/lossy
  -- reference here, just a plain unenforced link (kept unenforced, not a
  -- FOREIGN KEY, so deleting a share doesn't cascade-delete leaderboard
  -- history -- see server/utils/shareStorage.ts).
  share_id VARCHAR(20) NULL,
  submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ovr (ovr DESC, submitted_at ASC),
  INDEX idx_share_id (share_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
