import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import data from '../content/october-15.json' with {type:'json'};
import bindings from '../content/october-15-checkpoint-board.json' with {type:'json'};
import proof from '../docs/october-15-checkpoint-provenance.json' with {type:'json'};
import {checkpoint} from '../content/october-15-checkpoint.mjs';
import {boardIllustration} from '../app/lib/board-illustrations.mjs';
import {jsonBoardMarkup} from '../app/lib/json-board.mjs';
const q=data.items.find(x=>x.id===proof.id),scene=boardIllustration(checkpoint.boardIllustration);

test('requested six-turn problem uses the exact 23:30 source scene and a contiguous hand',()=>{
 assert.equal(q.sortOrder,19);assert.equal(q.type,'choice');assert.equal(q.correctIndex,2);
 assert.ok(q.question.includes(checkpoint.boardIllustration));
 assert.deepEqual(scene.source,{reportId:proof.source.reportId,tw:0,ts:7,tv:53});
 assert.deepEqual([...scene.hand.tiles].sort(),[...proof.hand].sort());
 assert.equal(scene.hand.draw,'ji3');assert.equal(scene.round.remaining,43);
 assert.equal(scene.players[0].score,28700);assert.equal(scene.players[0].melds.length,0);
 assert.equal(proof.currentRyanmen,'78p');assert.ok(proof.initialZeroMeldZeroRyanmen&&proof.currentZeroMeld);
 assert.equal(proof.sourceFrameHandMatchPercent,100);assert.ok(proof.sceneValidation.valid);
 assert.equal(proof.networkRequests,0);assert.equal(proof.imageUploads,0);
 const positions=globalThis.NagaBoardV248.handPositions(scene).filter(p=>!p.draw);
 assert.equal(positions.length,13);for(let i=1;i<positions.length;i++)assert.ok(Math.abs(positions[i].x-positions[i-1].x-29.3)<1e-8);
 assert.match(jsonBoardMarkup(scene),/viewBox="0 0 700 650"/);
 assert.equal(Object.keys(bindings).length,1);
 const svg=readFileSync('public/materials/boards/20261015-six-turn.svg','utf8');
 assert.ok(svg.startsWith('<svg xmlns='));assert.doesNotMatch(svg,/data:image|\.jpg|比屋定|simon/);
 assert.ok(scene.players.every(p=>p.name==='新人'&&p.rank==='初級'&&p.rating===null));
});

test('zero-meld override, calling exception and lecturer qualification are not lost',()=>{
 assert.match(q.explanation,/配牌は00物件（0面子0両面）/);
 assert.match(q.explanation,/6巡目も0面子/);assert.match(q.explanation,/無条件/);
 assert.match(q.explanation,/2シャンテン・愚形2つ残り・立直して2ハン/);
 assert.match(q.explanation,/副露手は例外/);assert.match(q.explanation,/西残しだけが正解という話ではない/);
 assert.ok(q.explanation.includes('https://www.youtube.com/watch?v=yOVM-RWRlYE&t=1410s'));
 assert.equal(proof.canonicalDocuments.length,3);assert.ok(proof.canonicalDocuments.every(d=>d.revisionId));
});

test('adding Q19 preserves all eighteen original questions, IDs, ordering and resources',()=>{
 const original={...data,items:data.items.filter(x=>x.id!==proof.id)};
 // Normalized ver47 seed, no Git-history dependency in packaged/CI test runs.
 assert.equal(createHash('sha256').update(JSON.stringify(original)).digest('hex'),'08bc26eae4c409532c273f119eac104d75ec2048a4380aee191537bd421a1fea');
 assert.equal(data.items.length,original.items.length+1);
});
