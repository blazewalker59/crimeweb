import { createServerFn } from "@tanstack/react-start";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { mediaItems, sources } from "@/db/schema";

export interface SourceOption {
  id: string;
  name: string;
  mediaCount: number;
}

/** Sources that actually have coverage, for the timeline filter. */
export const listSources = createServerFn({ method: "GET" }).handler(
  async (): Promise<Array<SourceOption>> => {
    const rows = await db()
      .select({
        id: sources.id,
        name: sources.name,
        mediaCount: sql<number>`count(${mediaItems.id})`.as("mediaCount"),
      })
      .from(sources)
      .leftJoin(mediaItems, eq(mediaItems.sourceId, sources.id))
      .groupBy(sources.id)
      .having(sql`count(${mediaItems.id}) > 0`)
      .orderBy(desc(sql`mediaCount`));
    return rows;
  },
);
