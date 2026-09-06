CREATE TABLE IF NOT EXISTS theory_catalog (id TEXT PRIMARY KEY, data TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS review_checks (id TEXT PRIMARY KEY, data TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS card_order (lesson_id TEXT NOT NULL, card_key TEXT NOT NULL, sort_order INTEGER NOT NULL, PRIMARY KEY(lesson_id,card_key));
CREATE TABLE IF NOT EXISTS learning_profiles (token_hash TEXT PRIMARY KEY, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS learning_events (profile_hash TEXT NOT NULL, event_id TEXT NOT NULL, data TEXT NOT NULL, event_at TEXT NOT NULL, PRIMARY KEY(profile_hash,event_id));
CREATE INDEX IF NOT EXISTS learning_event_profile_idx ON learning_events(profile_hash,event_at);
CREATE TABLE IF NOT EXISTS teacher_shares (share_hash TEXT PRIMARY KEY, profile_hash TEXT NOT NULL, revoked INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS teacher_share_profile_idx ON teacher_shares(profile_hash);
