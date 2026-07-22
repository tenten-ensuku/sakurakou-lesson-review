CREATE TABLE IF NOT EXISTS lesson_metadata_overrides (
  lesson_id TEXT PRIMARY KEY,
  lesson_date TEXT NOT NULL,
  title TEXT NOT NULL,
  video_url TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notebook_lessons (
  lesson_id TEXT PRIMARY KEY,
  lesson_date TEXT NOT NULL,
  title TEXT NOT NULL,
  video_url TEXT NOT NULL DEFAULT '',
  deleted INTEGER NOT NULL DEFAULT 0 CHECK (deleted IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notebook_cards (
  card_id TEXT PRIMARY KEY,
  lesson_id TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('question', 'section', 'note')),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0 CHECK (deleted IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
