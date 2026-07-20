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
