// Offline verification of the one cached, user-supplied report. Reuse the
// existing shared generator; do not implement a second hand/replay engine.
// node scripts/prepare-september-30-naga.mjs <cached-report.json> <shared-runtime.mjs>
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { questions } from "../content/september-30-source.mjs";
import { tileOptions } from "../app/lib/tile-question.mjs";
import { normalizeNagaEvaluation, nagaSourceUrl } from "../app/lib/naga-evaluation.mjs";

const [reportFile, runtimeFile] = process.argv.slice(2);
assert.ok(reportFile && runtimeFile, "Cached report and shared generator runtime are required");
const bytes = await readFile(resolve(reportFile));
assert.ok(bytes.length < 10 * 1024 * 1024, "Report exceeds the bounded input budget");
const report = JSON.parse(bytes);
const runtimeUrl = pathToFileURL(resolve(runtimeFile));
const { generator, GENERATION_RULE_VERSION } = await import(runtimeUrl.href);
const reportId = "728f34ad41d0d216acf92934d58abe3595682164d1f39c85b22f2891b556f246v2_2";
const locations = {
  "safe-five-pin": [0, 89, "sou1"],
  "two-riichi-west": [1, 81, "sou9"],
  "nine-pin-speed": [4, 39, "sou3"],
  "keep-only-head": [4, 47, "sou3"],
  "honitsu-not-force": [5, 5, "man1"],
  "pon-preserve-head": [5, 27, "man1"],
  "four-pin-pon": [5, 88, "man1"],
};
// The shared generator uses standard honor order (white/green/red); this
// project's existing approved assets use green/white/red. Keep it explicit.
const honor = { ji1: "1z", ji2: "2z", ji3: "3z", ji4: "4z", ji5: "6z", ji6: "5z", ji7: "7z" };
const adapt = (tile) => {
  if (tile == null) return null;
  if (honor[tile]) return honor[tile];
  if (/^aka[123]$/.test(tile)) return "0" + "mps"[Number(tile[3]) - 1];
  const m = /^(man|pin|sou)([1-9])$/.exec(tile);
  assert.ok(m, `Unknown shared tile: ${tile}`);
  return m[2] + { man: "m", pin: "p", sou: "s" }[m[1]];
};
const sorted = (hand) => [...hand].sort();
const cards = {}, evidence = [];
for (const q of questions.filter(q => q.tileQuestion)) {
  const [ts, tv, doraMarker] = locations[q.id];
  const scene = generator.sceneCandidate(report, { reportId, tw: 3, ts, tv, decisionType: "discard" });
  assert.ok(scene?.handValidation?.valid, `${q.id}: invalid replayed hand`);
  assert.equal(scene.doraMarker, doraMarker, `${q.id}: dora mismatch`);
  assert.deepEqual(sorted(scene.handBeforeDraw.map(adapt)), sorted(q.tileQuestion.hand), `${q.id}: hand mismatch`);
  assert.equal(adapt(scene.draw), q.tileQuestion.draw ?? null, `${q.id}: draw mismatch`);
  const kind = q.id === "four-pin-pon" ? "call" : "discard";
  assert.equal(scene.decisionType, kind, `${q.id}: wrong decision type`);
  const options = tileOptions(q.tileQuestion);
  const models = scene.models.map((model, i) => ({ name: model.name, rates: kind === "call"
    ? { pon: scene.callActionProbabilities.call[i], pass: scene.callActionProbabilities.pass[i] }
    : Object.fromEntries([...new Set(options)].map(code => {
      const entry = Object.entries(scene.probabilities).find(([tile]) => adapt(tile) === code);
      assert.ok(entry && Number.isFinite(entry[1][i]), `${q.id}: missing original rate for ${code}`);
      return [code, entry[1][i]];
    })) }));
  const previousHandSnapshot = q.id === "safe-five-pin" ? options.map((tile, i) => i === 11 ? "0s" : tile) : undefined;
  const evaluation = normalizeNagaEvaluation({ kind, reportId, tw: 3, ts, tv, handSnapshot: options, models,
    ...(previousHandSnapshot ? { previousHandSnapshot } : {}) }, options);
  assert.ok(evaluation, `${q.id}: invalid evaluation`);
  cards[q.id] = evaluation;
  evidence.push({ appId: "card-20260930-" + q.id, sourceUrl: nagaSourceUrl(evaluation), kind,
    doraMarker: adapt(scene.doraMarker), handMatchPercent: 100, drawMatched: true,
    predictionType: scene.predictionType, validation: scene.handValidation,
    instructorAnswers: q.tileQuestion.correctTiles,
    modelRecommendations: scene.models.map(m => ({ name: m.name, recommendation: m.recommendation })),
    ...(q.id === "safe-five-pin" ? { correction: "Source event confirms ordinary 5s, not red 5s; original board, slot positions and accepted answers unchanged." } : {}),
    ...(kind === "call" ? { limitation: "The report ends at another player's 4p discard. These are pre-pon call rates; no hypothetical post-pon discard probabilities exist." } : {}) });
}
assert.equal(evidence.length, 7);
assert.equal(evidence.filter(q => q.kind === "discard").length, 6);
const hash = (value) => createHash("sha256").update(value).digest("hex");
const provenance = { inputUrl: nagaSourceUrl({ reportId, tw: 0, ts: 0, tv: 0 }).replace(/&ts=0&tv=0$/, ""),
  reportId, targetSeat: 3, reportSha256: hash(bytes), reportBytes: bytes.length,
  generationRuleVersion: GENERATION_RULE_VERSION,
  sharedGeneratorSha256: hash(await readFile(new URL("../public/naga-generator-v44.js", runtimeUrl))),
  networkBudget: { requests: 1, maxBytes: 10 * 1024 * 1024, usedCachedReport: true },
  checkedAt: "2026-09-30", questions: evidence };
await writeFile(resolve("content/september-30-naga.json"), JSON.stringify(cards, null, 2) + "\n");
await writeFile(resolve("docs/september-30-naga-provenance.json"), JSON.stringify(provenance, null, 2) + "\n");
console.log(JSON.stringify({ matched: evidence.length, discardEvaluations: 6, prePonEvaluation: 1, handAndDoraMatch: "100%", reportSha256: provenance.reportSha256 }));
