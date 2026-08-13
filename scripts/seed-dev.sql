-- DEV SEED — temporary. Real data arrives via ingest (#22) and extraction (#23);
-- delete this once those land. Rerunnable.
--
-- Rows are drawn from the verified ground truth in issue #9: two real
-- convergences, including the Menendez pair that the v1 fuzzy matcher scored
-- at zero despite both titles sharing the literal string.

DELETE FROM coverage;
DELETE FROM media_items;
DELETE FROM cases;
DELETE FROM sources;

INSERT INTO sources (id, tmdb_id, name, kind, is_curated, created_at) VALUES
  ('src_dateline', 78,   'Dateline', 'network', 1, unixepoch()),
  ('src_2020',     2035, '20/20',    'network', 1, unixepoch());

INSERT INTO cases (id, display_title, summary, location, occurred_year, is_provisional,
                   enrichment_status, last_coverage_at, source_count_90d, created_at, updated_at) VALUES
  ('case_menendez', 'Menendez brothers',
   'Jose and Kitty Menendez are killed in their Beverly Hills home by their sons Lyle and Erik.',
   'Beverly Hills, California', 1989, 0, 'none', unixepoch('2024-11-08'), 2, unixepoch(), unixepoch()),
  ('case_sementilli', 'Murder of Fabio Sementilli',
   'A celebrity hairdresser is killed in the backyard of his Woodland Hills home.',
   'Woodland Hills, California', 2017, 0, 'none', unixepoch('2025-04-11'), 2, unixepoch(), unixepoch()),
  ('case_provisional', 'Woman shot outside her workplace',
   NULL, NULL, NULL, 1, 'none', unixepoch('2026-01-16'), 1, unixepoch(), unixepoch());

INSERT INTO media_items (id, source_id, tmdb_id, kind, title, overview, released_at,
                         season_number, episode_number, extraction_status, ingested_at) VALUES
  ('mi_men_dl',  'src_dateline', 5737433, 'episode', 'The Menendez Brothers: Chance at Freedom',
   'Latest developments and new interviews in the high-profile murder trial of Lyle and Erik Menendez.',
   unixepoch('2024-11-08'), 33, 8, 'extracted', unixepoch()),
  ('mi_men_2020','src_2020',     5685850, 'episode', 'The Menendez Brothers: Reversal of Fortune?',
   'The episode delves into the details of the crime, the investigation, and the subsequent trials.',
   unixepoch('2024-10-18'), 47, 4, 'extracted', unixepoch()),
  ('mi_sem_2020','src_2020',     6126527, 'episode', 'Sex, Knives, and Videotape',
   'A beloved celebrity hairstylist is found murdered in his own home in 2017.',
   unixepoch('2025-04-11'), 47, 22, 'extracted', unixepoch()),
  ('mi_sem_dl',  'src_dateline', 6125877, 'episode', 'The Widow of Woodland Hills',
   'Celebrity hairdresser Fabio Sementilli is brutally murdered in his backyard.',
   unixepoch('2025-04-11'), 33, 30, 'extracted', unixepoch()),
  ('mi_ride',    'src_2020',     6771806, 'episode', 'Ride or Die',
   'After a 24-year-old mother is brutally shot and killed outside her workplace.',
   unixepoch('2026-01-16'), 48, 12, 'extracted', unixepoch());

INSERT INTO coverage (id, media_item_id, case_id, confidence, provenance, status, created_at) VALUES
  ('cov_men_dl',   'mi_men_dl',   'case_menendez',    0.97, 'llm', 'confirmed', unixepoch()),
  ('cov_men_2020', 'mi_men_2020', 'case_menendez',    0.96, 'llm', 'confirmed', unixepoch()),
  ('cov_sem_2020', 'mi_sem_2020', 'case_sementilli',  0.91, 'llm', 'confirmed', unixepoch()),
  ('cov_sem_dl',   'mi_sem_dl',   'case_sementilli',  0.93, 'llm', 'confirmed', unixepoch()),
  ('cov_ride',     'mi_ride',     'case_provisional', 0.41, 'llm', 'proposed',  unixepoch());
