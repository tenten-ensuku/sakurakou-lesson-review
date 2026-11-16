// The video, captions and full report stay in the private task directory.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {SITE_ORIGIN} from '../app/lib/site-origin.mjs';
import {canonicalToLessonTile as adapt,jsonBoardMarkup} from '../app/lib/json-board.mjs';
import {normalizeTileQuestion,tileOptions} from '../app/lib/tile-question.mjs';
import {nagaSourceUrl} from '../app/lib/naga-evaluation.mjs';
import {renderSeptemberMaterial} from './render-september-material.mjs';
import {lesson,reportId,tw,points,references} from '../content/november-15-source.mjs';

const [task,shared]=process.argv.slice(2);assert.ok(task&&shared);
const {generator:g,verifiedSceneCandidate,GENERATION_RULE_VERSION}=await import(pathToFileURL(resolve(shared,'scripts/naga-generator-runtime.mjs')));
const {boardState:b}=await import(pathToFileURL(resolve(shared,'scripts/naga-board-runtime.mjs')));
const raw=await readFile(join(task,'report.json'));assert.ok(raw.length<10485760);const report=JSON.parse(raw);
const meta=JSON.parse(await readFile(join(task,'JbCOa8wJQVQ.info.json')));assert.equal(meta.upload_date,'20261115');assert.equal(meta.channel,lesson.teacher);
const captions=await readFile(join(task,'captions.json'));
const canonicalDocuments=JSON.parse(await readFile(join(task,'canonical.json')));
const materialDir='public/materials/november-2026';
const summaryUrl=SITE_ORIGIN+'/materials/november-2026/1115.html';
const sourceUrl=nagaSourceUrl({reportId,tw,ts:0,tv:0}).split('&ts=')[0];
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const at=t=>lesson.videoUrl+'&t='+t+'s';
const sorted=a=>[...a].sort();
const data={lessons:[lesson],cards:[],items:[],resources:[]};
const proof={lessonDate:'2026-11-15',sources:[{id:meta.id,title:meta.title,channel:meta.channel,uploadDate:meta.upload_date,durationSeconds:meta.duration,url:lesson.videoUrl,captionCount:JSON.parse(captions).length,captionSha256:hash(captions)}],canonicalDocuments,
 method:'Complete auto-caption track read, decision frames individually checked against cached NAGA event replay. Explanations follow the teaching guide: compare the rejected option, state the condition and preserve acceptable alternatives.',
 naga:{reportId,providedSeat:0,lectureSeat:tw,reportSha256:hash(raw),reportBytes:raw.length,generationRuleVersion:GENERATION_RULE_VERSION,models:Object.values(report.naga_types),sourceReportPublished:false},
 questions:[],images:{}};
