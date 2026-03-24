declare module "cloudflare:workers" {
  /** Cloudflare Worker env bindings (secrets, vars, KV, R2, etc.) */
  export const env: Record<string, string>;
}
