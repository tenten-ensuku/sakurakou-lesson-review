// Reuse the cached report and shared replay; never infer rates from video bars.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { questions } from '../content/october-8-source.mjs';
import { normalizeNagaEvaluation, nagaSourceUrl } from '../app/lib/naga-evaluation.mjs';
import { tileOptions } from '../app/lib/tile-question.mjs';
const [reportFile,runtimeFile]=process.argv.slice(2);
assert.ok(reportFile&&runtimeFile);
const bytes=await readFile(resolve(reportFile));
assert.ok(bytes.length<10485760);
const report=JSON.parse(bytes);
const runtime=pathToFileURL(resolve(runtimeFile));
const {generator,GENERATION_RULE_VERSION}=await import(runtime.href);
const reportId='55dcc4f273b5505306277ed1c64fb5c87fff7b6883edebb127eb2cfcddb48f05v2_2';
const honors={ji1:'1z',ji2:'2z',ji3:'3z',ji4:'4z',ji5:'6z',ji6:'5z',ji7:'7z'};
const adapt=t=>t==null?null:honors[t]??(/^aka[123]$/.test(t)?'0'+'mps'[Number(t[3])-1]:t.replace(/^(man|pin|sou)([1-9])$/,(x,s,n)=>n+{man:'m',pin:'p',sou:'s'}[s]));
const sorted=a=>[...a].sort();
const data={},evidence=[];
for(const q of questions.filter(q=>q.tileQuestion)){
 const tq=q.tileQuestion;
 const c=generator.sceneCandidate(report,{reportId,...tq.source,decisionType:'discard'});
 assert.ok(c?.handValidation?.valid,q.id+': invalid replay');
 assert.equal(c.decisionType,'discard');
 assert.deepEqual(sorted(c.handBeforeDraw.map(adapt)),sorted(tq.hand),q.id+': source hand mismatch');
 assert.equal(adapt(c.draw),tq.draw,q.id+': draw mismatch');
 assert.equal(adapt(c.doraMarker),tq.source.dora,q.id+': dora mismatch');
 const options=tileOptions(tq);
 const models=c.models.map((m,i)=>({name:m.name,rates:Object.fromEntries([...new Set(options)].map(code=>{
  const original=Object.entries(c.probabilities).find(([t])=>adapt(t)===code);
  assert.ok(original&&Number.isFinite(original[1][i]),q.id+': missing exact rate');
  return [code,original[1][i]];
 }))}));
 const ev=normalizeNagaEvaluation({kind:'discard',reportId,tw:c.tw,ts:c.ts,tv:c.sourceTv,handSnapshot:options,models},options);
 assert.ok(ev);data[q.id]=ev;
 evidence.push({appId:'card-20261008-'+q.id,sourceUrl:nagaSourceUrl(ev),handMatchPercent:100,drawMatched:true,doraMatched:true,doraMarker:adapt(c.doraMarker),validation:c.handValidation,instructorAnswers:tq.correctTiles,modelRecommendations:c.models.map(m=>({name:m.name,recommendation:adapt(m.recommendation)}))});
}
const hash=b=>createHash('sha256').update(b).digest('hex');
await writeFile('content/october-8-naga.json',JSON.stringify(data,null,2)+'\n');
await writeFile('docs/october-8-naga-provenance.json',JSON.stringify({reportId,reportSha256:hash(bytes),reportBytes:bytes.length,targetSeat:1,generationRuleVersion:GENERATION_RULE_VERSION,sharedGeneratorSha256:hash(await readFile(new URL('../public/naga-generator-v44.js',runtime))),networkBudget:{requests:1,maxBytes:10485760,usedCachedReport:true},checkedAt:'2026-10-08',limitations:['Video contains edited viewer hands. Only these two exact hand/draw/dora matches carry NAGA rates. No rates from another event are reused.'],questions:evidence},null,2)+'\n');
console.log(JSON.stringify({matched:evidence.length,handDrawDora:'100%'}));
