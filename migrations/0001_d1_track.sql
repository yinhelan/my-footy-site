-- D1 schema for odds snapshots / tracking

CREATE TABLE IF NOT EXISTS track_match (
  match_id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS odds_snapshot (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  source TEXT NOT NULL,
  league_key TEXT,
  season TEXT,
  api_fixture_id TEXT,
  bookmaker_id TEXT,
  payload_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_odds_snapshot_match_time ON odds_snapshot(match_id, created_at);
