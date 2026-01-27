-- CrimeWeb Seed Data
-- Initial shows to track

-- Note: TMDb IDs need to be looked up and verified
-- These are placeholder values that should be updated with real TMDb IDs

INSERT INTO shows (tmdb_id, name, network, overview, status) VALUES
  (4614, 'Dateline NBC', 'NBC', 'Dateline NBC is a weekly American television newsmagazine series. It is the longest-running series in NBC primetime history.', 'Returning Series'),
  (4619, '20/20', 'ABC', '20/20 is an American television newsmagazine that has been broadcast on ABC since June 6, 1978.', 'Returning Series'),
  (4613, '48 Hours', 'CBS', '48 Hours is an American television news magazine and documentary program.', 'Returning Series'),
  (1581, 'Forensic Files', 'HLN', 'Forensic Files is an American documentary television series that reveals how forensic science is used to solve violent crimes.', 'Ended'),
  (10882, 'Cold Case Files', 'A&E', 'Cold Case Files is a documentary television series that uses re-enactments, archival news footage and interviews to profile criminal cases that have been solved.', 'Returning Series'),
  (1608, 'Snapped', 'Oxygen', 'Snapped explores the fascinating and terrifying tales of women pushed to the breaking point and commit murder.', 'Returning Series'),
  (20415, 'The First 48', 'A&E', 'The First 48 takes viewers behind the scenes of real homicide investigations.', 'Returning Series'),
  (33742, 'American Greed', 'CNBC', 'American Greed is a documentary television series that recounts tales of white-collar crime.', 'Returning Series')
ON CONFLICT (tmdb_id) DO UPDATE SET
  name = EXCLUDED.name,
  network = EXCLUDED.network,
  overview = EXCLUDED.overview,
  status = EXCLUDED.status;
