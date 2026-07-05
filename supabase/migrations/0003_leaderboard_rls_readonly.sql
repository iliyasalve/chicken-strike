-- ⚠️ PENDING — APPLY ONLY AT MERGE TIME, after the Edge-Function
-- client (this branch) is live on GitHub Pages.
--
-- Removes the blanket anonymous write policies. After this, the anon
-- key can only READ the leaderboard; all writes must go through the
-- Edge Functions (submit-score / delete-my-data), which use the
-- service-role key and bypass RLS. This is what actually closes the
-- "anyone can overwrite/wipe the whole table" hole (SEC-2/SEC-3).
--
-- Do NOT apply while the OLD client (direct anon writes) is still the
-- deployed version, or score saving will break for live players.
--
-- SELECT stays public: the leaderboard is meant to be readable by all.

DROP POLICY IF EXISTS "Anyone can insert scores"  ON public.leaderboard;
DROP POLICY IF EXISTS "Anyone can update scores"  ON public.leaderboard;
DROP POLICY IF EXISTS "Anyone can delete own data" ON public.leaderboard;

-- "Anyone can read leaderboard" (SELECT USING true) is intentionally kept.
