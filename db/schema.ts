export const lessonCardOverridesSchema = `
CREATE TABLE IF NOT EXISTS lesson_card_overrides (
  lesson_id TEXT NOT NULL,
  card_id INTEGER NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (lesson_id, card_id)
)
`;

export const lessonResourcesSchema = `
CREATE TABLE IF NOT EXISTS lesson_resources (
  resource_id TEXT PRIMARY KEY,
  lesson_id TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('link', 'image')),
  label TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)
`;
