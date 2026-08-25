-- Replaces migration 004's flat "(99 - ovr)" bonus with a genuine
-- Elo-style expected-vs-actual performance score.
--
-- 004 already fixed the core bug (outcome was ignored entirely in
-- sorting), and did reward a lower OVR within the same outcome tier --
-- but only linearly, by a small, fairly flat amount. Feedback: "das ist
-- kein Elo-System" -- winning with an 82-OVR squad only barely beat
-- winning with a 92-OVR "easy" legend-stacked squad (1017 vs 1007).
--
-- Elo's actual idea: define an expected performance level for your rating,
-- then reward/punish the *surprise* -- how far actual results deviated from
-- that expectation -- not a flat per-point bonus. Applied here:
--
--   difficulty(outcome) = the OVR at which reaching that outcome tier is
--     "expected", not surprising:
--       group_stage: 50, quarter_final: 70, semi_final: 78,
--       runner_up: 85, winner: 90
--   surprise = clamp(difficulty(outcome) - ovr, -15, 15)
--     positive when you reached this tier with LESS than the "expected"
--     OVR for it (overperformed); negative when you needed MORE than
--     expected (underperformed, e.g. a 92-OVR squad "only" winning is a
--     small negative surprise -- expected to win anyway)
--   score = outcomeBasePoints + surprise * 3
--
-- The +/-15 clamp on surprise (so the adjustment is at most +/-45) is
-- deliberate and load-bearing, not just a nice-to-have: it guarantees
-- outcomeBasePoints' 150+ point gaps between tiers can never be
-- overcome by the surprise term, so a winner can never be outranked by a
-- non-winner regardless of OVR, even at the theoretical 0/99 OVR
-- extremes -- verified: min possible winner score (973) still beats max
-- possible runner-up score (745).
--
-- `ovr` is TINYINT UNSIGNED (see 001_create_leaderboard.sql); subtracting
-- it directly from the CASE result gets MySQL to infer an UNSIGNED result
-- type for the whole expression, which errors ("BIGINT UNSIGNED value is
-- out of range") the moment the subtraction goes negative -- e.g. any
-- winner with ovr > 90. CAST(ovr AS SIGNED) below forces signed
-- arithmetic so negative surprise values compute correctly.
--
-- Run this once against the production database:
--   mysql -u <user> -p <dbname> < server/db/migrations/005_leaderboard_elo_style_score.sql

ALTER TABLE leaderboard DROP INDEX idx_score;
ALTER TABLE leaderboard DROP COLUMN score;

ALTER TABLE leaderboard
  ADD COLUMN score INT GENERATED ALWAYS AS (
    (CASE outcome
       WHEN 'winner' THEN 1000
       WHEN 'runner_up' THEN 700
       WHEN 'semi_final' THEN 500
       WHEN 'quarter_final' THEN 350
       ELSE 100
     END)
    + LEAST(15, GREATEST(-15,
        (CASE outcome
           WHEN 'winner' THEN 90
           WHEN 'runner_up' THEN 85
           WHEN 'semi_final' THEN 78
           WHEN 'quarter_final' THEN 70
           ELSE 50
         END) - CAST(ovr AS SIGNED)
      )) * 3
  ) STORED,
  ADD INDEX idx_score (score DESC, submitted_at ASC);
