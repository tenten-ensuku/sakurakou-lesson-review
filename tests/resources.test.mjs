import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { NOTEBOOK_SCHEMA_SQL } from "../db/schema.mjs";

test("lesson reference materials have durable schema and public API wiring", () => {
  const schema = NOTEBOOK_SCHEMA_SQL.join("\n");
  const worker = readFileSync("worker/admin-api.mjs", "utf8");

  assert.match(schema, /CREATE TABLE IF NOT EXISTS lesson_resources/);
  assert.match(schema, /kind IN \('link', 'image'\)/);
  assert.match(worker, /\/resources/);
  assert.match(worker, /resources:\(resources\.results/);
});

test("the lesson list hides the reference button when a lesson has no materials", () => {
  const page = readFileSync("app/page.tsx", "utf8");

  assert.match(page, /lessonResources\.length > 0/);
  assert.match(page, /reference-material-button/);
  assert.match(page, /参考資料/);
});
