import { env } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";

/**
 * Things only a real SQLite can tell you.
 *
 * Each of these corresponds to something that already went wrong or nearly did
 * during this build, and that a hand-written fake would have accepted.
 */

const now = () => Math.floor(Date.now() / 1000);

async function seedCase(id: string, title = "Test case") {
  await env.DB.prepare(
    `INSERT INTO cases (id, display_title, is_provisional, enrichment_status,
       source_count_90d, created_at, updated_at)
     VALUES (?, ?, 0, 'none', 0, ?, ?)`,
  )
    .bind(id, title, now(), now())
    .run();
}

async function seedMedia(id: string, title = "Test episode", overview: string | null = null) {
  await env.DB.prepare(
    `INSERT INTO sources (id, tmdb_id, name, kind, is_curated, created_at)
     VALUES ('src_t', 1, 'Test Source', 'network', 1, ?)
     ON CONFLICT DO NOTHING`,
  )
    .bind(now())
    .run();
  await env.DB.prepare(
    `INSERT INTO media_items (id, source_id, tmdb_id, kind, title, overview,
       extraction_status, ingested_at)
     VALUES (?, 'src_t', ?, 'episode', ?, ?, 'pending', ?)`,
  )
    .bind(id, Math.floor(Math.random() * 1e9), title, overview, now())
    .run();
}

beforeEach(async () => {
  for (const t of [
    "coverage",
    "case_people",
    "case_series_members",
    "case_series",
    "media_items",
    "cases",
    "sources",
  ]) {
    await env.DB.prepare(`DELETE FROM ${t}`).run();
  }
});

describe("coverage CHECK constraint", () => {
  // SQLite has no ALTER TABLE ADD CONSTRAINT, so this had to be inlined into
  // CREATE TABLE by hand-editing the generated migration. A fake would happily
  // accept all three of these.
  beforeEach(async () => {
    await seedCase("case_a");
    await seedMedia("mi_a");
    await env.DB.prepare(
      `INSERT INTO case_series (id, display_title, created_at) VALUES ('ser_a','S',?)
       ON CONFLICT DO NOTHING`,
    )
      .bind(now())
      .run();
  });

  const insert = (caseId: string | null, seriesId: string | null) =>
    env.DB.prepare(
      `INSERT INTO coverage (id, media_item_id, case_id, series_id, provenance, status, created_at)
       VALUES ('cov_x', 'mi_a', ?, ?, 'llm', 'proposed', ?)`,
    )
      .bind(caseId, seriesId, now())
      .run();

  it("accepts exactly one target", async () => {
    await expect(insert("case_a", null)).resolves.toBeDefined();
  });

  it("rejects both targets", async () => {
    await expect(insert("case_a", "ser_a")).rejects.toThrow(/CHECK constraint/i);
  });

  it("rejects neither target", async () => {
    await expect(insert(null, null)).rejects.toThrow(/CHECK constraint/i);
  });
});

describe("Heat query", () => {
  // Depends on exp() and unixepoch() existing, and on unixepoch() returning
  // SECONDS to match Drizzle's timestamp mode. Switching the columns to
  // timestamp_ms would silently produce garbage rankings, which no type
  // checker or fake would catch.
  it("decays with age and rises with distinct sources", async () => {
    await seedCase("case_recent", "Recent");
    await seedCase("case_old", "Old");
    const day = 86400;
    await env.DB.prepare(
      `UPDATE cases SET last_coverage_at = ?, source_count_90d = 2 WHERE id = 'case_recent'`,
    )
      .bind(now() - 5 * day)
      .run();
    await env.DB.prepare(
      `UPDATE cases SET last_coverage_at = ?, source_count_90d = 2 WHERE id = 'case_old'`,
    )
      .bind(now() - 400 * day)
      .run();

    const { results } = await env.DB.prepare(
      `SELECT id, (1.0 + 2.0 * source_count_90d)
                  * exp(-(unixepoch() - coalesce(last_coverage_at,0)) / 7776000.0) AS heat
       FROM cases ORDER BY heat DESC`,
    ).all<{ id: string; heat: number }>();

    expect(results[0].id).toBe("case_recent");
    expect(results[0].heat).toBeGreaterThan(results[1].heat);
    // Sanity: a 5-day-old case with 2 sources should still be a live number,
    // not zero or NaN.
    expect(results[0].heat).toBeGreaterThan(1);
    expect(Number.isFinite(results[1].heat)).toBe(true);
  });
});

describe("FTS5 indexes", () => {
  // External-content FTS tables only stay in step because of triggers. A fake
  // has no triggers at all.
  it("indexes on insert, updates on update, and clears on delete", async () => {
    await seedMedia("mi_fts", "The Widow of Woodland Hills", "A celebrity hairdresser is killed.");

    const found = await env.DB.prepare(
      `SELECT m.title FROM media_fts f JOIN media_items m ON m.rowid = f.rowid
       WHERE media_fts MATCH 'hairdresser'`,
    ).all<{ title: string }>();
    expect(found.results).toHaveLength(1);

    await env.DB.prepare(
      `UPDATE media_items SET overview = 'A florist.' WHERE id = 'mi_fts'`,
    ).run();
    const stale = await env.DB.prepare(
      `SELECT count(*) AS n FROM media_fts WHERE media_fts MATCH 'hairdresser'`,
    ).first<{ n: number }>();
    expect(stale?.n).toBe(0);

    await env.DB.prepare(`DELETE FROM media_items WHERE id = 'mi_fts'`).run();
    const gone = await env.DB.prepare(
      `SELECT count(*) AS n FROM media_fts WHERE media_fts MATCH 'florist'`,
    ).first<{ n: number }>();
    expect(gone?.n).toBe(0);
  });
});

describe("foreign keys", () => {
  // wrangler d1 export emits tables alphabetically, not in dependency order.
  // Importing it verbatim fails here and D1 rolls the whole database back —
  // which is exactly what happened during the production import.
  it("rejects coverage pointing at a case that does not exist", async () => {
    await seedMedia("mi_fk");
    await expect(
      env.DB.prepare(
        `INSERT INTO coverage (id, media_item_id, case_id, provenance, status, created_at)
         VALUES ('cov_fk','mi_fk','case_nonexistent','llm','proposed',?)`,
      )
        .bind(now())
        .run(),
    ).rejects.toThrow(/FOREIGN KEY/i);
  });
});
