import { createStartHandler, defaultStreamHandler } from "@tanstack/react-start/server";
import { extractPending } from "./server/ingest/extract";
import { recomputeHeatInputs } from "./server/ingest/heat";
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

        // Phase 3: drain a bounded batch of pending items through the LLM.
        // Whatever is left stays pending for the next run.
        const ex = await extractPending();
        console.log(
          `[extract] processed=${ex.processed} failed=${ex.failed} ` +
            `cases=${ex.casesCreated} provisional=${ex.provisional} ` +
            `confirmed=${ex.coverageConfirmed} proposed=${ex.coverageProposed} ` +
            `dupes=${ex.duplicatesFlagged} remaining=${await pendingCount()}`,
        );

        // Phase 3b: Heat inputs. source_count_90d is a sliding window, so it
        // goes stale with no new coverage at all — this must run every cron,
        // not only when ingest inserted something.
        console.log(`[heat] recomputed inputs for ${await recomputeHeatInputs()} cases`);
      })(),
    );
  },
};
