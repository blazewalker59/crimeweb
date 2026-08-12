# CrimeWeb v2 — D1 schema

Resolves [The v2 D1 schema](https://github.com/blazewalker59/crimeweb/issues/12). Drizzle on Cloudflare D1, following the dinnertable conventions: snake_case columns, camelCase TypeScript, `integer(..., { mode: 'timestamp' })` for times, migrations generated into `drizzle/` and applied with `wrangler d1 migrations apply`.

Better Auth's `user` / `session` / `account` / `verification` tables are carried over from dinnertable unchanged and are not restated here.

## Shape

```
sources ──< media_items ──< coverage >── cases >── case_series
                │                         │
                │                    case_people
                │
          user_media_state          watchlist >── cases
```

## Tables

```ts
import { sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  unique,
} from "drizzle-orm/sqlite-core";

// ── Catalogue ────────────────────────────────────────────────────────────────

export const sources = sqliteTable("sources", {
  id: text("id").primaryKey(),
  tmdbId: integer("tmdb_id").notNull().unique(),
  name: text("name").notNull(),
  kind: text("kind", { enum: ["network", "streamer"] }).notNull(),
  // Curated seed sources are never dropped by discovery — see ADR on ingest.
  isCurated: integer("is_curated", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const mediaItems = sqliteTable(
  "media_items",
  {
    id: text("id").primaryKey(),
    sourceId: text("source_id")
      .notNull()
      .references(() => sources.id),
    tmdbId: integer("tmdb_id").notNull(),
    kind: text("kind", { enum: ["episode", "film"] }).notNull(),

    title: text("title").notNull(),
    overview: text("overview"),
    stillPath: text("still_path"),

    // Binge-dropped series share one releasedAt across every episode.
    releasedAt: integer("released_at", { mode: "timestamp" }),
    seasonNumber: integer("season_number"), // episodes only
    episodeNumber: integer("episode_number"), // episodes only

    // Within-source duplicate detection: 13% of the v1 catalogue, 54% of The First 48.
    duplicateOf: text("duplicate_of"),

    extractionStatus: text("extraction_status", {
      enum: ["pending", "extracted", "failed"],
    })
      .notNull()
      .default("pending"),
    extractedAt: integer("extracted_at", { mode: "timestamp" }),
    ingestedAt: integer("ingested_at", { mode: "timestamp" }).notNull(),
  },
  (t) => [
    unique("media_tmdb_kind").on(t.tmdbId, t.kind),
    index("media_released_idx").on(t.releasedAt),
    index("media_extraction_idx").on(t.extractionStatus),
  ],
);

// ── Case graph ───────────────────────────────────────────────────────────────

export const cases = sqliteTable(
  "cases",
  {
    // Opaque and locally minted. Stable whether or not Wikidata ever gains an item.
    id: text("id").primaryKey(),
    displayTitle: text("display_title").notNull(), // the only required attribute
    summary: text("summary"),

    // Every descriptive attribute is nullable: only 8% of source metadata carries
    // both a location and a year.
    location: text("location"),
    occurredOn: integer("occurred_on", { mode: "timestamp" }),
    occurredYear: integer("occurred_year"),

    isProvisional: integer("is_provisional", { mode: "boolean" }).notNull().default(true),

    // Enrichment only — never a key, expected ~92% null, human-confirmed.
    wikidataQid: text("wikidata_qid"),
    wikipediaTitle: text("wikipedia_title"),
    enrichmentStatus: text("enrichment_status", {
      enum: ["none", "proposed", "confirmed"],
    })
      .notNull()
      .default("none"),

    // Heat INPUTS, not heat itself — decay is applied at query time so the value
    // never goes stale between cron runs.
    lastCoverageAt: integer("last_coverage_at", { mode: "timestamp" }),
    sourceCount90d: integer("source_count_90d").notNull().default(0),

    // Merge target. Non-null means this case was merged away; reads follow the chain.
    mergedInto: text("merged_into"),

    createdBy: text("created_by").references(() => user.id),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (t) => [
    index("cases_heat_idx").on(t.lastCoverageAt, t.sourceCount90d),
    index("cases_provisional_idx").on(t.isProvisional),
    index("cases_merged_idx").on(t.mergedInto),
  ],
);

// Multi-victim and multi-perpetrator incidents are the norm, so people are rows.
export const casePeople = sqliteTable(
  "case_people",
  {
    id: text("id").primaryKey(),
    caseId: text("case_id")
      .notNull()
      .references(() => cases.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    role: text("role", { enum: ["victim", "perpetrator", "suspect", "other"] }).notNull(),
    provenance: text("provenance", { enum: ["llm", "human", "import"] }).notNull(),
  },
  (t) => [index("case_people_case_idx").on(t.caseId)],
);

export const caseSeries = sqliteTable("case_series", {
  id: text("id").primaryKey(),
  displayTitle: text("display_title").notNull(),
  summary: text("summary"),
  createdBy: text("created_by").references(() => user.id),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const caseSeriesMembers = sqliteTable(
  "case_series_members",
  {
    seriesId: text("series_id")
      .notNull()
      .references(() => caseSeries.id, { onDelete: "cascade" }),
    caseId: text("case_id")
      .notNull()
      .references(() => cases.id, { onDelete: "cascade" }),
    addedBy: text("added_by").references(() => user.id),
    addedAt: integer("added_at", { mode: "timestamp" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.seriesId, t.caseId] })],
);

// ── Coverage ─────────────────────────────────────────────────────────────────

// Many-to-many by necessity: one episode can cover two unrelated cases
// (The First 48's "Circle of Friends & Rearview Murder" covers Tulsa AND Mobile).
// Targets either a Case or a Case Series — exactly one, enforced by CHECK.
export const coverage = sqliteTable(
  "coverage",
  {
    id: text("id").primaryKey(),
    mediaItemId: text("media_item_id")
      .notNull()
      .references(() => mediaItems.id, { onDelete: "cascade" }),
    caseId: text("case_id").references(() => cases.id, { onDelete: "cascade" }),
    seriesId: text("series_id").references(() => caseSeries.id, { onDelete: "cascade" }),

    confidence: real("confidence"), // null when human-asserted
    provenance: text("provenance", { enum: ["llm", "human", "import"] }).notNull(),
    status: text("status", { enum: ["proposed", "confirmed", "rejected"] }).notNull(),

    createdBy: text("created_by").references(() => user.id), // null when LLM-asserted
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    reviewedBy: text("reviewed_by").references(() => user.id),
    reviewedAt: integer("reviewed_at", { mode: "timestamp" }),
  },
  (t) => [
    index("coverage_case_idx").on(t.caseId),
    index("coverage_media_idx").on(t.mediaItemId),
    index("coverage_status_idx").on(t.status, t.confidence), // drives the review queue
  ],
);
```

```sql
-- Drizzle cannot express CHECK constraints; add to the migration by hand.
ALTER TABLE coverage ADD CONSTRAINT coverage_one_target
  CHECK ((case_id IS NOT NULL) <> (series_id IS NOT NULL));
```

```ts
// ── Audit ────────────────────────────────────────────────────────────────────

// Reversal is the only error-correction mechanism (ADR-0002), so history is
// what makes it safe. Every graph mutation appends here.
export const graphAudit = sqliteTable(
  "graph_audit",
  {
    id: text("id").primaryKey(),
    entityType: text("entity_type", {
      enum: ["case", "coverage", "case_series", "case_people"],
    }).notNull(),
    entityId: text("entity_id").notNull(),
    action: text("action", {
      enum: ["create", "update", "confirm", "reject", "merge", "reverse"],
    }).notNull(),
    actorId: text("actor_id").references(() => user.id),
    detail: text("detail", { mode: "json" }), // before/after for reversal
    at: integer("at", { mode: "timestamp" }).notNull(),
  },
  (t) => [index("audit_entity_idx").on(t.entityType, t.entityId)],
);

// ── Private per-user state ───────────────────────────────────────────────────

export const userMediaState = sqliteTable(
  "user_media_state",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    mediaItemId: text("media_item_id")
      .notNull()
      .references(() => mediaItems.id, { onDelete: "cascade" }),
    viewedAt: integer("viewed_at", { mode: "timestamp" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.mediaItemId] })],
);

export const watchlist = sqliteTable(
  "watchlist",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    caseId: text("case_id")
      .notNull()
      .references(() => cases.id, { onDelete: "cascade" }),
    addedAt: integer("added_at", { mode: "timestamp" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.caseId] })],
);
```

## Full-text search

D1's FTS5, following dinnertable's `drizzle/0004_fts.sql` pattern — a virtual table plus insert/delete/update triggers, all raw SQL since Drizzle does not model virtual tables. Two indexes are needed, because users search for both a case and a programme:

- `cases_fts` over `display_title`, `summary`, and the concatenated `case_people.name` values
- `media_fts` over `title` and `overview`

FTS5 is the right tool here for the same reason it was in dinnertable: it ships inside SQLite, needs no external service, and the corpus is small.

## How Heat is computed

`cases.last_coverage_at` and `cases.source_count_90d` are maintained by ingest. The decay is applied at read time:

```sql
SELECT *,
       (1.0 + 2.0 * source_count_90d) *
       EXP(-(unixepoch() - last_coverage_at) / 7776000.0) AS heat   -- 90d in seconds
FROM cases
WHERE merged_into IS NULL
ORDER BY heat DESC
```

Storing inputs rather than the score means Heat never goes stale between cron runs, while keeping the sort cheap. Revisit only if the case count grows far beyond the current ~220.

`exp()` and `unixepoch()` were verified against D1's SQLite build rather than assumed — both are present, and `unixepoch()` returns **seconds**, matching Drizzle's `mode: 'timestamp'`. Do not switch those columns to `timestamp_ms` without changing the query.

## Migrating `data/episodes.json`

1. Insert the 5 shows that actually carry episodes as `sources` with `is_curated = true`. Forensic Files, Cold Case Files and American Greed return nothing in the window and should not be seeded blind.
2. Insert all 261 episodes as `media_items` with `extraction_status = 'pending'`.
3. Run the extraction pass. It sets `duplicate_of` for the 34 within-source duplicates and mints `cases` — provisional unless confidently resolved.
4. Backfill `last_coverage_at` and `source_count_90d`.
5. `localStorage` viewed state is **not** migrated. It is per-device and unattributable to a user account; the loss is one boolean per episode.
