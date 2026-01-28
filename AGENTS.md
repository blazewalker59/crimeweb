# Agent Rules

## Build & Development

- **Never run the dev server** (`bun run dev`) as part of your workflow. The user will run this themselves.
- Use `bun run build` to compile the project for production.
- Use `bun tsc --noEmit` to type-check without emitting files.
- The production server can be tested briefly with `node .output/server/index.mjs` if needed, but prefer letting the user handle this.

## Testing

- Run `bun scripts/test-matching.ts` to test fuzzy matching logic.
- Run `bun scripts/fetch-episodes.ts` to refresh episode data from TMDb.

## Code Style

- Use TypeScript with strict types.
- Prefer editing existing files over creating new ones.
- Keep functions small and focused.
- Use descriptive variable names.

## Project Structure

- `/src/routes/` - TanStack Router pages
- `/src/lib/` - Shared utilities and logic
- `/src/components/` - Reusable UI components
- `/scripts/` - CLI scripts for data fetching and testing
- `/data/` - JSON data files (episode database)

## Environment

- TMDb API key is required in `.env` as `TMDB_API_KEY`
- Runtime: Bun
- Framework: TanStack Start (React)
