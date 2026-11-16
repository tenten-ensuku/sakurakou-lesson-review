import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import data from '../content/november-15.json' with {type:'json'};
import evidence from '../docs/november-15-provenance.json' with {type:'json'};
import boards from '../content/november-15-boards.json' with {type:'json'};
import {lesson,points,references} from '../content/november-15-source.mjs';
import {lessonStudyEntries} from '../app/lib/study-session.mjs';
import {APP_VERSION,sortLessons} from '../app/lib/lesson.mjs';
import {isFeaturedMaterial} from '../app/lib/materials.mjs';
import {boardIllustration} from '../app/lib/board-illustrations.mjs';
import {jsonBoardLayout,jsonBoardAssetUrls} from '../app/lib/json-board.mjs';
import {normalizeTileQuestion,tileOptions,tileAnswer} from '../app/lib/tile-question.mjs';
import {sourceBoardEvaluation} from '../app/lib/theory-evaluation.mjs';
import {renderSeptemberMaterial} from '../scripts/render-september-material.mjs';
import {ensureNovember15Lessons,november15CheckStatements} from '../worker/november-15-lessons.mjs';
import {NOTEBOOK_SCHEMA_SQL} from '../db/schema.mjs';
import {LEARNING_SCHEMA_SQL} from '../db/learning-schema.mjs';

test('11/15 upload date, 13 questions in order, teaching notes are not question entries',()=>{
 assert.equal(evidence.sources[0].uploadDate,'20261115');
 assert.equal(evidence.sources[0].id,'JbCOa8wJQVQ');
 assert.equal(lesson.teacher,'ねじまき鳥');
 assert.equal(sortLessons([{date:'10/26',title:'older'},lesson])[0].id,lesson.id);
 const active=[...data.cards.filter(c=>c.kind==='question'),...data.items].sort((a,b)=>a.sortOrder-b.sortOrder);
 assert.deepEqual(active.map(q=>q.sortOrder),Array.from({length:13},(_,i)=>i+1));
 assert.equal(new Set(active.map(q=>q.id)).size,13);
 const entries=lessonStudyEntries(lesson.id,data.cards.map(x=>({...x,source:'custom'})),data.items);
 assert.equal(entries.length,13);assert.ok(entries.every(e=>!e.key.includes('summary')));
 assert.equal(data.items.length,6);assert.equal(data.cards.filter(c=>c.kind==='note').length,3);
 assert.ok(isFeaturedMaterial(data.resources[0]));
 assert.equal(evidence.canonicalDocuments.length,3);
 assert.ok(evidence.canonicalDocuments.every(d=>d.revisionId&&d.checkedAt==='2026-11-16'));
});

