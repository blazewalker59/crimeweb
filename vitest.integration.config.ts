import { defineConfig } from "vitest/config";
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-pool-workers";

/**
 * Integration tests: real code against a real D1, in-process under workerd.
 *
 * Separate from vitest.config.ts because the two need different runtimes. The
 * unit suite runs on node/jsdom; this one runs with an actual D1 binding, so
 * CHECK constraints, FTS5 virtual tables and triggers, and SQLite's own
 * functions (exp, unixepoch) behave the way they do in production rather than
 * the way a fake was written to behave.
 *
 * That distinction is not theoretical here. This build has already shipped
 * three things a fake would have waved through:
 *
 *   - `ALTER TABLE ... ADD CONSTRAINT` does not exist in SQLite, so the
 *     coverage CHECK had to be inlined into CREATE TABLE.
 *   - The Heat query depends on `exp()` and `unixepoch()` existing, and on
 *     unixepoch() returning SECONDS, matching Drizzle's timestamp mode.
 *   - FTS5 external-content tables only stay in step because of triggers.
 *
 * Migrations are read from ./drizzle — the same SQL wrangler applies to
 * production — so the schema under test cannot drift from the real one.
 */
const migrations = await readD1Migrations("./drizzle");

export default defineConfig({
  plugins: [
    cloudflareTest({
      miniflare: {
        // Match wrangler.toml. nodejs_compat is required: Drizzle reaches for
        // node builtins.
        compatibilityDate: "2025-01-04",
        compatibilityFlags: ["nodejs_compat"],
        // Binding name matches production so src/db/index.ts works unmodified.
        d1Databases: { DB: "crimeweb-test" },
        bindings: { TEST_MIGRATIONS: migrations },
      },
    }),
  ],
  resolve: { tsconfigPaths: true },
  test: {
    include: ["src/__tests__/integration/**/*.test.ts"],
    setupFiles: ["./src/__tests__/integration/_setup.ts"],
  },
});
