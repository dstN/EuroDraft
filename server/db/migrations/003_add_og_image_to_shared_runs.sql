-- Adds storage for a real rendered PNG of the share result (the same canvas
-- image used by the "Squad Card (PNG)" download tab), served as the /r/<id>
-- page's OpenGraph image. Replaces the hand-drawn SVG previously served
-- there, which Discord and most social-embed crawlers don't render at all.
--
-- Run this once against the production database:
--   mysql -u <user> -p <dbname> < server/db/migrations/003_add_og_image_to_shared_runs.sql
--
-- Not written with "ADD COLUMN IF NOT EXISTS" -- that syntax needs MySQL
-- 8.0.29+/MariaDB 10.something, and isn't guaranteed to be available.
-- Running it a second time errors clearly ("Duplicate column name") rather
-- than silently doing anything unexpected, which is enough of a safety net
-- for a one-time manual migration.
--
-- Without this column present, POST /api/share/:id/og-image and the /og/:id
-- route both fail closed to their pre-existing behavior (image upload is
-- skipped; the OG route falls back to the old SVG renderer) rather than
-- erroring the whole share flow -- see server/utils/shareStorage.ts.

ALTER TABLE shared_runs
  ADD COLUMN og_image MEDIUMBLOB NULL AFTER matches;
