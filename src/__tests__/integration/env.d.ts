/// <reference types="@cloudflare/vitest-pool-workers/types" />
import type { D1Migration } from "@cloudflare/vitest-pool-workers";

/**
 * Types for the bindings vitest.integration.config.ts declares on the test
 * worker. Without this, `env.DB` and `env.TEST_MIGRATIONS` are untyped.
 *
 * `cloudflare:test` exports `env` as `Cloudflare.Env`, so this augments that
 * namespace — the same one src/secrets.d.ts extends, and for the same reason:
 * merging into the global `Env` silently does nothing.
 *
 * `declare global` is required because the import above makes this a module;
 * without it the namespace would be local and merge with nothing.
 */
declare global {
  namespace Cloudflare {
    interface Env {
      DB: D1Database;
      TEST_MIGRATIONS: Array<D1Migration>;
    }
  }
}
