-- CrimeWeb Database Views and Functions
-- Migration 003: Views and Helper Functions

-- ============================================
-- VIEW: Episodes with show information
-- ============================================
CREATE OR REPLACE VIEW episodes_with_show AS
SELECT 
  e.*,
  s.name as show_name,
  s.network as show_network,
  s.poster_path as show_poster_path
FROM episodes e
JOIN shows s ON e.show_id = s.id;

-- ============================================
-- VIEW: Cases with episode count
-- ============================================
CREATE OR REPLACE VIEW cases_with_stats AS
SELECT 
  c.*,
  COUNT(DISTINCT ec.episode_id) as episode_count,
  COUNT(DISTINCT e.show_id) as show_count,
  MIN(e.air_date) as first_coverage_date,
  MAX(e.air_date) as latest_coverage_date
FROM cases c
LEFT JOIN episode_cases ec ON c.id = ec.case_id
LEFT JOIN episodes e ON ec.episode_id = e.id
GROUP BY c.id;

-- ============================================
-- VIEW: Episodes with case information
-- ============================================
CREATE OR REPLACE VIEW episodes_with_cases AS
SELECT 
  e.*,
  s.name as show_name,
  s.network as show_network,
  s.poster_path as show_poster_path,
  array_agg(DISTINCT c.id) FILTER (WHERE c.id IS NOT NULL) as case_ids,
  array_agg(DISTINCT c.name) FILTER (WHERE c.name IS NOT NULL) as case_names
FROM episodes e
JOIN shows s ON e.show_id = s.id
LEFT JOIN episode_cases ec ON e.id = ec.episode_id
LEFT JOIN cases c ON ec.case_id = c.id
GROUP BY e.id, s.name, s.network, s.poster_path;

-- ============================================
-- FUNCTION: Search episodes by text
-- ============================================
CREATE OR REPLACE FUNCTION search_episodes(search_query TEXT)
RETURNS TABLE (
  id INTEGER,
  show_id INTEGER,
  season_number INTEGER,
  episode_number INTEGER,
  name TEXT,
  overview TEXT,
  air_date DATE,
  show_name TEXT,
  show_network TEXT,
  rank REAL
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.show_id,
    e.season_number,
    e.episode_number,
    e.name,
    e.overview,
    e.air_date,
    s.name as show_name,
    s.network as show_network,
    ts_rank(
      setweight(to_tsvector('english', e.name), 'A') ||
      setweight(to_tsvector('english', COALESCE(e.overview, '')), 'B'),
      plainto_tsquery('english', search_query)
    ) as rank
  FROM episodes e
  JOIN shows s ON e.show_id = s.id
  WHERE 
    to_tsvector('english', e.name) @@ plainto_tsquery('english', search_query)
    OR to_tsvector('english', COALESCE(e.overview, '')) @@ plainto_tsquery('english', search_query)
  ORDER BY rank DESC, e.air_date DESC;
END;
$$;

-- ============================================
-- FUNCTION: Search cases by text
-- ============================================
CREATE OR REPLACE FUNCTION search_cases(search_query TEXT)
RETURNS TABLE (
  id INTEGER,
  name TEXT,
  slug TEXT,
  victim_names TEXT[],
  perpetrator_names TEXT[],
  location TEXT,
  year INTEGER,
  summary TEXT,
  episode_count BIGINT,
  rank REAL
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.slug,
    c.victim_names,
    c.perpetrator_names,
    c.location,
    c.year,
    c.summary,
    COUNT(DISTINCT ec.episode_id) as episode_count,
    ts_rank(
      setweight(to_tsvector('english', c.name), 'A') ||
      setweight(to_tsvector('english', COALESCE(c.summary, '')), 'B') ||
      setweight(to_tsvector('english', array_to_string(c.victim_names, ' ')), 'A') ||
      setweight(to_tsvector('english', array_to_string(c.perpetrator_names, ' ')), 'A'),
      plainto_tsquery('english', search_query)
    ) as rank
  FROM cases c
  LEFT JOIN episode_cases ec ON c.id = ec.case_id
  WHERE 
    to_tsvector('english', c.name) @@ plainto_tsquery('english', search_query)
    OR to_tsvector('english', COALESCE(c.summary, '')) @@ plainto_tsquery('english', search_query)
    OR to_tsvector('english', array_to_string(c.victim_names, ' ')) @@ plainto_tsquery('english', search_query)
    OR to_tsvector('english', array_to_string(c.perpetrator_names, ' ')) @@ plainto_tsquery('english', search_query)
  GROUP BY c.id
  ORDER BY rank DESC;
END;
$$;

-- ============================================
-- FUNCTION: Get cross-coverage for a case
-- ============================================
CREATE OR REPLACE FUNCTION get_case_coverage(case_id_param INTEGER)
RETURNS TABLE (
  show_id INTEGER,
  show_name TEXT,
  show_network TEXT,
  episode_count BIGINT,
  first_air_date DATE,
  latest_air_date DATE
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id as show_id,
    s.name as show_name,
    s.network as show_network,
    COUNT(e.id) as episode_count,
    MIN(e.air_date) as first_air_date,
    MAX(e.air_date) as latest_air_date
  FROM episode_cases ec
  JOIN episodes e ON ec.episode_id = e.id
  JOIN shows s ON e.show_id = s.id
  WHERE ec.case_id = case_id_param
  GROUP BY s.id, s.name, s.network
  ORDER BY first_air_date;
END;
$$;

-- ============================================
-- FUNCTION: Find potentially related episodes
-- ============================================
CREATE OR REPLACE FUNCTION find_related_episodes(episode_id_param INTEGER, similarity_threshold DECIMAL DEFAULT 0.5)
RETURNS TABLE (
  id INTEGER,
  show_id INTEGER,
  name TEXT,
  air_date DATE,
  show_name TEXT,
  similarity DECIMAL
)
LANGUAGE plpgsql
AS $$
DECLARE
  source_name TEXT;
  source_overview TEXT;
BEGIN
  -- Get source episode details
  SELECT e.name, e.overview INTO source_name, source_overview
  FROM episodes e WHERE e.id = episode_id_param;
  
  RETURN QUERY
  SELECT 
    e.id,
    e.show_id,
    e.name,
    e.air_date,
    s.name as show_name,
    similarity(LOWER(e.name), LOWER(source_name)) as similarity
  FROM episodes e
  JOIN shows s ON e.show_id = s.id
  WHERE 
    e.id != episode_id_param
    AND similarity(LOWER(e.name), LOWER(source_name)) > similarity_threshold
  ORDER BY similarity DESC
  LIMIT 20;
END;
$$;

-- Enable pg_trgm extension for similarity searches (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create trigram indexes for fuzzy matching
CREATE INDEX IF NOT EXISTS idx_episodes_name_trgm ON episodes USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_cases_name_trgm ON cases USING gin(name gin_trgm_ops);
