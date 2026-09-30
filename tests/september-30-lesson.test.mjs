import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import data from "../content/september-30.json" with { type: "json" };
import evidence from "../docs/september-30-provenance.json" with { type: "json" };
import * as source from "../content/september-30-source.mjs";
import { ensureSeptember30Lessons } from "../worker/september-30-lessons.mjs";
import { ensureSeptember29Lessons } from "../worker/september-29-lessons.mjs";
import { NOTEBOOK_SCHEMA_SQL } from "../db/schema.mjs";
import { APP_VERSION, questionNumber, sortLessons } from "../app/lib/lesson.mjs";
import { normalizeTileQuestion } from "../app/lib/tile-question.mjs";
import { renderSeptemberMaterial } from "../scripts/render-september-material.mjs";
test("9/30 is a separate newest lesson with 19 focused questions, including seven source-image selections",()=>{
  assert.equal(source.lesson.teacher,"てんてん");assert.equal(source.lesson.date,"9/30");assert.equal(sortLessons([source.lesson,{date:"9/29",title:"x"}])[0].id,source.lesson.id);
  const qs=data.cards.filter(c=>c.kind==="question");assert.equal(qs.length,19);assert.equal(qs.filter(c=>c.tileQuestion).length,7);assert.equal(data.cards.filter(c=>c.kind==="note").length,1);
  assert.deepEqual(qs.map(c=>questionNumber(data.cards,c.id)),Array.from({length:19},(_,i)=>i+1));assert.equal(new Set(qs.map(c=>c.id)).size,19);
  for(const c of qs){assert.ok(c.question.length<=2000&&c.answer.length<=5000);if(c.tileQuestion){assert.deepEqual(normalizeTileQuestion(c.tileQuestion),c.tileQuestion);assert.ok(c.tileQuestion.board);assert.ok(c.question.includes(c.tileQuestion.board.imageUrl));}}
});
test("inspected source hands preserve red fives and actual numbered tiles, not caption guesses",()=>{
  const q=(id)=>source.questions.find(q=>q.id===id).tileQuestion;
  assert.deepEqual(q("safe-five-pin").hand,["5m","0m","7m","8m","9m","5p","5p","6p","2s","3s","4s","0s","6s"]);
  assert.deepEqual(q("two-riichi-west").hand.slice(8),["4s","4s","2z","3z","3z"]);assert.equal(q("two-riichi-west").draw,"0s");
  assert.deepEqual(q("nine-pin-speed").hand.slice(0,3),["2m","2m","3m"]);
  assert.deepEqual(q("nine-pin-speed").hand.slice(5,8),["1s","2s","3s"]);
  assert.deepEqual(q("keep-only-head").hand.slice(5,8),["1s","2s","3s"]);
  assert.deepEqual(q("keep-only-head").correctTiles,["8p","9p"]);
  assert.deepEqual(q("honitsu-not-force").hand.slice(5,8),["1s","1s","4s"]);
  assert.deepEqual(q("honitsu-not-force").correctTiles,["1z","4z"]);
  assert.equal(q("weak-double-uke"),undefined);
  assert.deepEqual(q("pon-preserve-head").correctTiles,["4z","5z"]);
  assert.deepEqual(q("four-pin-pon").hand.slice(0,2),["4p","4p"]);
});
test("ten summary scenes remain screenshot then explanation, with current version and concise source conditions",()=>{
  const html=renderSeptemberMaterial(evidence,source);assert.equal(readFileSync("public/materials/september-2026/0930.html","utf8"),html);
  assert.ok(html.includes(`data-app-version="${APP_VERSION}"`));
  const sections=[...html.matchAll(/<article class="scene"[^>]*>([\s\S]*?)<\/article>/g)];assert.equal(sections.length,10);
  for(const [,s]of sections)assert.ok(s.indexOf("<figure>")<s.indexOf('class="scene-explanation"'));
  assert.match(html,/19問は授業ノートの9\/30/);assert.equal(Object.keys(evidence.images).length,28);
  assert.match(source.questions.find(q=>q.id==="safe-five-pin").explanation,/カン5p・単騎を完全には消せない/);
  assert.match(source.questions.find(q=>q.id==="two-riichi-final").answer,/6s勝負も許容/);
});
test("question scenes match their state and tables are withheld until the explanation",()=>{
  const q=(id)=>data.cards.find(c=>c.id===`card-20260930-${id}`);
  assert.ok(q("fold-recheck").question.includes(evidence.images["0444"].url));
  assert.ok(q("avoid-riinomi").question.includes(evidence.images["1299"].url));
  for(const id of ["keiten-value","call-response-table","follow-definition","weak-double-uke","declaration-suji","honitsu-conditions"])assert.doesNotMatch(q(id).question,/!\[/);
  assert.doesNotMatch(q("keiten-value").answer,/!\[/);
  assert.ok(q("call-response-table").answer.includes(evidence.images["4380"].url));
  assert.ok(q("follow-definition").answer.includes(evidence.images["1824"].url));
  const note=data.cards.find(c=>c.kind==="note");assert.equal([...note.answer.matchAll(/!\[/g)].length,10);assert.ok(note.answer.length<=5000);
  for(const c of data.cards.filter(c=>c.tileQuestion)){const b=c.tileQuestion.board;assert.equal(b.width,760);assert.equal(b.height,614);assert.ok(b.regions.every(r=>r.y===530&&r.height===37));assert.ok(c.question.indexOf("何を切る")<c.question.indexOf("!["));}
});
function database(){const sql=new DatabaseSync(":memory:");for(const s of NOTEBOOK_SCHEMA_SQL)sql.exec(s);const prepare=(q,v=[])=>({bind:(...w)=>prepare(q,w),run:async()=>sql.prepare(q).run(...v)});return {sql,prepare,batch:async(ss)=>{sql.exec("BEGIN");try{for(const s of ss)await s.run();sql.exec("COMMIT");}catch(e){sql.exec("ROLLBACK");throw e;}}};}
test("new lesson seed is atomic, retryable and never overwrites older or edited teaching data",async()=>{
  const db=database();await ensureSeptember29Lessons(db);
  const snapshot=()=>JSON.stringify(db.sql.prepare("SELECT * FROM notebook_cards ORDER BY card_id").all());const before=snapshot();
  const original=db.batch;let failed=false;db.batch=async(ss)=>{if(!failed){failed=true;throw Error("offline");}return original(ss);};
  await assert.rejects(ensureSeptember30Lessons(db),/offline/);assert.equal(snapshot(),before);await Promise.all([ensureSeptember30Lessons(db),ensureSeptember30Lessons(db)]);
  const c=data.cards.find(c=>c.tileQuestion),r=data.resources[0];
  assert.deepEqual(JSON.parse(db.sql.prepare("SELECT tile_question FROM notebook_cards WHERE card_id=?").get(c.id).tile_question),c.tileQuestion);
  db.sql.prepare("UPDATE notebook_cards SET answer='edited',tile_question='',deleted=1,sort_order=99 WHERE card_id=?").run(c.id);
  db.sql.prepare("DELETE FROM lesson_resources WHERE resource_id=?").run(r.id);
  await ensureSeptember30Lessons({prepare:db.prepare,batch:original});
  const row=db.sql.prepare("SELECT * FROM notebook_cards WHERE card_id=?").get(c.id);assert.equal(row.answer,"edited");assert.equal(row.tile_question,"");assert.equal(row.deleted,1);assert.equal(row.sort_order,99);
  assert.equal(db.sql.prepare("SELECT COUNT(*) n FROM lesson_resources WHERE resource_id=?").get(r.id).n,0);
  db.sql.close();
});
const indices=(codes)=>{const a=Array(34).fill(0);for(const c of codes){const suit="mpsz".indexOf(c[1]),number=c[0]==="0"?5:Number(c[0]);a[suit*9+number-1]++;}return a;};
function melds(a){const i=a.findIndex(n=>n);if(i<0)return true;if(a[i]>=3){const b=[...a];b[i]-=3;if(melds(b))return true;}if(i<27&&i%9<7&&a[i+1]&&a[i+2]){const b=[...a];b[i]--;b[i+1]--;b[i+2]--;if(melds(b))return true;}return false;}
function wins(a){return a.some((n,i)=>{if(n<2)return false;const b=[...a];b[i]-=2;return melds(b);});}
function waits(a){return a.flatMap((n,i)=>{if(n>=4)return[];const b=[...a];b[i]++;return wins(b)?[i]:[];});}
test("4p pon waiting shapes are independently decomposed, including exhausted wait tiles",()=>{
  // The screenshot is PRE-pon. Remove the two concealed 4p used in the pon,
  // not any other source tile, before checking the eight-tile post-pon waits.
  const hand=source.questions.find(q=>q.id==="four-pin-pon").tileQuestion.hand.slice(2);
  const discard=(c)=>{const a=indices(hand);a["mpsz".indexOf(c[1])*9+Number(c[0])-1]--;return waits(a);};
  assert.deepEqual(discard("6p"),[22]); // 5s, index 18+4
  assert.deepEqual(discard("5s"),[14,17]); // 6p/9p (shape), visible river further depletes them
});
