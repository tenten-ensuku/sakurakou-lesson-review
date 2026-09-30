import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import data from "../content/september-30.json" with { type: "json" };
import evaluations from "../content/september-30-naga.json" with { type: "json" };
import evidence from "../docs/september-30-naga-provenance.json" with { type: "json" };
import { nagaDisplayRows, nagaSourceUrl, normalizeNagaEvaluation } from "../app/lib/naga-evaluation.mjs";
import { normalizeTileQuestion, savedTilePick, tileAnswer, tileOptions, tileQuestionSignature } from "../app/lib/tile-question.mjs";
import { handleAdminApi } from "../worker/admin-api.mjs";
import { NOTEBOOK_SCHEMA_SQL } from "../db/schema.mjs";
const card = (id) => data.cards.find(c => c.id === "card-20260930-" + id);
const clone = (v) => structuredClone(v);

test("NAGA uses seven exactly matched source decisions, six discards and one explicitly pre-pon call", () => {
  assert.equal(Object.keys(evaluations).length, 7);
  assert.equal(evidence.targetSeat, 3);
  assert.equal(evidence.networkBudget.requests, 1);
  assert.equal(evidence.networkBudget.usedCachedReport, true);
  assert.match(evidence.generationRuleVersion, /meld-replay-v/);
  assert.equal(evidence.reportSha256, "dd9973467c777a93cf7d7d9490a51d46d28849e09062d15407718d692a866d53");
  for (const [id, naga] of Object.entries(evaluations)) {
    const q = card(id).tileQuestion, proof = evidence.questions.find(p => p.appId === card(id).id);
    assert.deepEqual(normalizeTileQuestion(q), q);
    assert.deepEqual(q.naga, naga);
    assert.deepEqual(naga.handSnapshot, tileOptions(q));
    assert.deepEqual(naga.models.map(m => m.name), ["ニシキ", "カガシ"]);
    assert.equal(proof.handMatchPercent, 100); assert.equal(proof.drawMatched, true);
    assert.equal(proof.validation.valid, true);
    assert.equal(nagaSourceUrl(naga), proof.sourceUrl);
    assert.deepEqual(proof.instructorAnswers, q.correctTiles);
  }
  assert.equal(Object.values(evaluations).filter(v => v.kind === "discard").length, 6);
  const call = evaluations["four-pin-pon"];
  assert.equal(call.kind, "call");
  assert.deepEqual(call.models[0].rates, { pon: 70.59, pass: 29.4 });
  assert.deepEqual(call.models[1].rates, { pon: 77.02, pass: 22.97 });
  assert.equal("6p" in call.models[0].rates, false);
  assert.match(evidence.questions.find(p => p.kind === "call").limitation, /no hypothetical post-pon/);
});

test("source percentages, honor mapping and red-five mapping remain explicit and unrounded", () => {
  const west = evaluations["two-riichi-west"];
  assert.equal(west.models[0].rates["3z"], 96.89);
  assert.equal(west.models[1].rates["3z"], 86.87);
  assert.equal(west.models[0].rates["0s"], 1.92);
  const afterPon = evaluations["pon-preserve-head"];
  assert.equal(afterPon.models[0].rates["1s"], 74.55);
  assert.equal(afterPon.models[1].rates["4z"], 51.57);
  assert.equal(afterPon.models[0].rates["5z"], 0.03); // 発, not 白
  assert.equal(afterPon.models[1].rates["5z"], 0.01);
  const first = evaluations["safe-five-pin"];
  assert.equal(first.models[0].rates["5p"], 72.38);
  assert.equal(first.models[1].rates["5p"], 68.06);
  assert.ok(first.handSnapshot.includes("0m"));
  assert.ok(first.handSnapshot.includes("5s")); assert.ok(!first.handSnapshot.includes("0s"));
});

test("NAGA metadata cannot change teacher grading, including allowed low-probability alternatives", () => {
  for (const q of data.cards.filter(c => c.tileQuestion).map(c => c.tileQuestion)) {
    const withoutNaga = { ...q }; delete withoutNaga.naga;
    for (const i of tileOptions(q).keys()) assert.deepEqual(tileAnswer(q, i), tileAnswer(withoutNaga, i));
    assert.equal(tileQuestionSignature(q), tileQuestionSignature(withoutNaga));
  }
  const head = card("keep-only-head").tileQuestion;
  assert.equal(head.naga.models[0].rates["9p"], 0.02);
  assert.equal(tileAnswer(head, tileOptions(head).indexOf("9p")).correct, true);
  const pon = card("pon-preserve-head").tileQuestion;
  assert.equal(tileAnswer(pon, tileOptions(pon).indexOf("4z")).correct, true);
  assert.equal(tileAnswer(pon, tileOptions(pon).indexOf("1s")).correct, false);
});

