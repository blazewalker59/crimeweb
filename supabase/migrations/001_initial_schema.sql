-- CrimeWeb Database Schema
-- Migration 001: Initial Schema

-- Shows table: Stores crime TV shows synced from TMDb
CREATE TABLE IF NOT EXISTS shows (
  id SERIAL PRIMARY KEY,
  tmdb_id INTEGER UNIQUE NOT NULL,
  name TEXT NOT NULL,
  network TEXT,
  poster_path TEXT,
  backdrop_path TEXT,
  first_air_date DATE,
  overview TEXT,
  vote_average DECIMAL(3,1),
  number_of_seasons INTEGER DEFAULT 0,
  number_of_episodes INTEGER DEFAULT 0,
  status TEXT,
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_shows_tmdb_id ON shows(tmdb_id);
CREATE INDEX IF NOT EXISTS idx_shows_name ON shows USING gin(to_tsvector('english', name));

-- Episodes table: Individual episodes from each show
CREATE TABLE IF NOT EXISTS episodes (
  id SERIAL PRIMARY KEY,
  show_id INTEGER NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  tmdb_id INTEGER,
  season_number INTEGER NOT NULL,
  episode_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  overview TEXT,
  air_date DATE,
  still_path TEXT,
  runtime INTEGER,
  vote_average DECIMAL(3,1),
  is_rerun BOOLEAN DEFAULT FALSE,
  original_episode_id INTEGER REFERENCES episodes(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(show_id, season_number, episode_number)
);

-- Indexes for episodes
CREATE INDEX IF NOT EXISTS idx_episodes_show_id ON episodes(show_id);
CREATE INDEX IF NOT EXISTS idx_episodes_air_date ON episodes(air_date DESC);
CREATE INDEX IF NOT EXISTS idx_episodes_name ON episodes USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_episodes_overview ON episodes USING gin(to_tsvector('english', COALESCE(overview, '')));

-- Cases table: Unified crime cases that may span multiple shows
CREATE TABLE IF NOT EXISTS cases (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  victim_names TEXT[] DEFAULT '{}',
  perpetrator_names TEXT[] DEFAULT '{}',
  location TEXT,
  state TEXT,
  year INTEGER,
  summary TEXT,
  wikipedia_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for cases
CREATE INDEX IF NOT EXISTS idx_cases_slug ON cases(slug);
CREATE INDEX IF NOT EXISTS idx_cases_victim_names ON cases USING gin(victim_names);
CREATE INDEX IF NOT EXISTS idx_cases_perpetrator_names ON cases USING gin(perpetrator_names);
CREATE INDEX IF NOT EXISTS idx_cases_name ON cases USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_cases_year ON cases(year);

-- Episode-Cases junction table: Links episodes to cases (community-driven)
CREATE TABLE IF NOT EXISTS episode_cases (
  id SERIAL PRIMARY KEY,
  episode_id INTEGER NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  case_id INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT FALSE,
  confidence_score DECIMAL(3,2) DEFAULT 1.0,
  linked_by UUID REFERENCES auth.users(id),
  linked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(episode_id, case_id)
);

-- Indexes for episode_cases
CREATE INDEX IF NOT EXISTS idx_episode_cases_episode ON episode_cases(episode_id);
CREATE INDEX IF NOT EXISTS idx_episode_cases_case ON episode_cases(case_id);
CREATE INDEX IF NOT EXISTS idx_episode_cases_linked_by ON episode_cases(linked_by);

-- Watchlist table: User's saved episodes to watch later
CREATE TABLE IF NOT EXISTS watchlist (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  episode_id INTEGER NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  notes TEXT,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, episode_id)
);

-- Indexes for watchlist
CREATE INDEX IF NOT EXISTS idx_watchlist_user ON watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_episode ON watchlist(episode_id);

-- Watch history table: Tracks what users have watched
CREATE TABLE IF NOT EXISTS watch_history (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  episode_id INTEGER NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  watched_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for watch_history
CREATE INDEX IF NOT EXISTS idx_watch_history_user ON watch_history(user_id);
CREATE INDEX IF NOT EXISTS idx_watch_history_episode ON watch_history(episode_id);
CREATE INDEX IF NOT EXISTS idx_watch_history_watched_at ON watch_history(watched_at DESC);

-- User profiles table: Extended user information
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for profiles
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

-- Function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to generate case slug
CREATE OR REPLACE FUNCTION generate_case_slug()
RETURNS TRIGGER AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Create base slug from name
  base_slug := lower(regexp_replace(NEW.name, '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);
  final_slug := base_slug;
  
  -- Check for uniqueness and add counter if needed
  WHILE EXISTS (SELECT 1 FROM cases WHERE slug = final_slug AND id != COALESCE(NEW.id, 0)) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  NEW.slug := final_slug;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate slug
DROP TRIGGER IF EXISTS generate_case_slug_trigger ON cases;
CREATE TRIGGER generate_case_slug_trigger
  BEFORE INSERT OR UPDATE OF name ON cases
  FOR EACH ROW
  WHEN (NEW.slug IS NULL OR NEW.slug = '')
  EXECUTE FUNCTION generate_case_slug();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_cases_updated_at ON cases;
CREATE TRIGGER update_cases_updated_at
  BEFORE UPDATE ON cases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
