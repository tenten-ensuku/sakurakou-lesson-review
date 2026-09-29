import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import data from "../content/september-29.json" with { type: "json" };
import oldData from "../content/september-2026.json" with { type: "json" };
import evidence from "../docs/september-29-provenance.json" with { type: "json" };
import * as source from "../content/september-29-source.mjs";
import { ensureSeptember29Lessons, september29CheckStatements } from "../worker/september-29-lessons.mjs";
import { ensureSeptemberLessons, septemberCheckStatements } from "../worker/september-lessons.mjs";
import { NOTEBOOK_SCHEMA_SQL } from "../db/schema.mjs";
import { LEARNING_SCHEMA_SQL } from "../db/learning-schema.mjs";
import { renderSeptemberMaterial } from "../scripts/render-september-material.mjs";
import { APP_VERSION, sortLessons } from "../app/lib/lesson.mjs";
import { buildQuestionIndex } from "../app/lib/study-index.mjs";
import { isFeaturedMaterial } from "../app/lib/materials.mjs";

test("9/29 is independent, newest and has 30 distinct questions numbered 1..30", () => {
  const { lesson, questions } = source;
  assert.equal(lesson.date, "9/29"); assert.equal(lesson.teacher, "ねじまき鳥");
  assert.match(lesson.videoUrl, /CNCAKOAMyqU$/);
  assert.equal(sortLessons([...oldData.lessons, lesson])[0].id, lesson.id);
  assert.equal(questions.length, 30);
  assert.equal(new Set(questions.map((q) => q.id)).size, 30);
  assert.equal(new Set(questions.map((q) => q.question)).size, 30);
  const cards = data.cards.filter((c) => c.kind === "question");
  assert.equal(cards.length, 10);
  assert.equal(data.items.filter((q) => q.type === "choice").length, 11);
  assert.equal(data.items.filter((q) => q.type === "cloze").length, 9);
  assert.equal(data.cards.filter((q) => q.kind === "note").length, 1);
  assert.deepEqual([...cards, ...data.items].map((q) => q.sortOrder).sort((a,b) => a-b), Array.from({length:30}, (_,i)=>i+1));
  assert.equal(buildQuestionIndex([lesson], {[lesson.id]:cards.map((c)=>({...c,source:"custom"}))}, data.items, []).length, 30);
  const oldIds = new Set([...oldData.cards, ...oldData.items, ...oldData.resources].map((r)=>r.id));
  for (const row of [...data.cards, ...data.items, ...data.resources]) assert.ok(!oldIds.has(row.id));
  for (const q of data.items) {
    assert.equal(q.choices.length, 4); assert.equal(new Set(q.choices).size,4);
    assert.ok(q.explanation.startsWith(q.choices[q.correctIndex]));
    if(q.type === "cloze") assert.equal((q.question.match(/［　］/g)??[]).length,1);
  }
  for (const q of [...cards, ...data.items]) {
    assert.match(q.answer ?? q.explanation, /watch\?v=CNCAKOAMyqU&t=\d+s/);
    assert.ok(q.question.length <= 2000); assert.ok((q.answer ?? q.explanation).length <= 5000);
  }
});

test("application questions use complete verified frames and current document references", () => {
  assert.equal(Object.keys(evidence.images).length,13);
  for (const q of source.questions.filter((q)=>q.scene)) {
    const m=evidence.questions.find((m)=>m.sourceId===q.id);
    const row=[...data.cards,...data.items].find((r)=>r.id===m.appId);
    assert.ok(row.question.startsWith("!["));
    assert.ok(row.question.includes(evidence.images[q.scene].url));
    assert.equal(m.reviewStatus,"verified");
  }
  for (const im of Object.values(evidence.images)) {
    assert.equal(im.width,1280); assert.equal(im.height,720);
    assert.match(im.transformation,/no crop or redrawing/);
    assert.match(im.sha256,/^[a-f0-9]{64}$/);
  }
  assert.equal(evidence.canonicalDocuments.length,3);
  assert.ok(evidence.canonicalDocuments.every((r)=>r.revisionId && r.checkedAt === "2026-09-29"));
  assert.match(evidence.method,/No separate audio transcription/);
  assert.ok(source.questions.find((q)=>q.id==="ai-rule-correction").explanation.includes("断定されていない"));
  assert.ok(source.questions.find((q)=>q.id==="chii-tanyao-choice").explanation.includes("6p切りも認め"));
});

test("seven summary sections show screenshot before description, using the current app version", () => {
  const html=renderSeptemberMaterial(evidence,source);
  assert.equal(readFileSync("public/materials/september-2026/0929.html","utf8"),html);
  const sections=[...html.matchAll(/<article class="scene"[^>]*>([\s\S]*?)<\/article>/g)];
  assert.equal(sections.length,7);
  sections.forEach(([,s],i)=>{
    assert.ok(s.indexOf("<figure>") < s.indexOf('class="scene-explanation"'));
    assert.ok(s.includes(evidence.images[source.summary[i].scene].url));
    assert.ok(s.includes(source.summary[i].title));
  });
  assert.ok(html.includes(`data-app-version="${APP_VERSION}"`));
  assert.ok(html.includes("30問は授業ノートの9/29から解けます"));
  assert.ok(isFeaturedMaterial(data.resources[0]));
});

