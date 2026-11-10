import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import data from '../content/october-26.json' with {type:'json'};
import evidence from '../docs/october-26-provenance.json' with {type:'json'};
import nagaProof from '../docs/october-26-naga-provenance.json' with {type:'json'};
import boards from '../content/october-26-boards.json' with {type:'json'};
import * as source from '../content/october-26-source.mjs';
import {lessonStudyEntries} from '../app/lib/study-session.mjs';
import {normalizeTileQuestion,tileAnswer,tileOptions} from '../app/lib/tile-question.mjs';
import {normalizeNagaEvaluation} from '../app/lib/naga-evaluation.mjs';
import {jsonBoardLayout,jsonBoardMarkup} from '../app/lib/json-board.mjs';
import {boardIllustration} from '../app/lib/board-illustrations.mjs';
import {sourceBoardEvaluation,nagaModelIndex} from '../app/lib/theory-evaluation.mjs';
import {renderSeptemberMaterial} from '../scripts/render-september-material.mjs';
import {isFeaturedMaterial} from '../app/lib/materials.mjs';
import {NOTEBOOK_SCHEMA_SQL} from '../db/schema.mjs';
import {LEARNING_SCHEMA_SQL} from '../db/learning-schema.mjs';
import {ensureOctober26Lessons,october26CheckStatements} from '../worker/october-26-lessons.mjs';