test("invalid or stale NAGA payloads are rejected instead of showing unrelated recommendation bars", () => {
  const q = card("safe-five-pin").tileQuestion, options = tileOptions(q), valid = q.naga;
  const bad = [];
  let n = clone(valid); n.handSnapshot[0] = "6m"; bad.push(n);
  n = clone(valid); n.models[0].rates["5p"] = 101; bad.push(n);
  n = clone(valid); n.models[0].rates["5p"] = NaN; bad.push(n);
  n = clone(valid); delete n.models[0].rates["5p"]; bad.push(n);
  n = clone(valid); n.models[0].rates["1z"] = 10; bad.push(n);
  n = clone(valid); n.models[1].name = n.models[0].name; bad.push(n);
  n = clone(valid); n.reportId = "<script>"; bad.push(n);
  n = clone(valid); n.tw = 4; bad.push(n);
  n = clone(valid); n.ts = -1; bad.push(n);
  n = clone(valid); n.tv = 1.5; bad.push(n);
  n = clone(valid); n.previousHandSnapshot[11] = "4s"; bad.push(n);
  n = clone(valid); n.previousHandSnapshot = [...options]; bad.push(n);
  n = clone(valid); n.kind = "call"; bad.push(n);
  for (const value of bad) {
    assert.equal(normalizeNagaEvaluation(value, options), null);
    assert.equal(normalizeTileQuestion({ ...q, naga: value }), null);
  }
  assert.equal(normalizeNagaEvaluation(valid, undefined), null);
  assert.ok(normalizeTileQuestion({ hand: ["1m"], correctTiles: ["1m"] }));
});

test("only the verified red/ordinary-five correction preserves older saved tile picks", () => {
  const q = card("safe-five-pin").tileQuestion, key = "legacy-pick";
  const oldSignature = JSON.stringify([q.naga.previousHandSnapshot, q.correctTiles, q.board.imageUrl]);
  const session = { tilePicks: { [key]: 5 }, tileSignatures: { [key]: oldSignature } };
  assert.equal(savedTilePick(session, key, q), 5);
  assert.equal(savedTilePick(session, key, { ...q, correctTiles: ["9m"] }), undefined);
  assert.equal(savedTilePick(session, key, { ...q, board: { ...q.board, imageUrl: "https://example.com/other.jpg" } }), undefined);
  const newHand = { ...q, hand: q.hand.map((v, i) => i === 0 ? "6m" : v) };
  assert.equal(savedTilePick(session, key, newHand), undefined);
  assert.equal(savedTilePick({ tilePicks: { [key]: 5 }, tileSignatures: { [key]: tileQuestionSignature(q) } }, key, q), 5);
  assert.equal(savedTilePick({ ...session, tilePicks: { [key]: 14 } }, key, q), undefined);
});

test("recommendations include the selected low-rate tile, and call rows never masquerade as discards", () => {
  const q = evaluations["safe-five-pin"];
  assert.deepEqual(nagaDisplayRows(q, "5m"), ["5p", "6s", "9m", "5m"]);
  assert.deepEqual(nagaDisplayRows(evaluations["four-pin-pon"], "6p"), ["pon", "pass"]);
  const tile = readFileSync("app/TileQuestion.tsx", "utf8"), css = readFileSync("app/notebook.css", "utf8");
  assert.match(tile, /answered && !failedImage && data\.naga\?\.kind === "discard"/);
  assert.match(tile, /answered && data\.naga && <NagaRecommendation/);
  assert.match(css, /\.source-naga-bars[^}]*pointer-events: none/);
  assert.doesNotMatch(tile, /source-hand-canvas|source-hand-scroll/);
});

function database() {
  const sql = new DatabaseSync(":memory:");
  const prepare = (query, values = []) => ({ bind: (...v) => prepare(query, v), run: async () => sql.prepare(query).run(...values), all: async () => ({ results: sql.prepare(query).all(...values) }) });
  return { sql, prepare, batch: async (statements) => { sql.exec("BEGIN"); try { for (const s of statements) await s.run(); sql.exec("COMMIT"); } catch (e) { sql.exec("ROLLBACK"); throw e; } } };
}
test("shared editor and database preserve NAGA on text edits, reject stale hands and retain soft-deleted data", async () => {
  const db = database(), lessonId = "lesson-test-naga-editor";
  for (const s of NOTEBOOK_SCHEMA_SQL) db.sql.exec(s);
  const call = async (path, method = "GET", body) => {
    const response = await handleAdminApi(new Request("https://test.example" + path, { method, headers: { "content-type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) }), { DB: db });
    return { status: response.status, data: await response.json() };
  };
  const q = card("safe-five-pin").tileQuestion;
  const result = await call(`/api/lessons/${lessonId}/cards`, "POST", { kind: "question", question: "何を切る？", answer: "5p", tileQuestion: q });
  assert.equal(result.status, 200);
  const id = result.data.card.id, path = `/api/lessons/${lessonId}/cards/${id}`;
  const read = () => JSON.parse(db.sql.prepare("SELECT tile_question FROM notebook_cards WHERE card_id=?").get(id).tile_question);
  assert.deepEqual(read(), q);
  assert.equal((await call(path, "PUT", { kind: "question", question: "問題文だけ編集", answer: "解説だけ編集" })).status, 200);
  assert.deepEqual(read(), q);
  assert.equal((await call(path, "PUT", { kind: "question", question: "wrong scene", answer: "wrong", tileQuestion: { ...q, hand: q.hand.map((v, i) => i === 0 ? "6m" : v) } })).status, 400);
  assert.deepEqual(read(), q);
  await call(path, "DELETE"); await call(path + "/restore", "POST", {});
  const notebook = (await call("/api/notebook")).data;
  assert.deepEqual(notebook.cards.find(c => c.id === id).tileQuestion, q);
  const editor = readFileSync("app/TileQuestionEditor.tsx", "utf8");
  assert.match(editor, /value\?\.naga \? JSON.stringify\(value.naga/);
  assert.match(editor, /NAGA解析データ/);
  db.sql.close();
});
