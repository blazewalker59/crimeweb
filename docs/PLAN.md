# CrimeWeb - Crime Show Cross-Reference App

## Overview

A TanStack Start web application that cross-references episodes from major true crime TV shows (Dateline NBC, 20/20, 48 Hours, Forensic Files, etc.) to identify:

1. **Updates/Reruns**: Same show covering the same case with reused footage
2. **Cross-Coverage**: Different shows covering the same case

---

## Tech Stack

| Layer           | Technology                                   |
| --------------- | -------------------------------------------- |
| Framework       | TanStack Start (React)                       |
| Database        | Supabase PostgreSQL                          |
| Auth            | Supabase Auth (email/password)               |
| Data Source     | TMDb API                                     |
| Case Matching   | Pattern-based (regex + Levenshtein distance) |
| Styling         | Tailwind CSS                                 |
| Deployment      | Cloudflare Pages                             |
| Package Manager | Bun                                          |

---

## Project Structure

```
crimeweb/
├── app/
│   ├── routes/
│   │   ├── __root.tsx              # Root layout with auth provider
│   │   ├── index.tsx               # Home/landing page
│   │   ├── shows/
│   │   │   ├── index.tsx           # All shows list
│   │   │   └── $showId.tsx         # Show detail with episodes
│   │   ├── cases/
│   │   │   ├── index.tsx           # All cases (deduplicated)
│   │   │   └── $caseId.tsx         # Case detail with all episodes
│   │   ├── episodes/
│   │   │   └── $episodeId.tsx      # Episode detail
│   │   ├── auth/
│   │   │   ├── login.tsx           # Login form
│   │   │   ├── register.tsx        # Registration form
│   │   │   └── callback.tsx        # OAuth callback handler
│   │   └── dashboard/
│   │       ├── index.tsx           # User dashboard
│   │       ├── watchlist.tsx       # User's watchlist
│   │       └── history.tsx         # Watch history
│   ├── components/
│   │   ├── auth/
│   │   │   ├── AuthProvider.tsx    # Supabase auth context
│   │   │   ├── LoginForm.tsx       # Email/password login
│   │   │   ├── RegisterForm.tsx    # Registration form
│   │   │   └── ProtectedRoute.tsx  # Auth guard wrapper
│   │   ├── layout/
│   │   │   ├── Header.tsx          # Navigation header
│   │   │   ├── Footer.tsx          # Site footer
│   │   │   └── Sidebar.tsx         # Dashboard sidebar
│   │   ├── shows/
│   │   │   ├── ShowCard.tsx        # Show preview card
│   │   │   ├── ShowGrid.tsx        # Grid of shows
│   │   │   └── EpisodeList.tsx     # Episodes table/list
│   │   ├── cases/
│   │   │   ├── CaseCard.tsx        # Case preview card
│   │   │   ├── CaseTimeline.tsx    # Timeline of coverage
│   │   │   ├── LinkEpisodeModal.tsx # Link episode to case
│   │   │   └── CreateCaseModal.tsx  # Create new case
│   │   └── common/
│   │       ├── SearchBar.tsx       # Global search
│   │       ├── Pagination.tsx      # Pagination controls
│   │       └── Badge.tsx           # Status badges
│   └── lib/
│       ├── supabase/
│       │   ├── client.ts           # Browser Supabase client
│       │   ├── server.ts           # Server Supabase client
│       │   └── middleware.ts       # Auth middleware for routes
│       ├── tmdb/
│       │   ├── client.ts           # TMDb API client
│       │   ├── types.ts            # TMDb response types
│       │   └── sync.ts             # Episode sync logic
│       ├── matching/
│       │   ├── patterns.ts         # Regex patterns for name extraction
│       │   ├── fuzzy.ts            # String similarity functions
│       │   └── suggest.ts          # Auto-suggest case matches
│       └── utils/
│           └── formatters.ts       # Date/string formatters
├── supabase/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql  # Core tables
│   │   ├── 002_rls_policies.sql    # Row level security
│   │   └── 003_functions.sql       # Database functions
│   └── seed.sql                    # Initial shows data
├── public/
│   └── favicon.ico
├── .env.local                      # Local environment variables
├── .env.example                    # Example env file
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── app.config.ts                   # TanStack Start config
└── wrangler.toml                   # Cloudflare config
```

