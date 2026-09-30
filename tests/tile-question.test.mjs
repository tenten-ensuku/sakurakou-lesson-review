import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { normalizeTileQuestion, normalizeTileBoard, boardHandBounds, savedTilePick, tileQuestionSignature, parseTileCodes, tileOptions, tileAnswer, tileFile, tileName } from "../app/lib/tile-question.mjs";
import { handleAdminApi } from "../worker/admin-api.mjs";
import { sanitizeEvent } from "../worker/learning-api.mjs";
import { progressFrom, canRate } from "../app/lib/progress.mjs";
import { NOTEBOOK_SCHEMA_SQL } from "../db/schema.mjs";

test("tile choices use the approved assets, correct honor map and dedicated red fives", () => {
  for (const code of parseTileCodes("123456789m123456789p123456789s1234567z0m0p0s")) assert.ok(existsSync("public/tiles/" + tileFile(code)),code);
  assert.equal(tileName("5z"),"発");assert.equal(tileName("6z"),"白");assert.equal(tileName("7z"),"中");
  assert.equal(tileFile("0m"),"aka1-66-90-l.png");assert.equal(tileFile("0p"),"aka2-66-90-l.png");assert.equal(tileFile("0s"),"aka3-66-90-l.png");
  assert.equal(tileFile("0z"),null);assert.equal(tileFile("../../a"),null);
  const approvedHashes=["0785c1b3cfe5dedd1baeae394590c8cf190b09912f97c47a4628cc8b2896fe8e","207e034ecdb8a214a73125de28651067fae053acca3294e08b2fa3597d53a726","cf8113f7f08a78c1584c743bfbf3787556302aecaf643ffa0c507a5c563b25a3"];
  for(const n of [1,2,3]) assert.equal(createHash("sha256").update(readFileSync(`public/tiles/aka${n}-66-90-l.png`)).digest("hex"),approvedHashes[n-1]);
});
test("tile question validation rejects malformed hands, absent answers and five copies including red",()=>{
  const q={hand:parseTileCodes("550m89p"),correctTiles:["5m"]};
  assert.ok(normalizeTileQuestion(q));
  assert.deepEqual(parseTileCodes("234m 567p 1z"),["2m","3m","4m","5p","6p","7p","1z"]);
  for(const text of ["東","234q","2m<a>","0z",""])assert.equal(parseTileCodes(text),null);
  for(const bad of [{...q,correctTiles:["9m"]},{...q,hand:parseTileCodes("55550m")},{...q,draw:"0z"},{...q,correctTiles:[]},{...q,hand:Array(15).fill("1m")}])assert.equal(normalizeTileQuestion(bad),null);
  assert.equal(tileAnswer(q,-1),null);assert.equal(tileAnswer(q,99),null);
});
test("identical tile copies grade by code, while red fives are kept distinct and allowed answers are explicit",()=>{
  const q={hand:["5m","0m","8p","9p","8p"],draw:"9p",correctTiles:["8p","9p"]};
  assert.deepEqual(tileOptions(q),["5m","0m","8p","9p","8p","9p"]);
  for(const i of [2,3,4,5])assert.equal(tileAnswer(q,i).correct,true);
  for(const i of [0,1])assert.equal(tileAnswer(q,i).correct,false);
  assert.equal(tileAnswer({...q,correctTiles:["5m"]},1).correct,false);
});
const board = { imageUrl: "https://example.com/original.jpg", width: 760, height: 614, regions: [{ x: 219, y: 530, width: 27, height: 37 }, { x: 246, y: 530, width: 27, height: 37 }] };
test("source-board maps preserve exact pixels and reject unsafe, mismatched or overlapping regions",()=>{
  const q={hand:["3s","4s"],correctTiles:["3s"],board};
  assert.deepEqual(normalizeTileQuestion(q),q);
  assert.deepEqual(boardHandBounds(board),{x:219,y:530,width:54,height:37});
  for(const bad of [{...board,imageUrl:"javascript:alert(1)"},{...board,regions:board.regions.slice(1)},{...board,width:200},{...board,regions:[board.regions[0],board.regions[0]]},{...board,regions:[board.regions[0],{x:246,y:530,width:-27,height:37}]},{...board,regions:[board.regions[0],{x:246,y:NaN,width:27,height:37}]}])assert.equal(normalizeTileBoard(bad,2),null);
  assert.equal(normalizeTileQuestion({...q,hand:["3s"]}),null);
});
test("tile selection answers immediately below the preserved board, without a confirm or flip",()=>{
  const page=readFileSync("app/page.tsx","utf8"),tile=readFileSync("app/TileQuestion.tsx","utf8"),editor=readFileSync("app/TileQuestionEditor.tsx","utf8");
  assert.doesNotMatch(tile,/この牌で答える|setSelected|確定前/);
  assert.match(tile,/onClick=\{\(\) => choose\(i\)\}/);
  assert.match(page,/currentCard\.tileQuestion \? <>[\s\S]*?<TileQuestion[\s\S]*?tile-feedback/);
  assert.match(page,/record\("review", \{ target: activeKey, active: !result.correct/);
  assert.match(page,/ratings: \{ \.\.\.r\.ratings, \[activeKey\]: result.correct \? "known" : "again" \}/);
  assert.match(editor,/value\?\.board \? JSON.stringify\(value.board/);
});
test("submitted tile choice survives local progress, server sanitation and duplicate session synchronization",()=>{
  const key="lesson-20260930-tenten:custom:card-20260930-safe-five-pin";
  const q={hand:parseTileCodes("223m12p123889s77z"),draw:"9p",correctTiles:["9p"]};
  const session={id:"session-test",slot:"lesson-20260930-tenten:flash:all",lessonId:"lesson-20260930-tenten",mode:"flash",keys:[key],index:0,elapsed:20,revealed:true,picks:{},tilePicks:{[key]:13},tileSignatures:{[key]:tileQuestionSignature(q)},ratings:{},completed:false,reviewOnly:false};
  const event={id:"event-test",type:"session",at:"2026-09-30T08:00:00Z",session};
  const sanitized=sanitizeEvent(event,{items:[],theories:[]},Date.parse("2026-09-30T09:00:00Z"));
  assert.deepEqual(sanitized.session.tilePicks,{[key]:13});
  assert.deepEqual(sanitized.session.tileSignatures,session.tileSignatures);
  assert.equal(savedTilePick(sanitized.session,key,q),13);
  assert.equal(savedTilePick({...session,tileSignatures:{}},key,q),undefined);
  assert.equal(savedTilePick(session,key,{...q,draw:"8p"}),undefined);
  assert.deepEqual(progressFrom([sanitized,sanitized]).sessions[session.slot].tilePicks,{[key]:13});
  assert.equal(sanitizeEvent({...event,session:{...session,tilePicks:{[key]:14}}},{items:[],theories:[]}),null);
  assert.equal(sanitizeEvent({...event,session:{...session,tilePicks:{other:0}}},{items:[],theories:[]}),null);
  assert.equal(canRate(false,false,false),false);assert.equal(canRate(true,false,false),true);
});
function database(){
  const sql=new DatabaseSync(":memory:");
  const prepare=(q,v=[])=>({bind:(...w)=>prepare(q,w),run:async()=>sql.prepare(q).run(...v),all:async()=>({results:sql.prepare(q).all(...v)})});
  return {sql,prepare,batch:async(ss)=>{sql.exec("BEGIN");try{for(const s of ss)await s.run();sql.exec("COMMIT");}catch(e){sql.exec("ROLLBACK");throw e;}}};
}
test("additive DB migration, shared tile editing, text-only edit preservation and soft restoration",async()=>{
  const db=database(), lessonId="lesson-test-tile-editor";
  // Simulate the production v35 table, which has no tile_question column.
  for(const s of NOTEBOOK_SCHEMA_SQL)db.sql.exec(s.replace("    tile_question TEXT NOT NULL DEFAULT '',\n",""));
  const call=async(path,method="GET",body)=>{const r=await handleAdminApi(new Request("https://test.example"+path,{method,headers:{"content-type":"application/json"},...(body?{body:JSON.stringify(body)}:{})}),{DB:db});return {status:r.status,data:await r.json()};};
  const q={hand:["8p","9p"],correctTiles:["8p","9p"],board};
  let r=await call(`/api/lessons/${lessonId}/cards`,"POST",{kind:"question",question:"which?",answer:"answer",tileQuestion:q});
  assert.equal(r.status,200);const id=r.data.card.id,path=`/api/lessons/${lessonId}/cards/${id}`;
  const row=()=>db.sql.prepare("SELECT * FROM notebook_cards WHERE card_id=?").get(id);
  assert.deepEqual(JSON.parse(row().tile_question),q);
  assert.equal((await call(path,"PUT",{kind:"question",question:"edited text",answer:"edited answer"})).status,200);
  assert.deepEqual(JSON.parse(row().tile_question),q);
  assert.equal((await call(path,"PUT",{kind:"question",question:"bad",answer:"bad",tileQuestion:{hand:["8p"],correctTiles:["1m"]}})).status,400);
  assert.equal(row().question,"edited text");
  const old={kind:"question",question:"edited text",answer:"edited answer",tileQuestion:q};
  assert.equal((await call(path,"PUT",{kind:"question",question:"guarded text",answer:"guarded answer",tileQuestion:q,expected:old})).status,200);
  assert.equal((await call(path,"PUT",{kind:"question",question:"stale overwrite",answer:"bad",tileQuestion:q,expected:old})).status,409);
  assert.equal(row().question,"guarded text");
  await call(path,"DELETE");assert.equal(row().deleted,1);await call(path+"/restore","POST",{});assert.equal(row().deleted,0);assert.deepEqual(JSON.parse(row().tile_question),q);
  const notebook=(await call("/api/notebook")).data;assert.deepEqual(notebook.cards.find(c=>c.id===id).tileQuestion,q);
  const resource=(await call(`/api/lessons/${lessonId}/resources`,"POST",{kind:"link",label:"original",url:"https://example.com/old"})).data.resource;
  const rp=`/api/lessons/${lessonId}/resources/${resource.id}`;
  assert.equal((await call(rp,"PUT",{kind:"link",label:"corrected",url:"https://example.com/new",expected:{kind:"link",label:resource.label,url:resource.url}})).status,200);
  assert.equal((await call(rp,"PUT",{kind:"link",label:"stale",url:"https://example.com/bad",expected:{kind:"link",label:resource.label,url:resource.url}})).status,409);
  assert.equal((await call(path,"PUT",{kind:"note",question:"scene note",answer:"note",tileQuestion:null})).status,200);assert.equal(row().tile_question,"");
  assert.equal((await call(path,"PUT",{kind:"question",question:"which?",answer:"answer",tileQuestion:q})).status,200);
  await call(path,"PUT",{kind:"question",question:"normal card",answer:"normal",tileQuestion:null});assert.equal(row().tile_question,"");
  db.sql.close();
});
