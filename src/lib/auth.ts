import { env } from "cloudflare:workers";
import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { db } from "@/db";

/**
 * Auth for CrimeWeb v2 — Google sign-in restricted to an invite allowlist.
 *
 * Per ADR-0002 there is deliberately no signup, no moderation and no roles:
 * every allowlisted user has equal authority over the case graph, and the
 * audit trail plus one-click reversal is the entire error-correction
 * mechanism. That is only defensible while the allowlist stays small.
 */

function allowlist(): Set<string> {
  return new Set(
    (env.ALLOWLIST_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

// Built per request: the D1 client is an I/O binding and must be created
// inside a request context.
export function createAuth() {
  return betterAuth({
    database: drizzleAdapter(db(), { provider: "sqlite" }),
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      },
    },
    databaseHooks: {
      user: {
        create: {
          // For OAuth the email is not in the request body, so the allowlist
          // is enforced here — after Google resolves the email, before the
          // user row is created. A disallowed email never gets a row.
          before: async (newUser: { email: string }) => {
            const allowed = allowlist();
            if (allowed.size > 0 && !allowed.has(newUser.email.toLowerCase())) {
              throw new APIError("FORBIDDEN", {
                message: "This email is not on the CrimeWeb invite list.",
              });
            }
            return await Promise.resolve({ data: newUser });
          },
        },
      },
    },
    // Must be last.
    plugins: [tanstackStartCookies()],
  });
}

export type Auth = ReturnType<typeof createAuth>;
