-- Adds a proper composite ranking score to the leaderboard, replacing the
-- previous "ORDER BY ovr DESC" -- which ignored tournament outcome
-- entirely, so a run that only reached the group stage could (and did)
-- outrank a run that won the whole thing, as long as its OVR was equal
-- and it was submitted earlier (the previous tiebreaker).
--
-- score = outcome tier points + (99 - ovr)
--   winner: 1000, runner_up: 700, semi_final: 500, quarter_final: 350,
--   group_stage: 100
-- The (99 - ovr) term is the "how far did you get with how little" bonus --
-- lower OVR scores higher, rewarding overperforming with a weaker squad --
-- but capped well below the gap between any two outcome tiers (at most 99
-- points, vs a minimum 150-point tier gap), so outcome always dominates:
-- no group-stage run can ever outscore a win, regardless of OVR.
--
-- A generated column, not application logic, so it can never drift out of
-- sync with outcome/ovr and every existing row is recomputed automatically
-- the moment this migration runs.
--
-- Run this once against the production database:
--   mysql -u <user> -p <dbname> < server/db/migrations/004_add_leaderboard_score.sql

ALTER TABLE leaderboard
  ADD COLUMN score INT GENERATED ALWAYS AS (
    (CASE outcome
       WHEN 'winner' THEN 1000
       WHEN 'runner_up' THEN 700
       WHEN 'semi_final' THEN 500
       WHEN 'quarter_final' THEN 350
       ELSE 100
     END) + (99 - ovr)
  ) STORED,
  ADD INDEX idx_score (score DESC, submitted_at ASC);

ALTER TABLE leaderboard DROP INDEX idx_ovr;
