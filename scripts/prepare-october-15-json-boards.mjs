// Local cached report only; no video captures, remote fetches, or image uploads.
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { normalizeTileQuestion, tileOptions, tileQuestionSignature } from "../app/lib/tile-question.mjs";
import { jsonBoardLayout } from "../app/lib/json-board.mjs";
const [reportFile, minkiruRoot] = process.argv.slice(2);
assert.ok(reportFile && minkiruRoot, "Pass the cached report file and existing min-kiru checkout");
const runtime = name => pathToFileURL(resolve(minkiruRoot, "scripts", name)).href;
const { verifiedSceneCandidate } = await import(runtime("naga-generator-runtime.mjs"));
const { boardState } = await import(runtime("naga-board-runtime.mjs"));
const raw = await readFile(reportFile), report = JSON.parse(raw);
const path = "content/october-15.json", data = JSON.parse(await readFile(path, "utf8"));
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const evidence = [];
for (const card of data.cards.filter(c => c.tileQuestion)) {
  const old = card.tileQuestion, n = old.naga;
  const candidate = verifiedSceneCandidate(report, `https://naga.dmv.nico/htmls/report_viewer.html?report_id=${n.reportId}&tw=${n.tw}&ts=${n.ts}&tv=${n.tv}`, { decisionType: "discard" });
  const boardScene = boardState.project(report, candidate);
  assert.ok(boardState.validate(boardScene, candidate).valid, card.id);
  boardScene.players.forEach(p => { p.name = "新人"; p.rank = "初級"; p.rating = null; });
  const { board, ...same } = old;
  const next = normalizeTileQuestion({ ...same, boardScene, previousBoardImageUrl: old.previousBoardImageUrl ?? board.imageUrl });
  assert.ok(next && jsonBoardLayout(next), card.id + ": JSON scene/hand mismatch");
  assert.deepEqual(tileOptions(next), tileOptions(old));
  assert.deepEqual(next.correctTiles, old.correctTiles);
  assert.deepEqual(next.naga, old.naga);
  assert.equal(tileQuestionSignature(next), tileQuestionSignature(old));
  card.tileQuestion = next;
  evidence.push({ id: card.id, source: boardScene.source, validation: boardState.validate(boardScene, candidate), handOrderPreserved: true, answerAndRatesPreserved: true, previousImage: next.previousBoardImageUrl, otherPlayerMeldCounts: boardScene.players.map(p => p.melds.length) });
}
await writeFile(path, JSON.stringify(data, null, 2) + "\n");
await writeFile("content/october-15-json-boards.json", JSON.stringify(Object.fromEntries(data.cards.filter(c => c.tileQuestion).map(c => [c.id, { boardScene: c.tileQuestion.boardScene, previousBoardImageUrl: c.tileQuestion.previousBoardImageUrl }])), null, 2) + "\n");
await writeFile("docs/october-15-json-board-provenance.json", JSON.stringify({
  checkedAt: "2026-10-16", reportSha256: hash(raw), networkRequests: 0, imageUploads: 0,
  rendererSha256: hash((await readFile("app/lib/theory-board-renderer.js", "utf8")).replace(/\r\n/g, "\n")),
  projectorSha256: hash((await readFile("app/lib/naga-board-state.js", "utf8")).replace(/\r\n/g, "\n")),
  source: "min-kiru shared generator, boardState.project/validate, boardRenderer.markup/handPositions",
  questions: evidence,
}, null, 2) + "\n");
console.log(JSON.stringify({ converted: evidence.length, networkRequests: 0, imageUploads: 0 }));
