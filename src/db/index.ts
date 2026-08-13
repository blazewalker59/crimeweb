import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

/**
 * Drizzle client over the D1 binding declared in wrangler.toml.
 * Called per-request; D1 connections are not pooled the way a TCP database is.
 */
export function db() {
  return drizzle(env.DB, { schema });
}