function database(){
  const sql=new DatabaseSync(":memory:");
  for(const s of [...NOTEBOOK_SCHEMA_SQL,...LEARNING_SCHEMA_SQL])sql.exec(s);
  const prepare=(q,v=[])=>({bind:(...w)=>prepare(q,w),run:async()=>sql.prepare(q).run(...v)});
  return {sql,prepare,batch:async(ss)=>{sql.exec("BEGIN");try{for(const s of ss)await s.run();sql.exec("COMMIT");}catch(e){sql.exec("ROLLBACK");throw e;}}};
}
test("9/29 seeding does not alter older material or overwrite later public edits", async()=>{
  const db=database();
  await ensureSeptemberLessons(db); await db.batch(septemberCheckStatements(db));
  const snapshot=()=>JSON.stringify(db.sql.prepare("SELECT * FROM notebook_cards WHERE lesson_id=? ORDER BY card_id").all(oldData.lessons[0].id));
  const before=snapshot();
  await Promise.all([ensureSeptember29Lessons(db),ensureSeptember29Lessons(db)]);
  await db.batch(september29CheckStatements(db));
  assert.equal(snapshot(),before);
  assert.equal(db.sql.prepare("SELECT COUNT(*) n FROM notebook_cards WHERE lesson_id=?").get(source.lesson.id).n,11);
  const c=data.cards[1],r=data.resources[0],q=data.items[0];
  db.sql.prepare("UPDATE notebook_cards SET answer='edited',deleted=1,sort_order=99 WHERE card_id=?").run(c.id);
  db.sql.prepare("UPDATE notebook_lessons SET title='edited',deleted=1 WHERE lesson_id=?").run(source.lesson.id);
  db.sql.prepare("DELETE FROM lesson_resources WHERE resource_id=?").run(r.id);
  db.sql.prepare("UPDATE review_checks SET data=? WHERE id=?").run(JSON.stringify({...q,deleted:true,explanation:"edited",revision:8}),q.id);
  await ensureSeptember29Lessons({prepare:db.prepare,batch:db.batch}); await db.batch(september29CheckStatements(db));
  const saved=db.sql.prepare("SELECT * FROM notebook_cards WHERE card_id=?").get(c.id);
  assert.equal(saved.answer,"edited");assert.equal(saved.deleted,1);assert.equal(saved.sort_order,99);
  assert.equal(db.sql.prepare("SELECT title FROM notebook_lessons WHERE lesson_id=?").get(source.lesson.id).title,"edited");
  assert.equal(db.sql.prepare("SELECT COUNT(*) n FROM lesson_resources WHERE resource_id=?").get(r.id).n,0);
  assert.equal(JSON.parse(db.sql.prepare("SELECT data FROM review_checks WHERE id=?").get(q.id).data).revision,8);
  db.sql.close();
});
test("failed 9/29 import can be retried without partial lesson receipt",async()=>{
  const db=database(),batch=db.batch;let first=true;
  db.batch=async(ss)=>{if(first){first=false;throw new Error("offline");}return batch(ss);};
  await assert.rejects(ensureSeptember29Lessons(db),/offline/);
  assert.equal(db.sql.prepare("SELECT COUNT(*) n FROM notebook_lessons").get().n,0);
  await ensureSeptember29Lessons(db);
  assert.equal(db.sql.prepare("SELECT COUNT(*) n FROM notebook_lessons").get().n,1);db.sql.close();
});

// Independent standard-hand enumeration checks the source-derived wait answers.
const hand=(m="",p="",s="",z="")=>[m,p,s,z].flatMap((part,i)=>Array.from({length:i===3?7:9},(_,n)=>[...part].filter((v)=>Number(v)===n+1).length));
function melds(a){const i=a.findIndex((n)=>n);if(i<0)return true;
  if(a[i]>=3){const b=[...a];b[i]-=3;if(melds(b))return true;}
  if(i<27&&i%9<7&&a[i+1]&&a[i+2]){const b=[...a];b[i]--;b[i+1]--;b[i+2]--;if(melds(b))return true;}return false;}
function wins(a){return a.some((n,i)=>{if(n<2)return false;const b=[...a];b[i]-=2;return melds(b);});}
function waits(a){return a.flatMap((n,i)=>{if(n>=4)return[];const b=[...a];b[i]++;return wins(b)?[i]:[];});}
test("headless and final-round wait answers match tile decomposition",()=>{
  assert.deepEqual(waits(hand("12377889","23477")),[5,8]); // 6m,9m
  assert.deepEqual(waits(hand("12377889","234","33")),[5,8]);
  assert.deepEqual(waits(hand("123677889","234","3")),[20]); // 3s single
  assert.deepEqual(waits(hand("123778899","2347")),[15]); // 7p single
  assert.deepEqual(waits(hand("23678","678","55","333")),[0,3]); // West pon: 1m,4m
  assert.deepEqual(waits(hand("34578","23488","444")),[5,8]);
  assert.deepEqual(waits(hand("45678","23488","444")),[2,5,8]);
  assert.deepEqual(waits(hand("999","44","33455","222")),[21]); // pon hand: 4s
});
