// Use the min-kiru replay/projector without duplicating board or scoring logic.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {canonicalToLessonTile as adapt,jsonBoardMarkup} from '../app/lib/json-board.mjs';
import {normalizeNagaEvaluation} from '../app/lib/naga-evaluation.mjs';
import {normalizeTileQuestion} from '../app/lib/tile-question.mjs';
import {SITE_ORIGIN} from '../app/lib/site-origin.mjs';
const [file,root]=process.argv.slice(2);assert.ok(file&&root);
const {generator:g,GENERATION_RULE_VERSION}=await import(pathToFileURL(resolve(root,'scripts/naga-generator-runtime.mjs')));
const {boardState:b}=await import(pathToFileURL(resolve(root,'scripts/naga-board-runtime.mjs')));
const raw=await readFile(file);assert.ok(raw.length<10485760);const report=JSON.parse(raw);
export const reportId='d6bd62a52540d10d042efb1c59eddb4fec1cf9192afeadfae3e13fa61f6a43b1v2_2';
// Coordinates, draw, dora and all fourteen/ thirteen tiles checked against the
// original video frames. Summary diagrams are not mislabelled as actual play.
const specs=[
 {id:'s90',ts:0,tv:17,left:61,dora:'ji5',draw:'man1',tiles:'aka1 aka2 ji1 man1 man1 man2 man2 man8 man8 pin8 sou1 sou1 sou3 sou5',question:'heavy-hand-ranking',answers:['8p']},
 {id:'s700',ts:1,tv:20,left:60,dora:'pin2',draw:null,tiles:'aka1 man1 man1 man5 pin1 pin2 pin3 pin3 pin3 pin4 sou2 sou3 sou6'},
 {id:'s1290',ts:4,tv:31,left:55,dora:'ji3',draw:'ji1',tiles:'ji1 man4 man8 pin2 pin2 pin5 pin7 pin8 pin9 sou4 sou6 sou6 sou7 sou9',question:'fold-one-safe',answers:['9p']},
 {id:'s2190',ts:10,tv:61,left:39,dora:'sou7',draw:'pin7',tiles:'aka1 aka2 man1 man2 pin2 pin3 pin4 pin4 pin5 pin5 pin6 pin7 sou6 sou8'},
 {id:'s2285',ts:10,tv:93,left:24,dora:'sou7',draw:'ji1',tiles:'aka1 aka2 ji1 pin2 pin3 pin4 pin4 pin5 pin5 pin6 pin7 sou4 sou6 sou8'},
 {id:'s2615',ts:12,tv:47,left:47,dora:'ji7',draw:'man8',tiles:'man3 man4 man5 man7 man8 pin2 pin2 pin3 pin4 pin4 sou4 sou4 sou6 sou8'},
 {id:'s3170',ts:13,tv:51,left:46,dora:'sou3',draw:'sou6',tiles:'man6 man6 man8 pin3 pin3 sou2 sou2 sou3 sou4 sou6 sou6 sou7 sou9 sou9'},
 {id:'s3550',ts:13,tv:123,left:10,dora:'sou3',draw:'pin4',tiles:'man3 man6 man6 pin3 pin3 pin3 pin4 pin6 sou2 sou3 sou4 sou6 sou6 sou6',question:'fold-leave-comeback',answers:['4p']},
 {id:'s3635',ts:14,tv:69,left:35,dora:'sou4',draw:'sou5',tiles:'aka2 man1 man1 man3 man4 man5 man6 pin1 pin2 pin3 pin3 pin7 pin9 sou5'},
 {id:'s3785',ts:15,tv:65,left:38,dora:'sou3',draw:'pin1',tiles:'aka1 ji6 ji6 man3 man4 man5 man7 man7 pin1 pin2 pin3 pin3 pin4 pin5'},
];
const boards={},tiles={},proof=[],sort=a=>[...a].sort();
await mkdir('public/materials/october-2026/boards',{recursive:true});
for(const s of specs){
 const entries=report.pred[s.ts],event=entries[s.tv].info.msg;
 const visible=g.replayKyoku(entries,s.tv+1,0),hand=[...visible.allHands[0]];
 assert.deepEqual(sort(hand),sort(s.tiles.split(' ')),s.id+': complete source hand mismatch');
 const draw=event.type==='tsumo'&&event.actor===0?g.tileToAppCode(event.pai):null;assert.equal(draw,s.draw);
 if(draw){const i=hand.indexOf(draw);assert.ok(i>=0);hand.splice(i,1);}
 let candidate=s.question?g.sceneCandidate(report,{reportId,tw:0,ts:s.ts,tv:s.tv,decisionType:'discard'}):
  {sourceReportId:reportId,tw:0,ts:s.ts,tv:s.tv,handBeforeDraw:hand,draw,melds:visible.allMelds[0],predictionType:event.type,decisionType:'call'};
 assert.ok(candidate);assert.ok(g.validateDiscardHand(candidate).valid);
 const scene=b.project(report,candidate);assert.ok(b.validate(scene,candidate).valid);
 assert.equal(scene.round.remaining,s.left);assert.equal(scene.doraIndicators[0],s.dora);
 scene.players.forEach(p=>{p.name='新人';p.rank='初級';p.rating=null;});assert.ok(b.validate(scene).valid);
 const url=SITE_ORIGIN+'/materials/october-2026/boards/'+s.id+'.svg';
 boards[url]={id:s.id,boardScene:scene};
 // Standalone backup image uses the same markup and approved asset bytes.
 // SVG-as-image cannot fetch nested remote images, so embed those exact PNGs.
 let standalone=jsonBoardMarkup(scene).replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" style="background:#05528b;fill:white;font-family:Yu Gothic,Meiryo,sans-serif" ')
  .replace('<defs>','<style>.dora-sheen-sweep-v333{display:none}</style><defs>');
 for(const m of [...standalone.matchAll(/href="(\/tiles\/[^\"]+)"/g)])standalone=standalone.replaceAll(m[0],'href="data:image/png;base64,'+(await readFile('public'+m[1])).toString('base64')+'"');
 await writeFile('public/materials/october-2026/boards/'+s.id+'.svg',standalone);
 if(s.question){
  const q={hand:scene.hand.tiles.filter(Boolean).map(adapt),...(draw?{draw:adapt(draw)}:{}),correctTiles:s.answers,boardScene:scene};
  const options=q.hand.concat(q.draw??[]);
  const models=candidate.models.map((m,i)=>({name:m.name,rates:Object.fromEntries([...new Set(options)].map(code=>{
   const rate=Object.entries(candidate.probabilities).find(([t])=>adapt(t)===code)?.[1]?.[i];assert.ok(Number.isFinite(rate));return[code,rate];
  }))}));
  q.naga=normalizeNagaEvaluation({kind:'discard',reportId,tw:0,ts:s.ts,tv:s.tv,handSnapshot:options,models},options);
  assert.ok(q.naga);assert.equal(q.naga.models.length,7);assert.ok(normalizeTileQuestion(q));tiles[s.question]=q;
 }
 proof.push({scene:s.id,source:scene.source,sourceFrameFullHandMatchPercent:100,drawMatched:true,doraMatched:true,remaining:s.left,hand:sort(hand),draw,validation:g.validateDiscardHand(candidate),models:s.question?tiles[s.question].naga.models.map(m=>m.name):[],instructorAnswers:s.answers??[],snapshotOnly:!s.question});
}
await writeFile('content/october-26-boards.json',JSON.stringify(boards,null,2)+'\n');
await writeFile('content/october-26-tiles.json',JSON.stringify(tiles,null,2)+'\n');
await writeFile('docs/october-26-naga-provenance.json',JSON.stringify({reportId,reportSha256:createHash('sha256').update(raw).digest('hex'),dataVersion:report.data_version,generationRuleVersion:GENERATION_RULE_VERSION,sharedRuntime:root,questions:proof,networkRequests:0,sourceReportsPublished:false},null,2)+'\n');
console.log(JSON.stringify({boards:proof.length,tileQuestions:Object.keys(tiles).length,models:7}));
