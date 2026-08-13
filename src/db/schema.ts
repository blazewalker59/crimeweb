import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  unique,
} from "drizzle-orm/sqlite-core";

/**
 * CrimeWeb v2 schema. See docs/v2-schema.md for the rationale behind each
 * shape, and CONTEXT.md for the vocabulary (Case, Case Series, Coverage,
 * Provisional Case, Merge, Media Item, Source).
 *
 * Timestamps are `mode: "timestamp"`, i.e. Unix SECONDS — matching
 * `unixepoch()`, which the Heat query uses. Switching any of them to
 * `timestamp_ms` silently breaks ranking.
 */

// ── Better Auth core tables ──────────────────────────────────────────────────
// Hand-authored to the documented v1.x SQLite/D1 shape, as dinnertable does.
// Consumed in #21; present here because the case graph references user.id.

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp" }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp" }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
});

// ── Catalogue ────────────────────────────────────────────────────────────────

export const sources = sqliteTable("sources", {
  id: text("id").primaryKey(),
  tmdbId: integer("tmdb_id").notNull().unique(),
  name: text("name").notNull(),
  kind: text("kind", { enum: ["network", "streamer"] }).notNull(),
  // Curated seed sources are a permanent floor; discovery never drops them.
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
    seasonNumber: integer("season_number"),
    episodeNumber: integer("episode_number"),

    // Within-source duplicates: 13% of the v1 catalogue, 54% of The First 48.
    duplicateOf: text("duplicate_of"),

    // Hash of the TMDb title+overview last extracted from, so ingest can detect
    // volunteer-edited upstream metadata without re-extracting over human work.
    contentHash: text("content_hash"),

    extractionStatus: text("extraction_status", {
      enum: ["pending", "extracted", "failed", "stale"],
    })
      .notNull()
      .default("pending"),
    extractedAt: integer("extracted_at", { mode: "timestamp" }),
    ingestedAt: integer("ingested_at", { mode: "timestamp" }).notNull(),
    refreshedAt: integer("refreshed_at", { mode: "timestamp" }),
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
    // Opaque and locally minted. Stable whether or not Wikidata gains an item.
    id: text("id").primaryKey(),
    displayTitle: text("display_title").notNull(), // the only required attribute
    summary: text("summary"),

    // Nullable by necessity: only 8% of source metadata carries both a
    // location and a year.
    location: text("location"),
    occurredOn: integer("occurred_on", { mode: "timestamp" }),
    occurredYear: integer("occurred_year"),

    isProvisional: integer("is_provisional", { mode: "boolean" }).notNull().default(true),

    // Enrichment only, never a key. Expected ~92% null, human-confirmed.
    wikidataQid: text("wikidata_qid"),
    wikipediaTitle: text("wikipedia_title"),
    enrichmentStatus: text("enrichment_status", {
      enum: ["none", "proposed", "confirmed"],
    })
      .notNull()
      .default("none"),

    // Heat INPUTS, not Heat itself — decay is applied at query time so the
    // value never goes stale between cron runs.
    lastCoverageAt: integer("last_coverage_at", { mode: "timestamp" }),
    sourceCount90d: integer("source_count_90d").notNull().default(0),

    // Non-null means this case was merged away; reads follow the chain.
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

/**
 * Many-to-many by necessity: one episode can cover two unrelated cases (The
 * First 48's "Circle of Friends & Rearview Murder" covers Tulsa AND Mobile).
 *
 * Targets either a Case or a Case Series — exactly one. Drizzle cannot express
 * CHECK constraints, so that rule is added by hand to the generated migration,
 * inline in CREATE TABLE. SQLite has no ALTER TABLE ADD CONSTRAINT.
 */
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
    // Drives the correction surface's review queue: least certain first.
    index("coverage_status_idx").on(t.status, t.confidence),
  ],
);

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
    detail: text("detail", { mode: "json" }), // before/after, for reversal
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
