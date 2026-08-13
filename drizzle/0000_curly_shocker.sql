CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `case_people` (
	`id` text PRIMARY KEY NOT NULL,
	`case_id` text NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`provenance` text NOT NULL,
	FOREIGN KEY (`case_id`) REFERENCES `cases`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `case_people_case_idx` ON `case_people` (`case_id`);--> statement-breakpoint
CREATE TABLE `case_series` (
	`id` text PRIMARY KEY NOT NULL,
	`display_title` text NOT NULL,
	`summary` text,
	`created_by` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `case_series_members` (
	`series_id` text NOT NULL,
	`case_id` text NOT NULL,
	`added_by` text,
	`added_at` integer NOT NULL,
	PRIMARY KEY(`series_id`, `case_id`),
	FOREIGN KEY (`series_id`) REFERENCES `case_series`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`case_id`) REFERENCES `cases`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`added_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `cases` (
	`id` text PRIMARY KEY NOT NULL,
	`display_title` text NOT NULL,
	`summary` text,
	`location` text,
	`occurred_on` integer,
	`occurred_year` integer,
	`is_provisional` integer DEFAULT true NOT NULL,
	`wikidata_qid` text,
	`wikipedia_title` text,
	`enrichment_status` text DEFAULT 'none' NOT NULL,
	`last_coverage_at` integer,
	`source_count_90d` integer DEFAULT 0 NOT NULL,
	`merged_into` text,
	`created_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `cases_heat_idx` ON `cases` (`last_coverage_at`,`source_count_90d`);--> statement-breakpoint
CREATE INDEX `cases_provisional_idx` ON `cases` (`is_provisional`);--> statement-breakpoint
CREATE INDEX `cases_merged_idx` ON `cases` (`merged_into`);--> statement-breakpoint
CREATE TABLE `coverage` (
	`id` text PRIMARY KEY NOT NULL,
	`media_item_id` text NOT NULL,
	`case_id` text,
	`series_id` text,
	`confidence` real,
	`provenance` text NOT NULL,
	`status` text NOT NULL,
	`created_by` text,
	`created_at` integer NOT NULL,
	`reviewed_by` text,
	`reviewed_at` integer,
	FOREIGN KEY (`media_item_id`) REFERENCES `media_items`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`case_id`) REFERENCES `cases`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`series_id`) REFERENCES `case_series`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewed_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	-- Hand-added: Coverage targets exactly one of a Case or a Case Series.
	-- Drizzle cannot express CHECK, and SQLite has no ALTER TABLE ADD
	-- CONSTRAINT, so it must live inline here. Adding it later would need
	-- SQLite's twelve-step table rebuild. See docs/v2-schema.md.
	CHECK ((`case_id` IS NOT NULL) <> (`series_id` IS NOT NULL))
);
--> statement-breakpoint
CREATE INDEX `coverage_case_idx` ON `coverage` (`case_id`);--> statement-breakpoint
CREATE INDEX `coverage_media_idx` ON `coverage` (`media_item_id`);--> statement-breakpoint
CREATE INDEX `coverage_status_idx` ON `coverage` (`status`,`confidence`);--> statement-breakpoint
CREATE TABLE `graph_audit` (
	`id` text PRIMARY KEY NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`action` text NOT NULL,
	`actor_id` text,
	`detail` text,
	`at` integer NOT NULL,
	FOREIGN KEY (`actor_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `audit_entity_idx` ON `graph_audit` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE TABLE `media_items` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`tmdb_id` integer NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`overview` text,
	`still_path` text,
	`released_at` integer,
	`season_number` integer,
	`episode_number` integer,
	`duplicate_of` text,
	`content_hash` text,
	`extraction_status` text DEFAULT 'pending' NOT NULL,
	`extracted_at` integer,
	`ingested_at` integer NOT NULL,
	`refreshed_at` integer,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `media_released_idx` ON `media_items` (`released_at`);--> statement-breakpoint
CREATE INDEX `media_extraction_idx` ON `media_items` (`extraction_status`);--> statement-breakpoint
CREATE UNIQUE INDEX `media_tmdb_kind` ON `media_items` (`tmdb_id`,`kind`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE TABLE `sources` (
	`id` text PRIMARY KEY NOT NULL,
	`tmdb_id` integer NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`is_curated` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sources_tmdb_id_unique` ON `sources` (`tmdb_id`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `user_media_state` (
	`user_id` text NOT NULL,
	`media_item_id` text NOT NULL,
	`viewed_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `media_item_id`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`media_item_id`) REFERENCES `media_items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `watchlist` (
	`user_id` text NOT NULL,
	`case_id` text NOT NULL,
	`added_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `case_id`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`case_id`) REFERENCES `cases`(`id`) ON UPDATE no action ON DELETE cascade
);
