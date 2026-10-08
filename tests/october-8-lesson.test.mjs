import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import data from '../content/october-8.json' with { type:'json' };
import evidence from '../docs/october-8-provenance.json' with { type:'json' };
import nagaEvidence from '../docs/october-8-naga-provenance.json' with { type:'json' };
import * as source from '../content/october-8-source.mjs';
import { ensureOctober8Lessons, october8CheckStatements } from '../worker/october-8-lessons.mjs';
import { ensureSeptember30Lessons } from '../worker/september-30-lessons.mjs';
import { NOTEBOOK_SCHEMA_SQL } from '../db/schema.mjs';
import { LEARNING_SCHEMA_SQL } from '../db/learning-schema.mjs';
import { APP_VERSION, sortLessons } from '../app/lib/lesson.mjs';
import { normalizeTileQuestion, tileAnswer } from '../app/lib/tile-question.mjs';
import { lessonStudyEntries } from '../app/lib/study-session.mjs';
import { renderSeptemberMaterial } from '../scripts/render-september-material.mjs';
test('10/8 contains eighteen distinct mixed questions; a summary never enters the run',()=>{
 assert.equal(source.lesson.teacher,'てんてん');assert.equal(sortLessons([source.lesson,{date:'9/30',title:'x'}])[0].id,source.lesson.id);
 const cards=data.cards.map(c=>({...c,source:'custom'}));
 const entries=lessonStudyEntries(source.lesson.id,cards,data.items);
 assert.equal(entries.length,18);assert.equal(data.cards.filter(c=>c.kind==='note').length,1);
 assert.deepEqual([...data.cards.filter(c=>c.kind==='question'),...data.items].sort((a,b)=>a.sortOrder-b.sortOrder).map(q=>q.sortOrder),Array.from({length:18},(_,i)=>i+1));
 assert.equal(new Set(source.questions.map(q=>q.id)).size,18);
 assert.ok(entries[0].key.endsWith('six-turn-check'));assert.ok(!entries.some(e=>e.key.includes('summary')));
 assert.equal(data.items.filter(q=>q.type==='choice').length,7);assert.equal(data.items.filter(q=>q.type==='cloze').length,2);
 for(const q of data.items){assert.equal(new Set(q.choices).size,4);assert.ok(q.correctIndex>=0&&q.correctIndex<4);if(q.type==='cloze')assert.ok(q.question.includes('［　］'));}
 for(const q of [...data.cards,...data.items]){assert.ok(q.question.length<=2000);assert.ok((q.answer??q.explanation).length<=5000);}
});
test('NAGA rates attach only to exact source matches and cannot overwrite lecturer alternatives',()=>{
 const cards=data.cards.filter(c=>c.tileQuestion);assert.equal(cards.length,2);
 assert.equal(nagaEvidence.questions.length,2);assert.ok(nagaEvidence.questions.every(q=>q.handMatchPercent===100&&q.drawMatched&&q.doraMatched));
 for(const c of cards){assert.deepEqual(normalizeTileQuestion(c.tileQuestion),c.tileQuestion);assert.equal(c.tileQuestion.naga.tw,1);assert.deepEqual(c.tileQuestion.naga.models.map(m=>m.name),['ニシキ','カガシ']);assert.equal(c.tileQuestion.board.regions.length,14);assert.ok(c.tileQuestion.board.regions.every(r=>r.y===565));assert.ok(c.question.includes(c.tileQuestion.board.imageUrl));}
 const wide=cards.find(c=>c.id.endsWith('wide-versus-wait')).tileQuestion;
 assert.ok(wide.hand.includes('0s'));assert.deepEqual(wide.correctTiles,['5m','6m','7p']);
 for(const tile of wide.correctTiles){const i=[...wide.hand,wide.draw].indexOf(tile);assert.equal(tileAnswer(wide,i).correct,true);}
 assert.equal(tileAnswer(wide,wide.hand.indexOf('8p')).correct,false);
});
test('ten summary scenes preserve screenshot-before-explanation and withhold answer captions in questions',()=>{
 const html=renderSeptemberMaterial(evidence,source);assert.equal(readFileSync('public/materials/october-2026/1008.html','utf8'),html);assert.ok(html.includes(`data-app-version="${APP_VERSION}"`));
 const sections=[...html.matchAll(/<article class="scene"[^>]*>([\s\S]*?)<\/article>/g)];assert.equal(sections.length,10);
 for(const [,s]of sections)assert.ok(s.indexOf('<figure>')<s.indexOf('class="scene-explanation"'));
 for(const c of [...data.cards.filter(c=>c.kind==='question'),...data.items])if(c.question.includes('!['))assert.match(c.question,/!\[出題場面の盤面/);
 assert.doesNotMatch(data.items.find(q=>q.id.endsWith('missing-block')).question,/!\[/);
 assert.match(data.items.find(q=>q.id.endsWith('final-tsumo-condition')).explanation,/7800/);
 assert.match(source.questions.find(q=>q.id==='three-head-ryanmen').explanation,/門前手で3対子/);
});
function database(){const sql=new DatabaseSync(':memory:');for(const s of [...NOTEBOOK_SCHEMA_SQL,...LEARNING_SCHEMA_SQL])sql.exec(s);const prepare=(q,v=[])=>({bind:(...w)=>prepare(q,w),run:async()=>sql.prepare(q).run(...v)});return{sql,prepare,batch:async(ss)=>{sql.exec('BEGIN');try{for(const s of ss)await s.run();sql.exec('COMMIT');}catch(e){sql.exec('ROLLBACK');throw e;}}};}
test('10/8 imports additively and preserves old rows, public edits, deletions and check revisions',async()=>{
 const db=database();await ensureSeptember30Lessons(db);
 const old=db.sql.prepare('SELECT * FROM notebook_cards ORDER BY card_id').all();
 const batch=db.batch;let failed=false;db.batch=async(ss)=>{if(!failed){failed=true;throw Error('offline');}return batch(ss);};
 await assert.rejects(ensureOctober8Lessons(db),/offline/);assert.deepEqual(db.sql.prepare('SELECT * FROM notebook_cards ORDER BY card_id').all(),old);
 await ensureOctober8Lessons(db);await db.batch(october8CheckStatements(db));
 for(const row of old)assert.deepEqual(db.sql.prepare('SELECT * FROM notebook_cards WHERE card_id=?').get(row.card_id),row);
 const c=data.cards[1],r=data.resources[0],q=data.items[0];
 db.sql.prepare("UPDATE notebook_cards SET answer='student edited',deleted=1 WHERE card_id=?").run(c.id);
 db.sql.prepare('DELETE FROM lesson_resources WHERE resource_id=?').run(r.id);
 const edited={...q,deleted:true,revision:4,explanation:'student edited'};
 db.sql.prepare('UPDATE review_checks SET data=? WHERE id=?').run(JSON.stringify(edited),q.id);
 await ensureOctober8Lessons({prepare:db.prepare,batch});await db.batch(october8CheckStatements(db));
 assert.equal(db.sql.prepare('SELECT answer FROM notebook_cards WHERE card_id=?').get(c.id).answer,'student edited');assert.equal(db.sql.prepare('SELECT COUNT(*) n FROM lesson_resources WHERE resource_id=?').get(r.id).n,0);assert.deepEqual(JSON.parse(db.sql.prepare('SELECT data FROM review_checks WHERE id=?').get(q.id).data),edited);
 db.sql.close();
});