test('10/26 upload date: fifteen mixed questions, summaries separate, newest lesson and featured material',()=>{
 assert.equal(source.lesson.date,'10/26');assert.equal(source.lesson.teacher,'ねじまき鳥');
 assert.equal(evidence.sources[0].uploadDate,'20261026');assert.equal(evidence.sources[0].id,'mLvqssxommU');
 const entries=lessonStudyEntries(source.lesson.id,data.cards.map(c=>({...c,source:'custom'})),data.items);
 assert.equal(entries.length,15);assert.ok(entries.every(e=>!e.key.includes('summary')));
 assert.equal(data.cards.filter(c=>c.kind==='note').length,2);
 const rows=[...data.cards.filter(c=>c.kind==='question'),...data.items].sort((a,b)=>a.sortOrder-b.sortOrder);
 assert.deepEqual(rows.map(r=>r.sortOrder),Array.from({length:15},(_,i)=>i+1));
 assert.equal(new Set(rows.map(r=>r.id)).size,15);assert.equal(data.cards.filter(c=>c.tileQuestion).length,3);
 assert.equal(data.items.filter(c=>c.type==='choice').length,6);assert.equal(data.items.filter(c=>c.type==='cloze').length,2);
 for(const q of data.items){assert.equal(new Set(q.choices).size,4);assert.ok(q.choices[q.correctIndex]);}
 for(const q of [...data.cards,...data.items]){assert.ok(q.question.length<=2000);assert.ok((q.answer??q.explanation).length<=5000);}
 assert.ok(isFeaturedMaterial(data.resources[0]));assert.ok(data.resources.some(r=>r.id.endsWith('-naga')));
 assert.ok(evidence.canonicalDocuments.every(d=>d.revisionId&&d.checkedAt==='2026-11-10'));
});
test('exact source boards, contiguous hand, seven real models and immediate tap grading',()=>{
 assert.equal(nagaProof.questions.length,10);assert.equal(evidence.naga.reportUrlProvided,true);
 assert.equal(evidence.naga.reportSha256,nagaProof.reportSha256);
 for(const p of nagaProof.questions){assert.equal(p.sourceFrameFullHandMatchPercent,100);assert.ok(p.validation.valid&&p.drawMatched&&p.doraMatched);}
 for(const c of data.cards.filter(c=>c.tileQuestion)){
  const q=c.tileQuestion,options=tileOptions(q);assert.deepEqual(normalizeTileQuestion(q),q);
  assert.equal(q.board,undefined);assert.doesNotMatch(c.question,/!\[/);
  assert.deepEqual(q.naga.models.map(m=>m.name),['オメガ','ガンマ','ニシキ','ヒバカリ','カガシ','アナンタ','ウロボロス']);
  assert.equal(nagaModelIndex(q.naga),2);assert.deepEqual(normalizeNagaEvaluation(q.naga,options),q.naga);
  const tooMany=structuredClone(q.naga);tooMany.models.push({name:'unknown',rates:q.naga.models[0].rates});assert.equal(normalizeNagaEvaluation(tooMany,options),null);
  const layout=jsonBoardLayout(q);assert.equal(layout.width,700);assert.equal(layout.height,650);
  const hand=layout.regions.slice(0,q.hand.length).sort((a,b)=>a.x-b.x);
  for(let i=1;i<hand.length;i++)assert.ok(Math.abs(hand[i].x-hand[i-1].x-hand[i-1].width)<1e-8);
  for(let i=0;i<options.length;i++)assert.equal(tileAnswer(q,i).correct,q.correctTiles.includes(options[i]));
  for(const m of q.naga.models)assert.equal(sourceBoardEvaluation(q,0,m.name).modelName,m.name);
  assert.ok(!q.boardScene.players.some(p=>p.name!=='新人'||p.rank!=='初級'||p.rating!==null));
 }
 for(const[url,v]of Object.entries(boards)){
  assert.deepEqual(boardIllustration(url),v.boardScene);assert.equal(boardIllustration(url+'?edited'),null);
  const svg=jsonBoardMarkup(v.boardScene);assert.match(svg,/700 650/);assert.doesNotMatch(svg,/undefined|NaN/);
  assert.ok(readFileSync('public/materials/october-2026/boards/'+v.id+'.svg','utf8').includes('新人'));
 }
 const comeback=data.cards.find(c=>c.id.endsWith('fold-leave-comeback'));assert.match(comeback.question,/降りるなら/);assert.match(comeback.answer,/押す案も許容/);
 const first=data.cards.find(c=>c.id.endsWith('heavy-hand-ranking')).tileQuestion;
 assert.equal(first.naga.models[2].rates['8p'],99.77);assert.equal(first.naga.models[6].rates['8p'],99.89);
});
test('fourteen screenshot-first summary scenes, final corrections and no answer image leaks',()=>{
 const html=renderSeptemberMaterial(evidence,source);assert.equal(readFileSync('public/materials/october-2026/1026.html','utf8'),html);
 const sections=[...html.matchAll(/<article class="scene"[^>]*>([\s\S]*?)<\/article>/g)];assert.equal(sections.length,14);
 for(const[,s]of sections)assert.ok(s.indexOf('<figure>')<s.indexOf('class="scene-explanation"'));
 const diagram=data.cards.find(c=>c.id.endsWith('sanshoku-quality'));assert.doesNotMatch(diagram.question,/!\[/);assert.match(diagram.answer,/!\[/);
 assert.match(data.items.find(c=>c.id.endsWith('no-safe-head')).explanation,/余剰牌型/);
 assert.match(data.items.find(c=>c.id.endsWith('two-safe-turns')).explanation,/評価を訂正/);
 assert.equal(source.scenes.s2615.caption.startsWith('南3局2本場'),true);
 assert.equal(source.scenes.s3170.caption.startsWith('南3局3本場'),true);
});
test('additive atomic seed retries, preserving all edits, logical deletion and removed resources',async()=>{
 const sql=new DatabaseSync(':memory:');for(const s of [...NOTEBOOK_SCHEMA_SQL,...LEARNING_SCHEMA_SQL])sql.exec(s);
 const prepare=(q,v=[])=>({bind:(...w)=>prepare(q,w),run:async()=>sql.prepare(q).run(...v)});
 const batch=async ss=>{sql.exec('BEGIN');try{for(const s of ss)await s.run();sql.exec('COMMIT');}catch(e){sql.exec('ROLLBACK');throw e;}};
 const db={prepare,batch:async()=>{throw Error('offline');}};await assert.rejects(ensureOctober26Lessons(db),/offline/);
 assert.equal(sql.prepare('SELECT count(*) n FROM notebook_lessons').get().n,0);
 db.batch=batch;await ensureOctober26Lessons(db);await batch(october26CheckStatements(db));
 const c=data.cards[0],q=data.items[0],r=data.resources[0];
 sql.prepare("UPDATE notebook_cards SET answer='student edit',deleted=1 WHERE card_id=?").run(c.id);
 sql.prepare('DELETE FROM lesson_resources WHERE resource_id=?').run(r.id);
 const edited={...q,deleted:true,revision:7,explanation:'student edit'};sql.prepare('UPDATE review_checks SET data=? WHERE id=?').run(JSON.stringify(edited),q.id);
 const before=sql.prepare('SELECT * FROM notebook_cards ORDER BY card_id').all();
 await ensureOctober26Lessons({prepare,batch});await batch(october26CheckStatements(db));
 assert.deepEqual(sql.prepare('SELECT * FROM notebook_cards ORDER BY card_id').all(),before);
 assert.equal(sql.prepare('SELECT count(*) n FROM lesson_resources WHERE resource_id=?').get(r.id).n,0);
 assert.deepEqual(JSON.parse(sql.prepare('SELECT data FROM review_checks WHERE id=?').get(q.id).data),edited);sql.close();
});
