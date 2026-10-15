import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import illustrations from "../content/verified-board-illustrations.json" with { type: "json" };
import proof from "../docs/october-15-illustrations-provenance.json" with { type: "json" };
import data from "../content/october-15.json" with { type: "json" };
import { boardIllustration } from "../app/lib/board-illustrations.mjs";
import { jsonBoardMarkup } from "../app/lib/json-board.mjs";
const rows=Object.entries(illustrations);

test("Q9, Q10, Q11 and Q15–Q18 use exactly matched visible snapshots, not invented hands",()=>{
  assert.deepEqual(proof.questions.map(q=>q.number),[9,10,11,15,16,17,18]);
  assert.equal(proof.networkRequests,0);assert.equal(proof.imageUploads,0);
  for(const [url,value]of rows){
    const p=proof.questions.find(q=>q.id===value.id),scene=boardIllustration(url);
    assert.equal(p.sourceFrameHandMatchPercent,100);assert.ok(p.physicalValidation.valid&&p.sceneValidation.valid);
    assert.deepEqual(scene.source,p.source);assert.deepEqual([...scene.hand.tiles].sort(),[...p.hand].sort());assert.equal(scene.hand.draw,p.draw);
    assert.equal(scene.doraIndicators[0],p.dora);assert.equal(scene.round.remaining,p.remaining);
    assert.ok(scene.players.every(p=>p.name==="新人"&&p.rank==="初級"&&p.rating===null));
    const question=[...data.cards,...data.items].find(q=>q.id===p.id);
    assert.ok(question.question.includes(url));assert.equal(question.sortOrder,p.number);
  }
  const q9=rows.find(([,q])=>q.number===9)[1].boardScene;
  assert.equal(q9.hand.tiles.length,13);assert.equal(q9.hand.draw,null);
  assert.equal(q9.players[0].score,26300);assert.equal(q9.players[0].reached,true);assert.equal(q9.round.kyotaku,1);
  assert.equal(rows.find(([,q])=>q.number===10)[1].boardScene.hand.draw,"man6");
});

test("all seven self hands are contiguous; only the draw is separate",()=>{
  for(const [,{boardScene:scene}]of rows){
    const positions=globalThis.NagaBoardV248.handPositions(scene),hand=positions.filter(p=>!p.draw);
    for(let i=1;i<hand.length;i++)assert.ok(Math.abs(hand[i].x-hand[i-1].x-29.3)<1e-8);
    assert.equal(hand.length,13);
    const html=jsonBoardMarkup(scene);
    assert.match(html,/viewBox="0 0 700 650"/);assert.equal((html.match(/data-board-player=/g)??[]).length,4);
    assert.doesNotMatch(html,/<img|\.jpg|https:/);
  }
});

function richComponent(){
  const file=new URL("../app/RichContent.tsx",import.meta.url),require=createRequire(file),exports={};
  const compiled=ts.transpileModule(readFileSync(file,"utf8"),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS}}).outputText;
  vm.runInThisContext(`(function(require,exports){${compiled}\n})`)((id)=>require(id==="./lib/notebook-types"?"./lib/notebook-types.ts":id),exports);
  return exports.default;
}

test("actual content renderer replaces only the verified images, preserving text, URLs and custom renderers",()=>{
  const Component=richComponent();
  for(const [url,value]of rows){
    const q=[...data.cards,...data.items].find(q=>q.id===value.id),raw=q.question;
    const html=renderToStaticMarkup(React.createElement(Component,{text:raw}));
    assert.match(html,/verified-board-illustration/);assert.match(html,/naga-json-board-svg/);
    assert.doesNotMatch(html,/src="https:|data-recommendation-bar|正解！/);
    assert.equal(raw,q.question);assert.ok(q.question.includes(url));
    const custom=renderToStaticMarkup(React.createElement(Component,{text:`![盤面](${url})`,renderImage:()=>React.createElement("span",null,"custom-renderer")}));
    assert.match(custom,/custom-renderer/);assert.doesNotMatch(custom,/naga-json-board-svg/);
    const newUrl=url+"?student-replacement=1";
    assert.equal(boardIllustration(newUrl),null);
    const other=renderToStaticMarkup(React.createElement(Component,{text:`![差し替え](${newUrl})`}));
    assert.ok(other.includes(newUrl));assert.doesNotMatch(other,/naga-json-board-svg/);
  }
});
