// Verified read-only lesson illustrations. Cached NAGA report only; no uploads.
// Physical hands come exclusively from the shared replay. These snapshots do
// not create discard/call questions, recommendations or new grading rules.
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import content from "../content/october-15.json" with { type: "json" };
import { reportId } from "../content/october-15-source.mjs";
const [reportFile, root] = process.argv.slice(2);
assert.ok(reportFile && root);
const { generator:g } = await import(pathToFileURL(resolve(root,"scripts/naga-generator-runtime.mjs")));
const { boardState:b } = await import(pathToFileURL(resolve(root,"scripts/naga-board-runtime.mjs")));
const raw = await readFile(reportFile), report=JSON.parse(raw);
const specs=[
  {number:9,id:"check-20261015-kanchan-dama-context",ts:4,tv:66,hand:["man1","man2","man3","man3","man5","man6","man7","man8","pin3","pin4","pin5","sou3","sou3"],draw:null,dora:"pin2",remaining:40},
  {number:10,id:"check-20261015-dealer-eight-turn",ts:5,tv:55,hand:["man4","man4","man5","pin1","pin1","pin3","pin3","sou2","sou3","sou4","sou7","sou8","sou9"],draw:"man6",dora:"ji1",remaining:43},
  {number:11,id:"check-20261015-late-3900-call",ts:6,tv:50,hand:["man1","man2","man3","man4","aka1","man8","man8","pin6","pin6","sou2","sou3","ji2","ji2"],draw:null,dora:"man9",remaining:47},
  {number:15,id:"card-20261015-chiitoi-finisher",ts:8,tv:24,hand:["man1","man1","man2","man2","man3","man6","man8","man8","pin5","pin5","sou3","ji1","ji1"],draw:null,dora:"sou3",remaining:58},
  {number:16,id:"check-20261015-unpushable-dora",ts:8,tv:105,hand:["man1","man1","man2","man2","man3","man8","man8","man8","pin5","pin5","sou4","ji1","ji1"],draw:"man7",dora:"sou3",remaining:20},
  {number:17,id:"card-20261015-time-limited-safety",ts:8,tv:113,hand:["man1","man1","man2","man2","man3","man8","man8","man8","pin5","pin5","sou4","ji1","ji1"],draw:"pin3",dora:"sou3",remaining:16},
  {number:18,id:"check-20261015-effective-change-quality",ts:9,tv:57,hand:["man2","man3","man4","man4","man6","man6","pin5","sou5","sou6","sou7","sou7","sou8","sou9"],draw:"man1",dora:"sou5",remaining:43},
];
const sorted=v=>[...v].sort(),output={},proof=[];
for(const s of specs){
  const entries=report.pred[s.ts], msg=i=>entries[i].info.msg;
  let baseTv=s.tv;
  // The shared projector already handles reach acceptance inside a replay,
  // but expects a tile-action at its endpoint. Project the prior discard, then
  // apply only the following explicit acceptance metadata (no hand changes).
  while(msg(baseTv).type==="reach_accepted")baseTv--;
  const visible=g.replayKyoku(entries,baseTv+1,0),current=msg(baseTv);
  const draw=current.type==="tsumo"&&current.actor===0?g.tileToAppCode(current.pai):null;
  const hand=[...visible.allHands[0]];
  if(draw){const i=hand.indexOf(draw);assert.ok(i>=0);hand.splice(i,1);}
  assert.deepEqual(sorted(hand),sorted(s.hand),s.id+": source hand mismatch");assert.equal(draw,s.draw);
  // The shared physical validator's 13 (+ optional draw) contract is reused
  // for an observed snapshot. It is not persisted as a call decision.
  const candidate={sourceReportId:reportId,tw:0,ts:s.ts,tv:baseTv,handBeforeDraw:hand,draw,melds:visible.allMelds[0],predictionType:current.type,decisionType:"call"};
  const physical=g.validateDiscardHand(candidate);assert.ok(physical.valid);
  const scene=b.project(report,candidate);assert.ok(b.validate(scene,candidate).valid);
  for(let tv=baseTv+1;tv<=s.tv;tv++){
    const event=msg(tv);assert.equal(event.type,"reach_accepted");
    scene.players.forEach(p=>{p.score=event.scores[p.seat];if(p.seat===event.actor)p.reached=true;});
    scene.round.kyotaku++;scene.round.remaining=event.left_hai_num;
    scene.source.tv=tv;
  }
  assert.deepEqual(sorted(g.replayKyoku(entries,s.tv+1,0).allHands[0]),sorted(scene.hand.tiles.filter(Boolean).concat(scene.hand.draw||[])));
  assert.equal(scene.doraIndicators[0],s.dora);assert.equal(scene.round.remaining,s.remaining);
  scene.players.forEach(p=>{p.name="新人";p.rank="初級";p.rating=null;});
  assert.ok(b.validate(scene).valid);
  const row=[...content.cards,...content.items].find(q=>q.id===s.id);
  const url=row.question.match(/!\[[^\]]*\]\((https:[^)]+)\)/)?.[1];assert.ok(url);
  output[url]={id:s.id,number:s.number,boardScene:scene};
  proof.push({id:s.id,number:s.number,imageUrl:url,source:scene.source,sourceEvent:msg(s.tv).type,hand:s.hand,draw:s.draw,dora:s.dora,remaining:s.remaining,sourceFrameHandMatchPercent:100,physicalValidation:physical,sceneValidation:b.validate(scene),grading:"Existing lesson question unchanged; read-only illustration only"});
}
await writeFile("content/verified-board-illustrations.json",JSON.stringify(output,null,2)+"\n");
await writeFile("docs/october-15-illustrations-provenance.json",JSON.stringify({checkedAt:"2026-10-16",reportSha256:createHash("sha256").update(raw).digest("hex"),networkRequests:0,imageUploads:0,questions:proof},null,2)+"\n");
console.log(JSON.stringify({verified:proof.length,networkRequests:0,imageUploads:0}));
