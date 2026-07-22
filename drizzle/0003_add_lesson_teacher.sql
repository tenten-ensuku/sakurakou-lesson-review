ALTER TABLE lesson_metadata_overrides ADD COLUMN teacher TEXT NOT NULL DEFAULT '';
ALTER TABLE notebook_lessons ADD COLUMN teacher TEXT NOT NULL DEFAULT '';
