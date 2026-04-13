CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  notes TEXT,
  priority TEXT NOT NULL DEFAULT 'medium',
  starts_at INTEGER,
  ends_at INTEGER,
  is_all_day INTEGER NOT NULL DEFAULT 0,
  rrule TEXT,
  exceptions TEXT NOT NULL DEFAULT '[]',
  completed INTEGER NOT NULL DEFAULT 0,
  completed_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_items_starts_at ON items (starts_at);
CREATE INDEX IF NOT EXISTS idx_items_completed ON items (completed);
