import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import data from "../content/september-2026.json" with { type: "json" };
import evidence from "../docs/september-2026-provenance.json" with { type: "json" };
import { questions, summary, scenes } from "../content/september-2026-source.mjs";
import { ensureSeptemberLessons, septemberCheckStatements } from "../worker/september-lessons.mjs";
import { NOTEBOOK_SCHEMA_SQL } from "../db/schema.mjs";
import { LEARNING_SCHEMA_SQL } from "../db/learning-schema.mjs";
import { renderSeptemberMaterial } from "../scripts/render-september-material.mjs";
import { sortLessons, APP_VERSION } from "../app/lib/lesson.mjs";
import { buildQuestionIndex } from "../app/lib/study-index.mjs";
import { materialDetails, isFeaturedMaterial } from "../app/lib/materials.mjs";

const lesson = data.lessons[0];
test("September 27 is a separate newest lesson with exactly 30 reviewed mixed questions", () => {
  assert.equal(data.lessons.length, 1);
  assert.equal(lesson.date, "9/27");
  assert.equal(lesson.teacher, "ねじまき鳥");
  assert.match(lesson.videoUrl, /vc1JwAm6Is4$/);
  assert.equal(sortLessons([{ id: "old", date: "8/28" }, lesson])[0].id, lesson.id);
  assert.equal(questions.length, 30);
  assert.equal(new Set(questions.map((q) => q.id)).size, 30);
  assert.equal(new Set(questions.map((q) => q.question)).size, 30);
  const flash = data.cards.filter((q) => q.kind === "question");
  assert.equal(flash.length, 11);
  assert.equal(data.items.filter((q) => q.type === "choice").length, 12);
  assert.equal(data.items.filter((q) => q.type === "cloze").length, 7);
  assert.equal(data.cards.filter((q) => q.kind === "note").length, 1);
  assert.deepEqual([...flash, ...data.items].map((q) => q.sortOrder).sort((a,b) => a-b), Array.from({ length: 30 }, (_, i) => i+1));
  const index = buildQuestionIndex([lesson], { [lesson.id]: flash.map((c) => ({ ...c, source: "custom" })) }, data.items, []);
  assert.equal(index.length, 30);
  for (const q of data.items) {
    assert.equal(q.choices.length, 4);
    assert.equal(new Set(q.choices).size, 4);
    assert.ok(q.correctIndex >= 0 && q.correctIndex < 4);
    assert.ok(q.explanation.startsWith(q.choices[q.correctIndex]));
    if (q.type === "cloze") assert.equal((q.question.match(/［　］/g) ?? []).length, 1);
  }
  for (const q of [...flash, ...data.items]) {
    assert.match(q.answer ?? q.explanation, /watch\?v=vc1JwAm6Is4&t=\d+s/);
    assert.ok(q.question.length <= 2000);
    assert.ok((q.answer ?? q.explanation).length <= 5000);
  }
});

