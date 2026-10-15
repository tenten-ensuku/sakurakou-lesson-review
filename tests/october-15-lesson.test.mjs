import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,existsSync} from 'node:fs';
import data from '../content/october-15.json' with {type:'json'};
import evidence from '../docs/october-15-provenance.json' with {type:'json'};
import nagaEvidence from '../docs/october-15-naga-provenance.json' with {type:'json'};
import * as source from '../content/october-15-source.mjs';
import {ensureOctober15Lessons,october15CheckStatements} from '../worker/october-15-lessons.mjs';
import {ensureOctober8Lessons,october8CheckStatements} from '../worker/october-8-lessons.mjs';
import {NOTEBOOK_SCHEMA_SQL} from '../db/schema.mjs';
import {LEARNING_SCHEMA_SQL} from '../db/learning-schema.mjs';
import {APP_VERSION,sortLessons} from '../app/lib/lesson.mjs';
import {normalizeTileQuestion,tileAnswer,tileOptions,tileFile} from '../app/lib/tile-question.mjs';
import {lessonStudyEntries} from '../app/lib/study-session.mjs';
import {sourceBoardEvaluation,nagaModelIndex} from '../app/lib/theory-evaluation.mjs';
import {renderSeptemberMaterial} from '../scripts/render-september-material.mjs';
import {materialDetails,isFeaturedMaterial} from '../app/lib/materials.mjs';
const card=id=>data.cards.find(q=>q.id==='card-20261015-'+id);
test('10/15 is one newest class with both parts and eighteen mixed questions, never a summary first',()=>{
 assert.equal(data.lessons.length,1);assert.equal(source.lesson.date,'10/15');assert.equal(source.lesson.teacher,'ねじまき鳥');
 assert.equal(sortLessons([source.lesson,{date:'10/8',title:'old'}])[0].id,source.lesson.id);
 assert.deepEqual(source.videos.map(v=>v.id),['guKgCOJ_Kng','yOVM-RWRlYE']);
 const entries=lessonStudyEntries(source.lesson.id,data.cards.map(c=>({...c,source:'custom'})),data.items);
 assert.equal(entries.length,18);assert.ok(entries[0].key.endsWith('wide-or-open'));
 assert.ok(entries.every(e=>!e.key.includes('summary')));assert.equal(data.cards.filter(c=>c.kind==='note').length,2);
 const questions=[...data.cards.filter(c=>c.kind==='question'),...data.items];
 assert.deepEqual(questions.sort((a,b)=>a.sortOrder-b.sortOrder).map(q=>q.sortOrder),Array.from({length:18},(_,i)=>i+1));
 assert.equal(new Set(questions.map(q=>q.id)).size,18);
 assert.equal(data.cards.filter(c=>c.tileQuestion).length,7);assert.equal(data.items.filter(c=>c.type==='choice').length,5);assert.equal(data.items.filter(c=>c.type==='cloze').length,2);
 for(const q of data.items){assert.equal(new Set(q.choices).size,4);assert.ok(q.choices[q.correctIndex]);if(q.type==='cloze')assert.ok(q.question.includes('［　］'));}
 for(const q of [...data.cards,...data.items]){assert.ok(q.question.length<=2000);assert.ok((q.answer??q.explanation).length<=5000);}
 for(const v of source.videos)assert.ok(data.resources.some(r=>r.url===v.url));
 assert.ok(data.resources.every(r=>r.kind==='link'||r.kind==='image'));
 assert.ok(isFeaturedMaterial(data.resources[0]));assert.equal(materialDetails(data.resources[0]).service,'授業のまとめ');
});
test('seven exact NAGA matches preserve red tiles, post-pon counts, allowed alternatives and Nishiki default',()=>{
 assert.equal(nagaEvidence.questions.length,7);assert.equal(nagaEvidence.networkBudget.requests,1);assert.equal(nagaEvidence.targetSeat,0);
 const coordinates=new Set();
 for(const c of data.cards.filter(c=>c.tileQuestion)){
  const q=c.tileQuestion,proof=nagaEvidence.questions.find(p=>p.appId===c.id);
  assert.deepEqual(normalizeTileQuestion(q),q);assert.equal(proof.handMatchPercent,100);assert.ok(proof.drawMatched&&proof.doraMatched&&proof.validation.valid);
  const identity=JSON.stringify([q.naga.reportId,q.naga.tw,q.naga.ts,q.naga.tv]);assert.ok(!coordinates.has(identity));coordinates.add(identity);
  assert.deepEqual(q.naga.handSnapshot,tileOptions(q));assert.deepEqual(q.naga.models.map(m=>m.name),['オメガ','ニシキ']);assert.equal(nagaModelIndex(q.naga),1);
  const pick=tileOptions(q).findIndex(t=>q.correctTiles.includes(t));assert.equal(tileAnswer(q,pick).correct,true);
  const overlay=sourceBoardEvaluation(q,pick);assert.equal(overlay.modelName,'ニシキ');assert.equal(overlay.tiles.length,tileOptions(q).length);
  for(const t of tileOptions(q))assert.ok(existsSync('public/tiles/'+tileFile(t)));
  for(const r of q.board.regions)assert.ok(r.x>=0&&r.x+r.width<=q.board.width&&r.y+r.height<=q.board.height);
  assert.ok(c.question.includes(q.board.imageUrl));
 }
 assert.ok(card('wide-or-open').tileQuestion.hand.includes('0s'));
 assert.deepEqual(card('wide-or-open').tileQuestion.correctTiles,['7m','9p']);
 assert.deepEqual(card('four-block-honitsu').tileQuestion.correctTiles,['5p','3s']);
 const pon=card('pon-5800').tileQuestion;assert.equal(pon.hand.length,11);assert.equal(pon.draw,undefined);assert.equal(nagaEvidence.questions.find(q=>q.appId.endsWith('pon-5800')).immediateCallDiscard,true);
 assert.deepEqual(card('skip-nine-vs-honors').tileQuestion.hand,['1m','1m','2m','6m','8m','9m','7p','2s','2s','5s','3z','6z','7z']);
 assert.doesNotMatch(JSON.stringify(data),/比屋定|simon|けんぬ|playerName|rating/);
});
test('summary uses fourteen screenshot-before-explanation scenes and the correct part/time for each source link',()=>{
 const material={...source,summary:source.summary.map(s=>({...s,videoUrl:source.videos.find(v=>v.part===source.scenes[s.scene].part).url}))};
 const html=renderSeptemberMaterial(evidence,material);assert.equal(readFileSync('public/materials/october-2026/1015.html','utf8'),html);assert.ok(html.includes(`data-app-version="${APP_VERSION}"`));
 const sections=[...html.matchAll(/<article class="scene"[^>]*>([\s\S]*?)<\/article>/g)];assert.equal(sections.length,14);
 for(const [i,[,section]]of sections.entries()){
  const s=source.scenes[source.summary[i].scene],v=source.videos.find(v=>v.part===s.part);
  assert.ok(section.indexOf('<figure>')<section.indexOf('class="scene-explanation"'));assert.ok(section.includes(v.url+'&amp;t='+s.at+'s'));
 }
 assert.match(html,/前半をYouTubeで見る/);assert.match(html,/後半をYouTubeで見る/);
 for(const q of [...data.cards.filter(c=>c.kind==='question'),...data.items])if(q.question.includes('!['))assert.match(q.question,/!\[出題場面の盤面/);
 assert.doesNotMatch(card('double-decomposition').question,/!\[/);assert.match(card('double-decomposition').answer,/!\[/);
 assert.match(card('keep-sanmenchan').answer,/ヘッドレス1型/);assert.match(card('keep-sanmenchan').answer,/後で訂正/);
 assert.equal(evidence.sources[0].uploadDate,'20261010');assert.equal(evidence.sources[1].uploadDate,'20261015');
 assert.ok(evidence.canonicalDocuments.every(d=>d.revisionId&&d.checkedAt==='2026-10-16'));
 assert.ok(evidence.canonicalDocuments.find(d=>d.title.startsWith('セオリー')).tabs.some(t=>t.empty));
});
// Independent one-suit 2-meld-and-pair enumeration, not copied from NAGA rates.
function wins(values){
 const c=Array.from({length:9},(_,i)=>values.filter(n=>n===i+1).length);if(c.some(n=>n>4))return false;
 const meld=a=>{const i=a.findIndex(n=>n);if(i<0)return true;if(a[i]>=3){a[i]-=3;if(meld(a))return true;a[i]+=3;}if(i<7&&a[i+1]&&a[i+2]){a[i]--;a[i+1]--;a[i+2]--;if(meld(a))return true;a[i]++;a[i+1]++;a[i+2]++;}return false;};
 for(let i=0;i<9;i++)if(c[i]>=2){const a=[...c];a[i]-=2;if(meld(a))return true;}return false;
}
test('seven-tile waiting improvements exclude a nonexistent fifth 3s',()=>{
 const waits=draw=>{const hand=[3,3,3,4,5,5,draw];return Array.from({length:9},(_,i)=>i+1).filter(n=>wins([...hand,n]));};
 assert.deepEqual(waits(3),[2,4,5]);assert.deepEqual(waits(4),[3,4,5,6]);assert.deepEqual(waits(5),[2,3,4,5,6]);
 assert.match(card('seven-tile-upgrades').answer,/3sツモ：2・4・5s/);
});
function database(){const sql=new DatabaseSync(':memory:');for(const s of [...NOTEBOOK_SCHEMA_SQL,...LEARNING_SCHEMA_SQL])sql.exec(s);const prepare=(q,v=[])=>({bind:(...w)=>prepare(q,w),run:async()=>sql.prepare(q).run(...v)});return{sql,prepare,batch:async(ss)=>{sql.exec('BEGIN');try{for(const s of ss)await s.run();sql.exec('COMMIT');}catch(e){sql.exec('ROLLBACK');throw e;}}};}
test('10/15 additive import retries atomically and never overwrites older content, edits or deleted rows',async()=>{
 const db=database();await ensureOctober8Lessons(db);await db.batch(october8CheckStatements(db));
 const old=db.sql.prepare('SELECT * FROM notebook_cards ORDER BY card_id').all(),oldChecks=db.sql.prepare('SELECT * FROM review_checks ORDER BY id').all();
 const batch=db.batch;let failed=false;db.batch=async ss=>{if(!failed){failed=true;throw Error('offline');}return batch(ss);};
 await assert.rejects(ensureOctober15Lessons(db),/offline/);assert.deepEqual(db.sql.prepare('SELECT * FROM notebook_cards ORDER BY card_id').all(),old);
 await ensureOctober15Lessons(db);await db.batch(october15CheckStatements(db));
 for(const row of old)assert.deepEqual(db.sql.prepare('SELECT * FROM notebook_cards WHERE card_id=?').get(row.card_id),row);
 for(const row of oldChecks)assert.deepEqual(db.sql.prepare('SELECT * FROM review_checks WHERE id=?').get(row.id),row);
 const c=data.cards[2],r=data.resources[0],q=data.items[0];db.sql.prepare("UPDATE notebook_cards SET answer='student edited',deleted=1 WHERE card_id=?").run(c.id);
 db.sql.prepare('DELETE FROM lesson_resources WHERE resource_id=?').run(r.id);
 const edited={...q,deleted:true,revision:5,explanation:'student edited'};db.sql.prepare('UPDATE review_checks SET data=? WHERE id=?').run(JSON.stringify(edited),q.id);
 await ensureOctober15Lessons({prepare:db.prepare,batch});await db.batch(october15CheckStatements(db));
 assert.equal(db.sql.prepare('SELECT answer FROM notebook_cards WHERE card_id=?').get(c.id).answer,'student edited');assert.equal(db.sql.prepare('SELECT COUNT(*) n FROM lesson_resources WHERE resource_id=?').get(r.id).n,0);assert.deepEqual(JSON.parse(db.sql.prepare('SELECT data FROM review_checks WHERE id=?').get(q.id).data),edited);
 db.sql.close();
});
