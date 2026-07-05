-- Defense-in-depth CHECK constraints on the leaderboard table.
-- These are enforced regardless of RLS or which client writes,
-- so even a direct REST call with the anon key cannot store
-- absurd values (e.g. score = 999999) or oversized usernames
-- (which were the vehicle for the stored-XSS payloads).
--
-- Bounds are intentionally generous to stay compatible with a
-- future "endless / waves" mode (path B): score is capped only
-- at a sanity ceiling, not at the current finite-game maximum.
--
-- Existing data at time of writing: score 30..1020, playtime
-- 29..197, username length 3..10 — all pass.

ALTER TABLE public.leaderboard
  ADD CONSTRAINT chk_score    CHECK (score >= 0 AND score <= 10000000),
  ADD CONSTRAINT chk_playtime CHECK (playtime >= 0 AND playtime <= 86400),
  ADD CONSTRAINT chk_username CHECK (char_length(username) BETWEEN 1 AND 20);
