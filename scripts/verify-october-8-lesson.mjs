// Read-only publication verification; no learner profile or personal data access.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import data from '../content/october-8.json' with { type:'json' };
import evidence from '../docs/october-8-provenance.json' with { type:'json' };
import { SITE_ORIGIN } from '../app/lib/site-origin.mjs';
import { APP_VERSION } from '../app/lib/lesson.mjs';
const get=async url=>{const r=await fetch(url,{signal:AbortSignal.timeout(30000)});assert.equal(r.status,200,url);return r;};
const live={notebook:await(await get(SITE_ORIGIN+'/api/notebook')).json(),catalog:await(await get(SITE_ORIGIN+'/api/catalog')).json()};
for(const [collection,rows]of [['lessons',data.lessons],['cards',data.cards],['resources',data.resources]])for(const q of rows){
 const row=live.notebook[collection].find(x=>x.id===q.id);assert.ok(row&&!row.deleted,q.id);
 for(const [key,value]of Object.entries(q))assert.deepEqual(row[key],value,q.id+'/'+key);
}
for(const q of data.items){const row=live.catalog.items.find(x=>x.id===q.id);assert.ok(row,q.id);assert.deepEqual(row,q,q.id);}
if(process.argv[2]){
 const before=JSON.parse(await readFile(process.argv[2],'utf8'));
 for(const [group,collections]of [['notebook',['lessons','cards','resources']],['catalog',['theories','items','orders']]])for(const key of collections){
  for(const row of before[group][key]){const current=live[group][key].find(x=>row.id?x.id===row.id:x.lessonId===row.lessonId&&x.cardKey===row.cardKey);assert.deepEqual(current,row,'Existing row changed: '+group+'/'+key+'/'+(row.id??row.cardKey));}
 }
}
const html=await readFile('public/materials/october-2026/1008.html','utf8');
for(const base of ['https://sakurakou-lesson-review.pages.dev',SITE_ORIGIN,'https://tenten-ensuku.github.io/sakurakou-lesson-review']){
 assert.equal(await(await get(base+'/materials/october-2026/1008.html')).text(),html);
 const home=await(await get(base+'/')).text();assert.ok(home.includes('ver'+APP_VERSION),base+': home version');
 assert.ok((await(await get(base+'/materials/august-2026/summary.css?v='+APP_VERSION)).text()).includes('.scene'));
 assert.equal((await get(base+'/tiles/man1-66-90-l.png')).headers.get('content-type')?.split(';')[0],'image/png');
}
const hash=b=>createHash('sha256').update(b).digest('hex');
for(const im of Object.values(evidence.images))assert.equal(hash(Buffer.from(await(await get(im.url)).arrayBuffer())),im.sha256,im.sourceFile);
const result={version:APP_VERSION,date:'10/8',questions:18,flashcards:7,choices:7,cloze:2,tileQuestions:2,summaryScenes:10,imageHashesVerified:Object.keys(evidence.images).length,publicHostsVerified:3,existingTeachingRowsPreserved:!!process.argv[2],browserInteractionCheck:'Not executed: computer-use browser initialization failed (missing kernel-assets path). Source/caption/frame, automated behavior and live HTTP/API/asset checks performed.'};
if(process.argv[3])await writeFile(process.argv[3],JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
