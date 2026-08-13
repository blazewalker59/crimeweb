/**
 * Worker secrets, declared by interface merging into the Env that
 * `wrangler types` generates.
 *
 * `wrangler types` reads bindings and vars from wrangler.toml, but secrets are
 * set out-of-band with `wrangler secret put` and never appear in config, so it
 * cannot know about them. Declaring them here keeps them type-checked without
 * committing values or depending on a gitignored .dev.vars.
 *
 * Note this augments `Cloudflare.Env` specifically: the `env` export from
 * `cloudflare:workers` is typed as that, not as the global `Env`.
 *
 * Set with: wrangler secret put <NAME>
 */
declare namespace Cloudflare {
  interface Env {
    BETTER_AUTH_SECRET: string;
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
  }
}