test('source seat is corrected from 0 to 3; 5 interactive boards use 7 verified models and lecturer grading',()=>{
 assert.equal(evidence.naga.providedSeat,0);assert.equal(evidence.naga.lectureSeat,3);
 const coords=new Set(evidence.questions.map(x=>JSON.stringify(x.board)));assert.equal(coords.size,13);
 for(const p of evidence.questions){assert.equal(p.board.tw,3);assert.equal(p.sourceFrameFullHandMatchPercent,100);assert.ok(p.physical.valid);}
 const interactive=data.cards.filter(c=>c.tileQuestion);assert.equal(interactive.length,5);
 for(const {tileQuestion:q,question} of interactive){
  assert.deepEqual(normalizeTileQuestion(q),q);assert.doesNotMatch(question,/!\[/);
  const opts=tileOptions(q),layout=jsonBoardLayout(q);assert.equal(layout.width,700);assert.equal(layout.height,650);
  assert.equal(sourceBoardEvaluation(q,undefined),null);
  assert.equal(sourceBoardEvaluation(q,0).modelName,'ニシキ');
  assert.equal(q.naga.models.length,7);assert.deepEqual(q.naga.handSnapshot,opts);
  for(const model of q.naga.models){const e=sourceBoardEvaluation(q,0,model.name);assert.equal(e.modelName,model.name);assert.equal(e.tiles.length,opts.length);}
  for(const [i,t] of opts.entries())assert.equal(tileAnswer(q,i).correct,q.correctTiles.includes(t));
  const regions=layout.regions.slice(0,q.hand.length).sort((a,b)=>a.x-b.x);
  for(let i=1;i<regions.length;i++)assert.ok(Math.abs(regions[i].x-regions[i-1].x-regions[i-1].width)<1e-8);
  assert.ok(q.boardScene.players.every(p=>p.name==='新人'&&p.rank==='初級'&&p.rating===null));
  assert.ok(jsonBoardAssetUrls(q.boardScene).every(url=>existsSync('public'+url)));
 }
 assert.deepEqual(interactive.find(x=>x.id.endsWith('keep-honitsu-upside')).tileQuestion.correctTiles,['2s','4s']);
 for(const [url,{boardScene}]of Object.entries(boards)){
  assert.deepEqual(boardIllustration(url),boardScene);assert.ok(boardScene.hand.tiles.every(Boolean));
  const svg=readFileSync('public'+new URL(url).pathname,'utf8');
  assert.match(svg,/data:image\/png;base64,/);assert.doesNotMatch(svg,/href="https?:/);
 }
});

test('summary content matches source order, with every screenshot before its explanation',()=>{
 const summary=points.map(p=>({scene:p.id,title:p.title,text:p.answer+' '+p.extra}));
 const html=readFileSync('public/materials/november-2026/1115.html','utf8');
 assert.equal(html,renderSeptemberMaterial(evidence,{lesson,summary,references}));
 assert.ok(html.includes('data-app-version="'+APP_VERSION+'"'));
 const sections=[...html.matchAll(/<article class="scene"[^>]*>([\s\S]*?)<\/article>/g)];
 assert.equal(sections.length,13);
 for(const [,s]of sections)assert.ok(s.indexOf('<figure>')<s.indexOf('class="scene-explanation"'));
});

test('shared additive import keeps existing rows and does not overwrite student changes',async()=>{
 const sql=new DatabaseSync(':memory:');for(const s of [...NOTEBOOK_SCHEMA_SQL,...LEARNING_SCHEMA_SQL])sql.exec(s);
 const prepare=(q,v=[])=>({bind:(...w)=>prepare(q,w),run:()=>sql.prepare(q).run(...v)});
 const batch=async stmts=>{sql.exec('BEGIN');try{for(const s of stmts)s.run();sql.exec('COMMIT');}catch(e){sql.exec('ROLLBACK');throw e;}};
 sql.exec("INSERT INTO notebook_lessons(lesson_id,lesson_date,teacher,title,video_url) VALUES('existing','10/26','先生','既存','')");
 const db={prepare,batch:async()=>{throw Error('offline');}};
 await assert.rejects(ensureNovember15Lessons(db),/offline/);
 assert.equal(sql.prepare('SELECT count(*) n FROM notebook_lessons').get().n,1);
 db.batch=batch;await ensureNovember15Lessons(db);await batch(november15CheckStatements(db));
 const c=data.cards[0],r=data.resources[0],q=data.items[0];
 sql.prepare("UPDATE notebook_cards SET answer='edited',deleted=1 WHERE card_id=?").run(c.id);
 sql.prepare('DELETE FROM lesson_resources WHERE resource_id=?').run(r.id);
 const edited={...q,revision:7,deleted:true};sql.prepare('UPDATE review_checks SET data=? WHERE id=?').run(JSON.stringify(edited),q.id);
 const before=sql.prepare('SELECT * FROM notebook_cards ORDER BY card_id').all();
 await ensureNovember15Lessons({prepare,batch});await batch(november15CheckStatements(db));
 assert.deepEqual(sql.prepare('SELECT * FROM notebook_cards ORDER BY card_id').all(),before);
 assert.equal(sql.prepare('SELECT title FROM notebook_lessons WHERE lesson_id=?').get('existing').title,'既存');
 assert.equal(sql.prepare('SELECT count(*) n FROM lesson_resources WHERE resource_id=?').get(r.id).n,0);
 assert.deepEqual(JSON.parse(sql.prepare('SELECT data FROM review_checks WHERE id=?').get(q.id).data),edited);
 sql.close();
});
