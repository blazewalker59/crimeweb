-- CrimeWeb Row Level Security Policies
-- Migration 002: RLS Policies

-- Enable RLS on all tables
ALTER TABLE shows ENABLE ROW LEVEL SECURITY;
ALTER TABLE episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE episode_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE watch_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- SHOWS: Public read only (admin write via service role)
-- ============================================
DROP POLICY IF EXISTS "Anyone can read shows" ON shows;
CREATE POLICY "Anyone can read shows" ON shows
  FOR SELECT
  USING (true);

-- ============================================
-- EPISODES: Public read only (admin write via service role)
-- ============================================
DROP POLICY IF EXISTS "Anyone can read episodes" ON episodes;
CREATE POLICY "Anyone can read episodes" ON episodes
  FOR SELECT
  USING (true);

-- ============================================
-- CASES: Public read, authenticated users can create/update
-- ============================================
DROP POLICY IF EXISTS "Anyone can read cases" ON cases;
CREATE POLICY "Anyone can read cases" ON cases
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can create cases" ON cases;
CREATE POLICY "Authenticated users can create cases" ON cases
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Creators can update own cases" ON cases;
CREATE POLICY "Creators can update own cases" ON cases
  FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- ============================================
-- EPISODE_CASES: Public read, authenticated users can link/unlink
-- ============================================
DROP POLICY IF EXISTS "Anyone can read episode_cases" ON episode_cases;
CREATE POLICY "Anyone can read episode_cases" ON episode_cases
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can link episodes to cases" ON episode_cases;
CREATE POLICY "Authenticated users can link episodes to cases" ON episode_cases
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can remove their own links" ON episode_cases;
CREATE POLICY "Users can remove their own links" ON episode_cases
  FOR DELETE
  USING (auth.uid() = linked_by);

-- ============================================
-- WATCHLIST: Users can only access their own
-- ============================================
DROP POLICY IF EXISTS "Users can view own watchlist" ON watchlist;
CREATE POLICY "Users can view own watchlist" ON watchlist
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can add to own watchlist" ON watchlist;
CREATE POLICY "Users can add to own watchlist" ON watchlist
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own watchlist" ON watchlist;
CREATE POLICY "Users can update own watchlist" ON watchlist
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete from own watchlist" ON watchlist;
CREATE POLICY "Users can delete from own watchlist" ON watchlist
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- WATCH_HISTORY: Users can only access their own
-- ============================================
DROP POLICY IF EXISTS "Users can view own history" ON watch_history;
CREATE POLICY "Users can view own history" ON watch_history
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can add to own history" ON watch_history;
CREATE POLICY "Users can add to own history" ON watch_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete from own history" ON watch_history;
CREATE POLICY "Users can delete from own history" ON watch_history
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- PROFILES: Public read, users can update own
-- ============================================
DROP POLICY IF EXISTS "Anyone can read profiles" ON profiles;
CREATE POLICY "Anyone can read profiles" ON profiles
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
