// Exactly seven guarded tile-data updates. Text, IDs, ordering and all other
// teaching rows remain byte-for-byte unchanged. No learner API is accessed.
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import data from "../content/october-15.json" with { type: "json" };
import { normalizeTileQuestion, tileOptions, tileQuestionSignature } from "../app/lib/tile-question.mjs";
import { SITE_ORIGIN } from "../app/lib/site-origin.mjs";
const [snapshotPath, outputPath] = process.argv.slice(2);
assert.ok(snapshotPath && outputPath, "Pass the independent before snapshot and output path");
const before = JSON.parse(await readFile(snapshotPath, "utf8"));
const get = async () => { const r = await fetch(SITE_ORIGIN + "/api/notebook", { signal: AbortSignal.timeout(30000) }); assert.ok(r.ok); return r.json(); };
const live = await get(), changes = [];
for (const card of data.cards.filter(c => c.tileQuestion?.boardScene)) {
  const old = before.notebook.cards.find(c => c.id === card.id), current = live.cards.find(c => c.id === card.id);
  assert.ok(old && current && !old.deleted && !current.deleted, card.id);
  assert.deepEqual(current, old, "Concurrent update: " + card.id);
  assert.ok(old.tileQuestion?.board, "Expected old source screenshot: " + card.id);
  assert.deepEqual(tileOptions(old.tileQuestion), tileOptions(card.tileQuestion));
  assert.deepEqual(old.tileQuestion.naga, card.tileQuestion.naga);
  assert.deepEqual(old.tileQuestion.correctTiles, card.tileQuestion.correctTiles);
  const { board, ...same } = old.tileQuestion;
  const next = normalizeTileQuestion({ ...same, boardScene: card.tileQuestion.boardScene, previousBoardImageUrl: board.imageUrl });
  assert.ok(next, card.id); assert.equal(tileQuestionSignature(next), tileQuestionSignature(old.tileQuestion));
  changes.push({ id: card.id, lessonId: old.lessonId, kind: old.kind, question: old.question, answer: old.answer, tileQuestion: next, expected: { kind: old.kind, question: old.question, answer: old.answer, tileQuestion: old.tileQuestion } });
}
assert.equal(changes.length, 7);
await writeFile(outputPath, JSON.stringify(changes, null, 2) + "\n");
if (process.argv.includes("--apply")) {
  for (const change of changes) {
    const r = await fetch(`${SITE_ORIGIN}/api/lessons/${change.lessonId}/cards/${change.id}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(change), signal: AbortSignal.timeout(30000) });
    assert.equal(r.status, 200, change.id + ": conflict or save failure");
    const saved = (await get()).cards.find(c => c.id === change.id);
    assert.deepEqual(saved.tileQuestion, change.tileQuestion, change.id + ": readback mismatch");
    for (const k of ["id", "lessonId", "kind", "question", "answer", "sortOrder", "deleted"]) assert.deepEqual(saved[k], before.notebook.cards.find(c => c.id === change.id)[k], k);
  }
}
console.log(JSON.stringify({ planned: changes.length, applied: process.argv.includes("--apply") ? changes.length : 0 }));
