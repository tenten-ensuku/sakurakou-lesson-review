import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { lessonStudyEntries, resumeStudySession, resumableStudySessions, studyResults } from "../app/lib/study-session.mjs";
import { sanitizeEvent } from "../worker/learning-api.mjs";
import { progressFrom } from "../app/lib/progress.mjs";
const cards = [
  { id:"summary", source:"custom", kind:"note", sortOrder:0 },
  { id:"a", source:"custom", kind:"question", sortOrder:1 },
  { id:"section", source:"custom", kind:"section", sortOrder:2 },
  { id:"b", source:"custom", kind:"question", sortOrder:4, tileQuestion:{ hand:["8p"], correctTiles:["8p"] } },
  { id:"deleted", source:"custom", kind:"question", deleted:true },
];
const checks = [{ id:"c", sortOrder:2 }, { id:"d", sortOrder:3 }, { id:"gone", deleted:true }];
const a="lesson:custom:a",b="lesson:custom:b",note="lesson:custom:summary";
const keys=[a,"check:c","check:d",b];
const session = (value={}) => ({ id:"session-test", slot:"flash:lesson", lessonId:"lesson", mode:"flash", keys:[note,a,"lesson:custom:section",b], index:0, elapsed:98, revealed:true, picks:{}, ratings:{}, tilePicks:{}, completed:false, reviewOnly:false, ...value });

test("mixed study starts at a real question and interleaves formats by shared order",()=>{
  const before=structuredClone({cards,checks});
  assert.deepEqual(lessonStudyEntries("lesson",cards,checks).map(e=>e.key),keys);
  assert.deepEqual(lessonStudyEntries("lesson",cards,checks).map(e=>e.type),["flash","check","check","flash"]);
  assert.deepEqual({cards,checks},before);
  assert.deepEqual(lessonStudyEntries("lesson",cards,checks,[{lessonId:"lesson",cardKey:b,sortOrder:0}]).map(e=>e.key),[b,a,"check:c","check:d"]);
  assert.deepEqual(lessonStudyEntries("lesson",cards.filter(c=>c.kind!=="question"),[]),[]);
});
test("legacy resume removes notes without skipping the following question",()=>{
  for(const [index,target] of [[0,a],[1,a],[2,b],[3,b]]) {
    const old=session({index}); const next=resumeStudySession(old,keys,"mixed");
    assert.equal(next.keys[next.index],target);
    assert.equal(next.revealed,[1,3].includes(index));
    assert.equal(next.elapsed,98);assert.equal(next.id,old.id);
    assert.deepEqual(next.keys,[a,b,"check:c","check:d"]);
  }
  assert.equal(resumeStudySession(session({keys:[note]}),keys,"mixed"),null);
  const atEnd=resumeStudySession(session({keys:[a,b,note],index:2}),keys,"mixed");
  assert.equal(atEnd.keys[atEnd.index],b);assert.equal(atEnd.revealed,false);
});
test("legacy choice resume and mixed answer state remain stable across checkpoints",()=>{
  const old=session({mode:"check",keys:["c","d"],index:1,picks:{c:2},ratings:{[a]:"known"}});
  const next=resumeStudySession(old,keys,"mixed");
  assert.equal(next.keys[next.index],"check:d");assert.deepEqual(next.picks,old.picks);assert.deepEqual(next.ratings,old.ratings);
  const mixed=resumeStudySession(session({mode:"mixed",keys,index:3,tilePicks:{[b]:0},ratings:{[a]:"again"},picks:{c:2,d:0}}),keys,"mixed");
  const e={id:"event-test",type:"session",at:"2026-09-30T08:00:00Z",session:mixed};
  const sanitized=sanitizeEvent(e,{items:[],theories:[]},Date.parse("2026-09-30T09:00:00Z"));
  assert.ok(sanitized);assert.equal(sanitized.session.mode,"mixed");
  assert.deepEqual(progressFrom([sanitized,sanitized]).sessions[mixed.slot].tilePicks,{[b]:0});
  assert.deepEqual(studyResults({...mixed,ratings:{[a]:"known",unrelated:"known"},picks:{c:2,unrelated:0}},[{id:"c",correctIndex:2}]),{answered:2,known:2,remaining:2});
});
test("completed unified sessions do not revive old format checkpoints",()=>{
  const old=session({updatedAt:"2026-09-29T00:00:00Z"});
  const next={...old,mode:"mixed",slot:"mixed:lesson",completed:true,updatedAt:"2026-09-30T00:00:00Z"};
  assert.deepEqual(resumableStudySessions([old,next]),[]);
  const review={...old,id:"review-session",reviewOnly:true,updatedAt:"2026-09-30T01:00:00Z"};
  assert.deepEqual(resumableStudySessions([old,next,review]),[review]);
});
test("all shipped lesson cards exclude notes from study without removing source materials",()=>{
  for(const file of ["content/august-2026.json","content/september-2026.json","content/september-29.json","content/september-30.json"]) {
    const data=JSON.parse(readFileSync(file,"utf8"));
    for(const l of data.lessons) {
      const cs=data.cards.filter(c=>c.lessonId===l.id).map(c=>({...c,source:"custom"}));
      const entries=lessonStudyEntries(l.id,cs,data.checks??data.items??[]);
      for(const c of cs.filter(c=>c.kind!=="question"))assert.ok(!entries.some(e=>e.key===`${l.id}:custom:${c.id}`));
      assert.ok(cs.some(c=>c.kind==="note"));
    }
  }
});
test("one-click entry, separate notes and contiguous selectable image hand are wired",()=>{
  const page=readFileSync("app/page.tsx","utf8"),css=readFileSync("app/notebook.css","utf8"),tile=readFileSync("app/TileQuestion.tsx","utf8");
  assert.match(page,/onStudy=\{\(\) => \{ if \(status.total\) studyLesson\(l\)/);
  assert.match(page,/openSession\(l, "mixed"\)/);
  assert.match(page,/view === "notes"/);
  assert.doesNotMatch(page,/フラッシュカードを始める|四択・穴埋めを始める/);
  assert.match(css,/\.tile-choice-row \{[^}]*flex-wrap: nowrap; gap: 0;/);
  assert.match(css,/\.tile-choice-row button \{[^}]*padding: 0; border: 0;/);
  assert.match(css,/\.tile-hand-preview \{[^}]*flex-wrap: nowrap; gap: 0;/);
  assert.match(tile,/tile-choice-scroll/);
  assert.match(tile,/\/tiles\/\$\{tileFile\(code\)\}/);
});