---

## Database Schema

### Tables

#### `shows`

Stores crime TV shows synced from TMDb.

```sql
CREATE TABLE shows (
  id SERIAL PRIMARY KEY,
  tmdb_id INTEGER UNIQUE NOT NULL,
  name TEXT NOT NULL,
  network TEXT,
  poster_path TEXT,
  first_air_date DATE,
  overview TEXT,
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `episodes`

Individual episodes from each show.

```sql
CREATE TABLE episodes (
  id SERIAL PRIMARY KEY,
  show_id INTEGER REFERENCES shows(id) ON DELETE CASCADE,
  tmdb_id INTEGER,
  season_number INTEGER NOT NULL,
  episode_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  overview TEXT,
  air_date DATE,
  still_path TEXT,
  runtime INTEGER,
  is_rerun BOOLEAN DEFAULT FALSE,
  original_episode_id INTEGER REFERENCES episodes(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(show_id, season_number, episode_number)
);

CREATE INDEX idx_episodes_show_id ON episodes(show_id);
CREATE INDEX idx_episodes_air_date ON episodes(air_date);
CREATE INDEX idx_episodes_name ON episodes USING gin(to_tsvector('english', name));
```

#### `cases`

Unified crime cases that may span multiple shows.

```sql
CREATE TABLE cases (
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

CREATE INDEX idx_cases_victim_names ON cases USING gin(victim_names);
CREATE INDEX idx_cases_perpetrator_names ON cases USING gin(perpetrator_names);
CREATE INDEX idx_cases_name ON cases USING gin(to_tsvector('english', name));
```

#### `episode_cases`

Junction table linking episodes to cases (community-driven).

```sql
CREATE TABLE episode_cases (
  id SERIAL PRIMARY KEY,
  episode_id INTEGER REFERENCES episodes(id) ON DELETE CASCADE,
  case_id INTEGER REFERENCES cases(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT FALSE,
  confidence_score FLOAT DEFAULT 1.0,
  linked_by UUID REFERENCES auth.users(id),
  linked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(episode_id, case_id)
);

CREATE INDEX idx_episode_cases_episode ON episode_cases(episode_id);
CREATE INDEX idx_episode_cases_case ON episode_cases(case_id);
```

#### `watchlist`

User's saved episodes to watch later.

```sql
CREATE TABLE watchlist (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  episode_id INTEGER REFERENCES episodes(id) ON DELETE CASCADE,
  notes TEXT,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, episode_id)
);
```

#### `watch_history`

Tracks what users have watched.

```sql
CREATE TABLE watch_history (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  episode_id INTEGER REFERENCES episodes(id) ON DELETE CASCADE,
  watched_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_watch_history_user ON watch_history(user_id);
CREATE INDEX idx_watch_history_episode ON watch_history(episode_id);
```

### Row Level Security (RLS)

```sql
-- Watchlist: users can only access their own
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own watchlist" ON watchlist
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own watchlist" ON watchlist
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own watchlist" ON watchlist
  FOR DELETE USING (auth.uid() = user_id);

-- Watch history: users can only access their own
ALTER TABLE watch_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own history" ON watch_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own history" ON watch_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Cases: public read, authenticated write
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read cases" ON cases
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create cases" ON cases
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Creators can update own cases" ON cases
  FOR UPDATE USING (auth.uid() = created_by);

-- Episode cases: public read, authenticated write
ALTER TABLE episode_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read episode_cases" ON episode_cases
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can link episodes" ON episode_cases
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Linkers can remove own links" ON episode_cases
  FOR DELETE USING (auth.uid() = linked_by);

-- Shows and episodes: public read only
ALTER TABLE shows ENABLE ROW LEVEL SECURITY;
ALTER TABLE episodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read shows" ON shows FOR SELECT USING (true);
CREATE POLICY "Anyone can read episodes" ON episodes FOR SELECT USING (true);
```

---

## TMDb Integration

### Target Shows

| Show            | Network | Notes                          |
| --------------- | ------- | ------------------------------ |
| Dateline NBC    | NBC     | Flagship crime show since 1992 |
| 20/20           | ABC     | News magazine with crime focus |
| 48 Hours        | CBS     | In-depth crime investigations  |
| Forensic Files  | Various | Scientific crime investigation |
| Cold Case Files | A&E     | Unsolved case investigations   |
| Snapped         | Oxygen  | Women who commit murder        |
| American Greed  | CNBC    | White-collar crime             |
| The First 48    | A&E     | Homicide investigations        |

### API Endpoints

```typescript
// Search for TV shows
GET https://api.themoviedb.org/3/search/tv?query={show_name}

// Get show details
GET https://api.themoviedb.org/3/tv/{series_id}

// Get season details with episodes
GET https://api.themoviedb.org/3/tv/{series_id}/season/{season_number}

// Get episode details
GET https://api.themoviedb.org/3/tv/{series_id}/season/{season_number}/episode/{episode_number}
```

### Rate Limiting Strategy

TMDb allows ~40 requests per 10 seconds. Implementation uses a queue-based approach with automatic throttling.

### Sync Strategy

1. **Initial Sync**: Full sync of all seasons/episodes for each show
2. **Incremental Sync**: Weekly check for new episodes only
3. **Manual Trigger**: Admin can trigger full resync

---

## Case Matching Algorithm

### Name Extraction Patterns

Common title patterns in crime shows:

- "The [Name] Case"
- "Who Killed [Name]?"
- "[Name] Murder" or "Murder of [Name]"
- "Justice for [Name]"
- "The [Name] Mystery"
- "Death of [Name]"
- Names in quotes

### Fuzzy Matching

Uses string-similarity library with Levenshtein distance. Threshold of 0.85 for automatic matching, lower scores queued for manual review.

### Rerun Detection

Compares episode titles within the same show. High similarity (>0.90) + same show + newer date = likely rerun/update.

---

## Implementation Phases

### Phase 1: Project Setup

- [x] Initialize TanStack Start with bun
- [ ] Install dependencies (Supabase, Tailwind, string-similarity)
- [ ] Configure TypeScript and project structure
- [ ] Set up environment variables template

### Phase 2: Database & Auth

- [ ] Write Supabase migrations for all tables
- [ ] Configure Row Level Security policies
- [ ] Set up Supabase Auth (email/password)
- [ ] Create auth routes and components

### Phase 3: TMDb Integration

- [ ] Build TMDb API client with rate limiting
- [ ] Implement show search and episode sync
- [ ] Seed initial shows

### Phase 4: Core UI

- [ ] Layout components (Header, Footer)
- [ ] Shows browse page
- [ ] Episodes list and detail pages
- [ ] Cases browse and detail pages

### Phase 5: Case Matching

- [ ] Name extraction patterns
- [ ] Fuzzy matching functions
- [ ] Auto-suggest UI

### Phase 6: Community Features

- [ ] Create/link case modals
- [ ] Attribution for contributions

### Phase 7: User Features

- [ ] Watchlist
- [ ] Watch history
- [ ] Dashboard

### Phase 8: Deploy

- [ ] Cloudflare Pages configuration
- [ ] Production deployment

---

## Environment Variables

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# TMDb API
TMDB_API_KEY=your-tmdb-api-key
TMDB_API_READ_ACCESS_TOKEN=your-tmdb-read-access-token
```

---

## Supabase Setup Instructions

1. Go to [supabase.com](https://supabase.com) and create account
2. Create new project named `crimeweb`
3. Save database password securely
4. Get API keys from Project Settings > API
5. Run migrations with `npx supabase db push`

## TMDb Setup Instructions

1. Go to [themoviedb.org](https://www.themoviedb.org/)
2. Create account and request API key
3. Copy API Key and Read Access Token to `.env.local`
