import { createStartHandler, defaultStreamHandler } from "@tanstack/react-start/server";
import { pendingCount, refreshEpisodes } from "./server/ingest/refresh";

/**
 * Worker entry.
 *
 * Replaces `@tanstack/react-start/server-entry` as `main` in wrangler.toml.
 * That default entry is only `{ fetch: createStartHandler(defaultStreamHandler) }`
 * — the same handler is kept here verbatim, with a `scheduled` handler added
 * alongside it, because ingest runs on cron.
 */

const fetch = createStartHandler(defaultStreamHandler);

interface Env {
  TMDB_API_KEY: string;
}

export default {
  fetch,

  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(
      (async () => {
        if (!env.TMDB_API_KEY) {
          console.error("[ingest] TMDB_API_KEY missing; skipping refresh");
          return;
        }
        const report = await refreshEpisodes(env.TMDB_API_KEY);
        console.log(
          `[ingest] seeded=${report.sourcesSeeded} seen=${report.episodesSeen} ` +
            `inserted=${report.episodesInserted} pending=${await pendingCount()}`,
        );
        // Surfaced rather than swallowed: a curated Source returning nothing
        // usually means its TMDb id went stale, not that it aired nothing.
        if (report.emptySources.length > 0) {
          console.warn(`[ingest] sources returned no episodes: ${report.emptySources.join(", ")}`);
        }
        for (const e of report.errors) console.error(`[ingest] ${e}`);
      })(),
    );
  },
};