test("scene-dependent questions begin with verified source frames; no fabricated board images", () => {
  assert.equal(Object.keys(evidence.images).length, 17);
  for (const q of questions.filter((q) => q.scene)) {
    const m = evidence.questions.find((p) => p.sourceId === q.id);
    const row = [...data.cards, ...data.items].find((p) => p.id === m.appId);
    assert.ok(row.question.startsWith("!["), q.id);
    assert.ok(row.question.includes(evidence.images[q.scene].url));
    assert.equal(m.reviewStatus, "verified");
    assert.equal(evidence.images[q.scene].sourceSecond, scenes[q.scene].at);
  }
  for (const im of Object.values(evidence.images)) {
    assert.match(im.sha256, /^[a-f0-9]{64}$/);
    assert.match(im.url, /^https:\/\/sakurakou-lesson-review\.kobotenmitsu\.chatgpt\.site\/api\/images\/note-images\//);
  }
  assert.equal(evidence.canonicalDocuments.length, 3);
  assert.ok(evidence.canonicalDocuments.every((r) => r.revisionId && r.checkedAt === "2026-09-27"));
});

test("summary uses screenshot then matching explanation, with original-size images and source links", () => {
  const html = renderSeptemberMaterial(evidence);
  assert.equal(readFileSync("public/materials/september-2026/0927.html", "utf8"), html);
  const sections = [...html.matchAll(/<article class="scene"[^>]*>([\s\S]*?)<\/article>/g)];
  assert.equal(sections.length, 8);
  sections.forEach(([, s], i) => {
    assert.ok(s.indexOf("<figure>") < s.indexOf('class="scene-explanation"'));
    assert.ok(s.includes(evidence.images[summary[i].scene].url));
    assert.ok(s.includes(summary[i].title));
    assert.ok(s.includes("画像を押すと拡大"));
  });
  assert.ok(html.includes(`data-app-version="${APP_VERSION}"`));
  assert.ok(!html.includes("http://localhost"));
  const r = data.resources[0];
  assert.equal(isFeaturedMaterial(r), true);
  assert.equal(materialDetails(r).service, "授業のまとめ");
});

test("the summaries include the user's exact supplementary phrases without changing questions", () => {
  const html = renderSeptemberMaterial(evidence);
  const sections = [...html.matchAll(/<article class="scene"[^>]*>([\s\S]*?)<\/article>/g)];
  const quote = "1種受けの為だけの危険牌＜安牌";
  assert.equal(summary[2].teachingNote.quote, quote);
  assert.ok(sections[2][1].includes(`てんてん先生の定番フレーズ：<br><strong>「${quote}」</strong>`));
  assert.ok(sections[2][1].indexOf('class="teaching-note"') > sections[2][1].indexOf("安全牌を持つ価値を比較する。"));
  assert.ok(sections[2][1].indexOf('class="teaching-note"') < sections[2][1].indexOf('class="source"'));
  const damaQuote = "役アリ愚形を黙っていた所に立直が来たら、猶の事ダマである。";
  assert.equal(summary[5].teachingNote.quote, damaQuote);
  assert.ok(sections[5][1].includes(`覚えておきたいフレーズ：<br><strong>「${damaQuote}」</strong>`));
  assert.ok(sections[5][1].indexOf('class="teaching-note"') > sections[5][1].indexOf("現物を切って和了できる余地が残る。"));
  assert.ok(sections[5][1].indexOf('class="teaching-note"') < sections[5][1].indexOf('class="source"'));
  assert.equal((html.match(/class="teaching-note"/g) ?? []).length, 2);
  assert.equal(questions.length, 30);
});

function database() {
  const sql = new DatabaseSync(":memory:");
  for (const statement of [...NOTEBOOK_SCHEMA_SQL, ...LEARNING_SCHEMA_SQL]) sql.exec(statement);
  const wrap = (query, values = []) => ({ bind: (...v) => wrap(query, v), run: async () => sql.prepare(query).run(...values) });
  const db = { sql, prepare: wrap, batch: async (stmts) => {
    sql.exec("BEGIN");
    try { for (const s of stmts) await s.run(); sql.exec("COMMIT"); }
    catch (e) { sql.exec("ROLLBACK"); throw e; }
  } };
  return db;
}
test("new import preserves shared edits, logical deletion, removed resources and check revisions", async () => {
  const db = database();
  await Promise.all([ensureSeptemberLessons(db), ensureSeptemberLessons(db)]);
  await db.batch(septemberCheckStatements(db));
  assert.equal(db.sql.prepare("SELECT COUNT(*) n FROM notebook_cards").get().n, 12);
  const c = data.cards[1], q = data.items[0], r = data.resources[0];
  db.sql.prepare("UPDATE notebook_lessons SET title='edited',deleted=1 WHERE lesson_id=?").run(lesson.id);
  db.sql.prepare("UPDATE notebook_cards SET answer='edited',deleted=1 WHERE card_id=?").run(c.id);
  db.sql.prepare("DELETE FROM lesson_resources WHERE resource_id=?").run(r.id);
  db.sql.prepare("UPDATE review_checks SET data=? WHERE id=?").run(JSON.stringify({ ...q, explanation: "edited", revision: 8, deleted: true }), q.id);
  await ensureSeptemberLessons({ prepare: db.prepare, batch: db.batch });
  await db.batch(septemberCheckStatements(db));
  assert.equal(db.sql.prepare("SELECT title FROM notebook_lessons WHERE lesson_id=?").get(lesson.id).title, "edited");
  assert.equal(db.sql.prepare("SELECT answer FROM notebook_cards WHERE card_id=?").get(c.id).answer, "edited");
  assert.equal(db.sql.prepare("SELECT COUNT(*) n FROM lesson_resources WHERE resource_id=?").get(r.id).n, 0);
  const saved = JSON.parse(db.sql.prepare("SELECT data FROM review_checks WHERE id=?").get(q.id).data);
  assert.equal(saved.revision, 8);
  assert.equal(saved.deleted, true);
  db.sql.close();
});
test("failed import is atomic and retryable", async () => {
  const db = database(), batch = db.batch;
  let first = true;
  db.batch = async (s) => { if (first) { first = false; throw new Error("offline"); } return batch(s); };
  await assert.rejects(ensureSeptemberLessons(db), /offline/);
  assert.equal(db.sql.prepare("SELECT COUNT(*) n FROM notebook_lessons").get().n, 0);
  await ensureSeptemberLessons(db);
  assert.equal(db.sql.prepare("SELECT COUNT(*) n FROM notebook_lessons").get().n, 1);
  db.sql.close();
});

// Independently enumerate one-suit decompositions for the numerical answer keys.
function melds(a) {
  const i = a.findIndex((n) => n > 0);
  if (i < 0) return true;
  if (a[i] >= 3) { const b = [...a]; b[i] -= 3; if (melds(b)) return true; }
  if (i <= 7 && a[i+1] && a[i+2]) { const b = [...a]; b[i]--; b[i+1]--; b[i+2]--; if (melds(b)) return true; }
  return false;
}
const counts = (s) => Array.from({ length: 10 }, (_, i) => [...s].filter((n) => Number(n) === i).length);
function twoMeldsHead(s) {
  if (s.length !== 8) return false;
  const a = counts(s);
  return a.some((n,i) => { if (n < 2) return false; const b = [...a]; b[i] -= 2; return melds(b); });
}
function acceptsAfterDiscard(hand) {
  return Array.from({ length: 9 }, (_, i) => i+1).filter((draw) => {
    const all = hand + draw;
    return [...all].some((_, i) => twoMeldsHead(all.slice(0,i) + all.slice(i+1)));
  });
}
test("tile-count answers match independent complete-shape enumeration", () => {
  assert.deepEqual(acceptsAfterDiscard("24456778"), [3,6,9]);
  assert.deepEqual(Array.from({length:9},(_,i)=>i+1).filter((n)=>twoMeldsHead("4566789"+n)), [3,6,9]);
  // 5p/8p complete three pinzu melds: discard one manzu and take a single wait.
  const headless = Array.from({length:9},(_,i)=>i+1).filter((n) =>
    melds(counts("45667789"+n)) || acceptsAfterDiscard("45667789").includes(n));
  assert.deepEqual(headless, [3,4,5,6,7,8,9]);
  assert.equal(twoMeldsHead("23445677"), true);
  assert.equal(twoMeldsHead("44567678"), true);
  assert.equal(twoMeldsHead("44567789"), true);
});
