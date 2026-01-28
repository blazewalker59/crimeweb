# CrimeWeb

A true crime episode tracker that aggregates the latest episodes from popular true crime TV shows. Track what you've watched, discover related episodes covering the same cases, and never miss a new episode.

## Features

- **Episode Tracking** - Browse latest episodes from Dateline, 20/20, 48 Hours, Forensic Files, and more
- **Viewed Status** - Mark episodes as viewed to track your progress
- **Related Episodes** - Discover episodes from different shows covering the same case
- **Infinite Scroll** - Seamlessly load more episodes as you browse
- **Filter by Status** - Show all, unviewed, or viewed episodes
- **PWA Support** - Install as a progressive web app

## Tech Stack

- **Framework**: [TanStack Start](https://tanstack.com/start) (React)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Runtime**: [Bun](https://bun.sh/)
- **Data**: [TMDb API](https://www.themoviedb.org/documentation/api)
- **Deployment**: Cloudflare Pages

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
# Standard build
bun run build

# Cloudflare Pages build
bun run build:cf
```

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

| Command | Description |
|---------|-------------|
| `bun run dev` | Start development server |
| `bun run build` | Build for production |
| `bun run build:cf` | Build for Cloudflare Pages |
| `bun run deploy` | Deploy to Cloudflare Pages |
| `bun tsc --noEmit` | Type-check without emitting |
| `bun scripts/fetch-episodes.ts` | Refresh episode data from TMDb |
| `bun scripts/test-matching.ts` | Test fuzzy matching logic |

## Theme

CrimeWeb uses a crime scene inspired dark theme:

- **Background**: True black (`#000000`, `#0a0a0a`)
- **Accents**: Blood red (`#b91c1c`, `#dc2626`)
- **Text**: Chalk white (`#ffffff`)
- **Highlights**: Evidence tape yellow (`#eab308`)

## Environment Variables

| Variable | Description |
|----------|-------------|
| `TMDB_API_KEY` | Your TMDb API key (required) |

## Data Attribution

Episode data provided by [TMDb](https://www.themoviedb.org). This product uses the TMDB API but is not endorsed or certified by TMDB.

## License

MIT
