CREATE TABLE IF NOT EXISTS lesson_card_overrides (
  lesson_id TEXT NOT NULL CHECK (lesson_id = 'sakurakou-2026-07-21'),
  card_id INTEGER NOT NULL CHECK (card_id BETWEEN 1 AND 27),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0 CHECK (deleted IN (0, 1)),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (lesson_id, card_id)
);