const boards={},summary=[],notes=[],prepared=[];
const imageCache=join(task,'images.json');
let uploads={};try{uploads=JSON.parse(await readFile(imageCache));}catch(e){if(e.code!=='ENOENT')throw e;}
await mkdir(join(task,'reviewed'),{recursive:true});
for(const [i,p] of points.entries()){
 const entries=report.pred[p.ts],event=entries[p.tv].info.msg;
 const replay=g.replayKyoku(entries,p.tv+1,tw),hand=[...replay.allHands[tw]];
 assert.deepEqual(sorted(hand),sorted(p.tiles.split(' ')),p.id+' full hand mismatch');
 const draw=event.type==='tsumo'&&event.actor===tw?g.tileToAppCode(event.pai):null;assert.equal(draw,p.draw,p.id);
 if(draw){const index=hand.indexOf(draw);assert.ok(index>=0);hand.splice(index,1);}
 assert.equal(replay.doraMarker,p.dora,p.id);
 // A read-only post-pon snapshot has discard-size hand, but does not expose
 // the interactive pre-call overlay or its two consumed-tile holes.
 const postPon=event.type==='pon'&&event.actor===tw;
 const candidate=p.answers?verifiedSceneCandidate(report,nagaSourceUrl({reportId,tw,ts:p.ts,tv:p.tv}),{decisionType:'discard'}):
  {sourceReportId:reportId,tw,ts:p.ts,tv:p.tv,decisionType:postPon?'discard':'call',predictionType:postPon?'snapshot':event.type,handBeforeDraw:hand,draw,melds:replay.allMelds[tw]};
 const physical=g.validateDiscardHand(candidate);assert.ok(physical.valid,p.id+' invalid hand: '+physical.errors);
 const scene=b.project(report,candidate);assert.ok(b.validate(scene,candidate).valid,p.id+' invalid scene');
 assert.equal(scene.source.tw,tw);assert.equal(scene.source.tv,p.tv);
 assert.equal(scene.round.remaining,p.left,p.id);assert.equal(scene.doraIndicators[0],p.dora,p.id);
 assert.deepEqual(sorted(scene.hand.tiles.filter(Boolean)),sorted(hand));assert.equal(scene.hand.draw,draw);
 scene.players.forEach(v=>{v.name='新人';v.rank='初級';v.rating=null;});assert.ok(b.validate(scene).valid);
 const id=(p.choices?'check':'card')+'-20261115-'+p.id;
 let tileQuestion;
 if(p.answers){
  assert.equal(candidate.decisionType,'discard');
  const q={hand:scene.hand.tiles.filter(Boolean).map(adapt),...(draw?{draw:adapt(draw)}:{}),correctTiles:p.answers,boardScene:scene};
  const handSnapshot=tileOptions(q);
  const models=candidate.models.map((model,index)=>({name:model.name,rates:Object.fromEntries([...new Set(handSnapshot)].map(code=>{
   const value=Object.entries(candidate.probabilities).find(([key])=>adapt(key)===code)?.[1]?.[index];
   assert.ok(Number.isFinite(value),p.id+' missing verified model rate');return [code,value];
  }))}));
  assert.deepEqual(models.map(m=>m.name),proof.naga.models);
  tileQuestion=normalizeTileQuestion({...q,naga:{kind:'discard',reportId,tw,ts:p.ts,tv:p.tv,handSnapshot,models}});
  assert.ok(tileQuestion,p.id+' invalid tile question');
 }
 // The app renders read-only diagrams inline from JSON. SVG is a standalone
 // fallback for the attachment URL, with the same approved PNG bytes.
 const boardUrl=SITE_ORIGIN+'/materials/november-2026/boards/'+p.id+'.svg';
 if(!p.answers){
  const original=jsonBoardMarkup(scene);
  let svg=original.replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" fill="white" font-family="Yu Gothic,Meiryo,sans-serif" ')
   .replace('<defs>','<style>.dora-sheen-sweep-v333{display:none}</style><defs>')
   .replace('<rect width="700" height="650" fill="transparent"','<rect width="700" height="650" fill="#05528b"');
  const assetMatches=[...new Map([...svg.matchAll(/href="(\/tiles\/[^"]+)"/g)].map(m=>[m[0],m])).values()];
  for(const [match,path] of assetMatches)svg=svg.replaceAll(match,'href="data:image/png;base64,'+(await readFile('public'+path)).toString('base64')+'"');
  boards[boardUrl]={id:p.id,boardScene:scene};
  prepared.push({path:materialDir+'/boards/'+p.id+'.svg',svg});
 }
 const question=p.question+(tileQuestion?'':'\n\n![出題場面の盤面]('+boardUrl+')');
 const answer=[p.answer,p.extra,at(p.explainAt),nagaSourceUrl(scene.source),...p.refs.map(k=>references[k].url)].join('\n\n');
 const sortOrder=i+1;
 if(p.choices){assert.equal(new Set(p.choices).size,4);assert.ok(p.choices[p.correctIndex]);data.items.push({id,theoryId:'',type:'choice',question,choices:p.choices,correctIndex:p.correctIndex,explanation:answer,lessonIds:[lesson.id],sortOrder,deleted:false,revision:1});}
 else data.cards.push({id,lessonId:lesson.id,kind:'question',question,answer,sortOrder,...(tileQuestion?{tileQuestion}:{})});
 proof.questions.push({appId:id,number:sortOrder,frameSeconds:p.at,explanationSeconds:p.explainAt,board:scene.source,event:event.type,remaining:p.left,sourceFrameFullHandMatchPercent:100,draw,dora:p.dora,physical,answerSource:'instructor',acceptedTiles:p.answers??null,canonicalSources:p.refs,manualReviewRequired:[]});
 const name='scene-'+p.at+'.png',original=join(task,'frames',name),reviewed=join(task,'reviewed',name);
 // Redact the four narrow name areas. Never cover/redraw the hand or melds.
 const masks=[[267,87,16,99],[580,71,90,16],[314,406,89,16],[696,360,24,96]];
 const filters=[...masks.map(([x,y,w,h])=>`drawbox=x=${x}:y=${y}:w=${w}:h=${h}:color=0x063653:t=fill`),'crop=650:545:155:0'].join(',');
 const crop=spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',original,'-vf',filters,'-frames:v','1',reviewed],{encoding:'utf8'});
 assert.equal(crop.status,0,crop.stderr);
}
if(process.argv.includes('--prepare-only')){console.log(JSON.stringify({prepared:points.length,questions:data.cards.length+data.items.length,models:proof.naga.models.length}));process.exit(0);}
for(const p of points){
 const name='scene-'+p.at+'.png',bytes=await readFile(join(task,'reviewed',name)),sha256=hash(bytes);
 if(uploads[name]?.sha256!==sha256){
  assert.ok(process.argv.includes('--upload-images'),'Review anonymized crops before uploading');
  const r=await fetch(SITE_ORIGIN+'/api/images',{method:'POST',headers:{'content-type':'image/png'},body:bytes,signal:AbortSignal.timeout(60000)});
  assert.ok(r.ok,'upload HTTP '+r.status);const {url}=await r.json();assert.ok(url.startsWith(SITE_ORIGIN+'/api/images/note-images/'));
  const check=await fetch(url,{signal:AbortSignal.timeout(30000)});assert.ok(check.ok);assert.equal(hash(Buffer.from(await check.arrayBuffer())),sha256);
  uploads[name]={url,sha256};await writeFile(imageCache,JSON.stringify(uploads,null,2)+'\n');
 }
 const {url}=uploads[name];
 proof.images[p.id]={url,sha256,at:p.at,caption:p.caption,width:650,height:545};
 summary.push({scene:p.id,title:p.title,text:p.answer+' '+p.extra});
 notes.push([`![${p.caption}](${url})`,p.title,p.answer+' '+p.extra,at(p.explainAt)].join('\n\n'));
}
for(let i=0;i<notes.length;i+=5)data.cards.push({id:'card-20261115-summary-'+(i/5+1),lessonId:lesson.id,kind:'note',question:'授業の要約 '+(i/5+1),answer:notes.slice(i,i+5).join('\n\n'),sortOrder:-3+i/5});
for(const q of [...data.cards,...data.items]){assert.ok(q.question.length<=2000);assert.ok((q.answer??q.explanation).length<=5000);}
data.resources.push({id:'resource-20261115-summary',lessonId:lesson.id,kind:'link',label:'授業の要約・盤面で振り返る'+points.length+'のポイント',url:summaryUrl,sortOrder:0});
data.resources.push({id:'resource-20261115-naga',lessonId:lesson.id,kind:'link',label:'NAGA解析（桜紅さん視点）',url:sourceUrl,sortOrder:1});
for(const [i,[key,r]] of Object.entries(references).entries())data.resources.push({id:'resource-20261115-'+key,lessonId:lesson.id,kind:'link',label:r.title,url:r.url,sortOrder:i+2});
await mkdir(materialDir+'/boards',{recursive:true});
for(const {path,svg} of prepared)await writeFile(path,svg+'\n');
for(const [path,obj] of [['content/november-15.json',data],['content/november-15-boards.json',boards],['docs/november-15-provenance.json',proof]])await writeFile(path,JSON.stringify(obj,null,2)+'\n');
await writeFile(materialDir+'/1115.html',renderSeptemberMaterial(proof,{lesson,summary,references}));
console.log(JSON.stringify({questions:points.length,tiles:data.cards.filter(c=>c.tileQuestion).length,images:summary.length,notes:data.cards.filter(c=>c.kind==='note').length}));
