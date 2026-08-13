# CrimeWeb

A true crime tracker built around **cases** rather than releases. It surfaces which criminal cases are being covered right now across television and streaming, and cross-references coverage of the same case between sources.

Invite-only: access is a hand-maintained allowlist, enforced at Google sign-in.

## Features

- **Coverage timeline** - Every release, newest first, with a disclosure showing where else a case was covered and how far apart
- **Cases, not episodes** - One Case is one criminal incident; episodes and films are _coverage_ of it
- **Heat** - Cases ranked by recency of coverage multiplied by how many distinct sources converged on them
- **Correction surface** - A triage inbox for links the pipeline was not confident about, plus merge for cases minted twice
- **Search** - Full-text over cases and media, via D1 FTS5
- **Continuous ingest** - Daily refresh and extraction, weekly discovery, on Cloudflare cron

## Tech Stack

- **Framework**: [TanStack Start](https://tanstack.com/start) (React)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Build**: [Vite](https://vite.dev/) 8, [Vitest](https://vitest.dev/) 4, ESLint + Prettier
- **Package manager**: [Bun](https://bun.sh/)
- **Database**: Cloudflare D1 + Drizzle
- **Auth**: better-auth with Google, behind an invite allowlist
- **Extraction**: Workers AI
- **Data**: [TMDb API](https://www.themoviedb.org/documentation/api)
- **Deployment**: Cloudflare Workers

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) installed
- TMDb API key (get one at [themoviedb.org](https://www.themoviedb.org/settings/api))

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/crimeweb.git
cd crimeweb

# Install dependencies
bun install

# Set up environment variables
cp .env.example .env
# Add your TMDB_API_KEY to .env
```

### Development

```bash
bun run dev
```

The app will be available at `http://localhost:3000`.

### Building for Production

```bash
bun run build
```

Deploys happen in CI: merging to `main` runs `.github/workflows/ci.yml`, which
builds once and ships that exact artifact to Cloudflare Workers. `bun run ship`
does the same thing locally.

## Project Structure

```
src/
├── components/
│   ├── common/      # Reusable UI components (Badge, Loading, etc.)
│   └── layout/      # Header, Footer
├── lib/
│   ├── episodes/    # Episode context and viewed state
│   ├── matching/    # Related episode matching logic
│   ├── tmdb/        # TMDb API client
│   └── utils/       # Formatters and helpers
├── routes/
│   ├── __root.tsx   # Root layout
│   ├── index.tsx    # Home page
│   └── episodes/    # Episode detail pages
└── styles.css       # Global styles and Tailwind config
scripts/
├── fetch-episodes.ts    # Refresh episode data from TMDb
└── test-matching.ts     # Test fuzzy matching logic
data/
└── episodes.json        # Cached episode database
```

## Scripts

| Command                         | Description                                        |
| ------------------------------- | -------------------------------------------------- |
| `bun run dev`                   | Start development server                           |
| `bun run build`                 | Build for production                               |
| `bun run check`                 | Prettier check + ESLint                            |
| `bun run typecheck`             | Type-check only                                    |
| `bun run test`                  | Tests in watch mode                                |
| `bun run test:run`              | Tests once                                         |
| `bun run ci`                    | Everything CI runs: check, typecheck, tests, build |
| `bun run ship`                  | `ci`, then deploy to Cloudflare Workers            |
| `bun run cf:tail`               | Tail production Worker logs                        |
| `bun scripts/fetch-episodes.ts` | Refresh episode data from TMDb                     |
| `bun scripts/test-matching.ts`  | Test fuzzy matching logic                          |

## Theme

CrimeWeb uses a crime scene inspired dark theme:

- **Background**: True black (`#000000`, `#0a0a0a`)
- **Accents**: Blood red (`#b91c1c`, `#dc2626`)
- **Text**: Chalk white (`#ffffff`)
- **Highlights**: Evidence tape yellow (`#eab308`)

## Environment Variables

| Variable       | Description                  |
| -------------- | ---------------------------- |
| `TMDB_API_KEY` | Your TMDb API key (required) |

## Data Attribution

Episode data provided by [TMDb](https://www.themoviedb.org). This product uses the TMDB API but is not endorsed or certified by TMDB.

## License

MIT
