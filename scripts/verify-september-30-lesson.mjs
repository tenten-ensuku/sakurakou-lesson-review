// Read-only release checks: public teaching rows and assets only, no learner profiles.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import data from "../content/september-30.json" with { type: "json" };
import evidence from "../docs/september-30-provenance.json" with { type: "json" };
import { APP_VERSION } from "../app/lib/lesson.mjs";
import { SITE_ORIGIN, resolveSiteUrl } from "../app/lib/site-origin.mjs";
async function get(url) {
  const response = await fetch(resolveSiteUrl(String(url)), { signal: AbortSignal.timeout(30000) });
  assert.equal(response.status, 200, String(url));
  return response;
}
const snapshot = {
  notebook: await (await get(SITE_ORIGIN + "/api/notebook")).json(),
  catalog: await (await get(SITE_ORIGIN + "/api/catalog")).json(),
};
const lesson = snapshot.notebook.lessons.find(row => row.id === data.lessons[0].id);
assert.ok(lesson && !lesson.deleted);
for (const key of ["date", "teacher", "title", "videoUrl"]) assert.equal(lesson[key], data.lessons[0][key]);
for (const card of data.cards) {
  const row = snapshot.notebook.cards.find(value => value.id === card.id);
  assert.ok(row && !row.deleted, card.id);
  for (const key of ["question", "answer", "kind", "sortOrder", "tileQuestion"]) assert.deepEqual(row[key], card[key], `${card.id}/${key}`);
}
for (const resource of data.resources) {
  const row = snapshot.notebook.resources.find(value => value.id === resource.id);
  assert.ok(row, resource.id);
  for (const key of ["label", "url", "kind", "sortOrder"]) assert.equal(row[key], resource[key]);
}
const cards = snapshot.notebook.cards.filter(row => row.lessonId === lesson.id && !row.deleted);
assert.equal(cards.filter(row => row.kind === "question").length, 19);
assert.equal(cards.filter(row => row.tileQuestion).length, 7);
assert.equal(cards.filter(row => row.tileQuestion?.naga?.kind === "discard").length, 6);
assert.equal(cards.filter(row => row.tileQuestion?.naga?.kind === "call").length, 1);
for (const card of cards.filter(row => row.tileQuestion)) {
  assert.deepEqual(card.tileQuestion.naga.models.map(m => m.name), ["ニシキ", "カガシ"]);
  assert.equal(card.tileQuestion.naga.tw, 3);
}
assert.equal(cards.filter(row => row.kind === "note").length, 1);
let preserved = false;
const baselineIndex = process.argv.indexOf("--baseline");
if (baselineIndex >= 0) {
  const before = JSON.parse(await readFile(process.argv[baselineIndex + 1], "utf8"));
  for (const group of ["notebook", "catalog"]) {
    for (const [key, rows] of Object.entries(before[group])) {
      if (!Array.isArray(rows)) continue;
      for (const row of rows) assert.ok(snapshot[group][key].some(value => isDeepStrictEqual(value, row)), `Existing ${group}/${key} row changed`);
      const added = group === "notebook" ? ({ lessons: 1, cards: data.cards.length, resources: data.resources.length }[key] ?? 0) : 0;
      assert.equal(snapshot[group][key].length, rows.length + added, `${group}/${key} row count`);
    }
  }
  preserved = true;
}
const repairIndex = process.argv.indexOf("--repair-baseline");
if (repairIndex >= 0) {
  const before = JSON.parse(await readFile(process.argv[repairIndex + 1], "utf8"));
  for (const group of ["notebook", "catalog"]) for (const [key, rows] of Object.entries(before[group])) {
    if (!Array.isArray(rows)) continue;
    assert.equal(snapshot[group][key].length, rows.length, `${group}/${key} count changed`);
    for (const row of rows) {
      const desired = group === "notebook" && ["cards", "resources"].includes(key) ? data[key].find(v=>v.id===row.id) : null;
      const actual = snapshot[group][key].find(v => row.id ? v.id === row.id : isDeepStrictEqual(v, row));
      assert.ok(actual, `Existing ${group}/${key} row missing`);
      if (!desired) assert.deepEqual(actual,row,`Unrelated ${group}/${key} row changed`);
      else {
        const expected = { ...row, ...desired }, clean = { ...actual };
        if (key==="cards" && !desired.tileQuestion) delete expected.tileQuestion;
        delete expected.updatedAt; delete clean.updatedAt;
        assert.deepEqual(clean,expected,`Unexpected corrected ${key} field changed: ${row.id}`);
      }
    }
  }
  preserved = true;
}
await Promise.all(Object.values(evidence.images).map(async image => {
  const response = await get(image.url);
  assert.match(response.headers.get("content-type"), /image\/jpeg/);
  assert.equal(createHash("sha256").update(new Uint8Array(await response.arrayBuffer())).digest("hex"), image.sha256);
}));
const publicUrls = ["https://sakurakou-lesson-review.pages.dev/", SITE_ORIGIN + "/", "https://tenten-ensuku.github.io/sakurakou-lesson-review/"];
for (const base of publicUrls) {
  const home = await (await get(base)).text();
  assert.match(home, /エンスク授業ノート/);
  const html = await (await get(new URL("materials/september-2026/0930.html", base))).text();
  assert.ok(html.includes(`data-app-version="${APP_VERSION}"`));
  const scenes = [...html.matchAll(/<article class="scene"[^>]*>([\s\S]*?)<\/article>/g)];
  assert.equal(scenes.length, 10);
  for (const [, scene] of scenes) assert.ok(scene.indexOf("<figure>") >= 0 && scene.indexOf("<figure>") < scene.indexOf('class="scene-explanation"'));
  await get(new URL("materials/august-2026/summary.css", base));
  for (const file of ["man1-66-90-l.png", "ji7-66-90-l.png", "aka1-66-90-l.png", "aka2-66-90-l.png", "aka3-66-90-l.png"]) {
    const local = await readFile(new URL("../public/tiles/" + file, import.meta.url));
    const remote = new Uint8Array(await (await get(new URL("tiles/" + file, base))).arrayBuffer());
    assert.equal(createHash("sha256").update(remote).digest("hex"), createHash("sha256").update(local).digest("hex"));
  }
  const previous = await (await get(new URL("materials/september-2026/0929.html", base))).text();
  assert.ok(previous.includes("8p"));
  const older = await (await get(new URL("materials/september-2026/0927.html", base))).text();
  assert.ok(older.includes("1種受けの為だけの危険牌＜安牌"));
  assert.ok(older.includes("役アリ愚形を黙っていた所に立直が来たら、猶の事ダマである。"));
}
console.log(JSON.stringify({ version: APP_VERSION, lesson: lesson.date, questions: 19, tileQuestions: 7, nagaDiscardEvaluations: 6, nagaPrePonEvaluation: 1, summaryScenes: 10, verifiedImages: Object.keys(evidence.images).length, unrelatedPublicDataUnchanged: preserved, publicUrls }, null, 2));
