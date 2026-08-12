# Agent Rules

## Build & Development

- **Never run the dev server** (`bun run dev`) as part of your workflow. The user will run this themselves.
- Use `bun run build` to compile the project for production.
- Use `bun run typecheck` to type-check without emitting files.
- Use `bun run check` for Prettier + ESLint, and `bun run lint:fix` / `bun run format` to fix.
- Use `bun run ci` to run exactly what CI runs before pushing.
- **Bun is the package manager.** `bun.lock` is committed and CI installs with
  `--frozen-lockfile`; do not introduce a second lockfile.
- The production server can be tested briefly with `node .output/server/index.mjs` if needed, but prefer letting the user handle this.

## Testing

- Run `bun run test:run` for the unit suite (43 tests, sub-second).
- Run `bun scripts/test-matching.ts` to test fuzzy matching logic.
- Run `bun scripts/fetch-episodes.ts` to refresh episode data from TMDb.

## CI/CD

One pipeline, `.github/workflows/ci.yml`, for both PRs and production. It builds
once in `checks`, uploads `dist/` as an artifact, and the `deploy` job ships that
exact artifact — no rebuild. Worker secrets are managed out-of-band with
`wrangler secret put` and are not uploaded per-deploy.

When v2 introduces D1, add `integration` and `migrate` jobs following the tome
repo's pattern. `migrate` must run **before** `deploy` and as its own job, so a
migration failure blocks the deploy rather than leaving new code against an old
schema.

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
