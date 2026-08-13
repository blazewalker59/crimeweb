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

- Run `bun run test:run` for the unit suite.
- Run `bun run test:integration` for the integration suite — real D1 under
  workerd, applying the same `./drizzle` migrations wrangler applies to
  production. Use it for anything touching SQL: CHECK constraints, FTS
  triggers, and SQLite functions are invisible to a fake.
- Ingest runs on cron; there is no manual fetch script. To exercise it locally,
  `wrangler dev --test-scheduled` then POST `/cdn-cgi/handler/scheduled`.
  **Workers AI has no local implementation** — use plain `wrangler dev`, since
  `--local` disables the remote bindings AI requires.

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
- `/src/db/` - Drizzle schema and D1 client
- `/src/server/` - Server functions; `/src/server/ingest/` is the cron pipeline
- `/src/lib/` - Auth and shared helpers
- `/src/components/` - Reusable UI components
- `/drizzle/` - Generated migrations, applied by CI before deploy

## Environment

- Secrets are Worker secrets, set with `wrangler secret put`, not `.env`:
  `TMDB_API_KEY`, `TMDB_API_READ_ACCESS_TOKEN`, `BETTER_AUTH_SECRET`,
  `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `wrangler types` cannot see secrets; they are declared in `src/secrets.d.ts`,
  which augments `Cloudflare.Env` (not the global `Env` — merging there is silent)
- Runtime: Bun
- Framework: TanStack Start (React) on Cloudflare Workers
