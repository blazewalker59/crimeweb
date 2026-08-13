-- FTS5 search over Cases and Media Items.
--
-- Drizzle does not model virtual tables, so this migration and the queries
-- against it are raw SQL — the same approach dinnertable takes in
-- drizzle/0004_fts.sql. FTS5 ships inside SQLite, needs no external service,
-- and the corpus is small.
--
-- Both indexes are external-content (`content=`), so the FTS tables store no
-- duplicate text; the triggers keep them in step with the base tables.

CREATE VIRTUAL TABLE `cases_fts` USING fts5(
  `display_title`, `summary`, `location`,
  content=`cases`, content_rowid=`rowid`
);
--> statement-breakpoint
CREATE TRIGGER `cases_fts_ai` AFTER INSERT ON `cases` BEGIN
  INSERT INTO `cases_fts`(rowid, display_title, summary, location)
  VALUES (new.rowid, new.display_title, new.summary, new.location);
END;
--> statement-breakpoint
CREATE TRIGGER `cases_fts_ad` AFTER DELETE ON `cases` BEGIN
  INSERT INTO `cases_fts`(`cases_fts`, rowid, display_title, summary, location)
  VALUES ('delete', old.rowid, old.display_title, old.summary, old.location);
END;
--> statement-breakpoint
CREATE TRIGGER `cases_fts_au` AFTER UPDATE ON `cases` BEGIN
  INSERT INTO `cases_fts`(`cases_fts`, rowid, display_title, summary, location)
  VALUES ('delete', old.rowid, old.display_title, old.summary, old.location);
  INSERT INTO `cases_fts`(rowid, display_title, summary, location)
  VALUES (new.rowid, new.display_title, new.summary, new.location);
END;
--> statement-breakpoint
CREATE VIRTUAL TABLE `media_fts` USING fts5(
  `title`, `overview`,
  content=`media_items`, content_rowid=`rowid`
);
--> statement-breakpoint
CREATE TRIGGER `media_fts_ai` AFTER INSERT ON `media_items` BEGIN
  INSERT INTO `media_fts`(rowid, title, overview) VALUES (new.rowid, new.title, new.overview);
END;
--> statement-breakpoint
CREATE TRIGGER `media_fts_ad` AFTER DELETE ON `media_items` BEGIN
  INSERT INTO `media_fts`(`media_fts`, rowid, title, overview)
  VALUES ('delete', old.rowid, old.title, old.overview);
END;
--> statement-breakpoint
CREATE TRIGGER `media_fts_au` AFTER UPDATE ON `media_items` BEGIN
  INSERT INTO `media_fts`(`media_fts`, rowid, title, overview)
  VALUES ('delete', old.rowid, old.title, old.overview);
  INSERT INTO `media_fts`(rowid, title, overview) VALUES (new.rowid, new.title, new.overview);
END;
--> statement-breakpoint
-- Backfill whatever already exists.
INSERT INTO `cases_fts`(rowid, display_title, summary, location)
  SELECT rowid, display_title, summary, location FROM `cases`;
--> statement-breakpoint
INSERT INTO `media_fts`(rowid, title, overview)
  SELECT rowid, title, overview FROM `media_items`;
