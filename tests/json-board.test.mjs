import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import data from "../content/october-15.json" with { type: "json" };
import evidence from "../docs/october-15-json-board-provenance.json" with { type: "json" };
import { canonicalToLessonTile, jsonBoardAssetUrls, jsonBoardLayout, jsonBoardMarkup } from "../app/lib/json-board.mjs";
import { normalizeTileQuestion, tileOptions, tileQuestionSignature, savedTilePick, tileAnswer } from "../app/lib/tile-question.mjs";
import { sourceBoardEvaluation } from "../app/lib/theory-evaluation.mjs";
const cards = data.cards.filter(c => c.tileQuestion);
const clone = v => structuredClone(v);

test("seven existing IDs use shared verified JSON boards without screenshot uploads or private identities", () => {
  assert.equal(cards.length, 7); assert.equal(evidence.questions.length, 7);
  assert.equal(evidence.networkRequests, 0); assert.equal(evidence.imageUploads, 0);
  for (const [file, sha] of [["theory-board-renderer.js", evidence.rendererSha256], ["naga-board-state.js", evidence.projectorSha256]]) {
    assert.equal(createHash("sha256").update(readFileSync("app/lib/" + file, "utf8").replace(/\r\n/g, "\n")).digest("hex"), sha);
  }
  for (const card of cards) {
    const q = card.tileQuestion, proof = evidence.questions.find(x => x.id === card.id);
    assert.ok(proof.validation.valid); assert.deepEqual(normalizeTileQuestion(q), q);
    assert.equal(q.board, undefined); assert.equal(q.boardScene.renderer, "naga-json-board");
    assert.deepEqual(q.boardScene.source, proof.source);
    for (const p of q.boardScene.players) {
      assert.equal(p.name, "新人"); assert.equal(p.rank, "初級"); assert.equal(p.rating, null);
      assert.ok(p.hiddenSlots.every(v => typeof v === "boolean"));
    }
    assert.deepEqual(q.boardScene.players.map(p => p.melds.length), proof.otherPlayerMeldCounts);
    const html = jsonBoardMarkup(q.boardScene, "/sakurakou-lesson-review");
    assert.match(html, /viewBox="0 0 700 650"/);
    assert.equal((html.match(/data-board-player=/g) ?? []).length, 4);
    assert.equal((html.match(/data-board-meld=/g) ?? []).length, q.boardScene.players.reduce((n, p) => n + p.melds.length, 0));
    assert.doesNotMatch(html, /https:|\.jpg|<script/);
    assert.equal(jsonBoardMarkup(q.boardScene), jsonBoardMarkup(q.boardScene), "SSR and hydration get stable gradient IDs");
    for (const url of jsonBoardAssetUrls(q.boardScene)) assert.ok(existsSync("public" + url), url);
  }
});

test("canonical honor/red codes use this app's approved assets without changing scene data", () => {
  assert.deepEqual(["ji5", "ji6", "ji7", "aka3"].map(canonicalToLessonTile), ["6z", "5z", "7z", "0s"]);
  const scene = clone(cards[0].tileQuestion.boardScene); scene.doraIndicators = ["ji5", "ji6"];
  const html = jsonBoardMarkup(scene, "/base");
  assert.match(html, /href="\/base\/tiles\/ji6-66-90-l.png"/);
  assert.match(html, /href="\/base\/tiles\/ji5-66-90-l.png"/);
  assert.match(html, /href="\/base\/tiles\/aka3-66-90-l.png"/);
  assert.deepEqual(scene.doraIndicators, ["ji5", "ji6"]);
});

test("hand hit regions and bars share the original 700x650 geometry, including post-pon gaps", () => {
  for (const card of cards) {
    const q = card.tileQuestion, layout = jsonBoardLayout(q), options = tileOptions(q);
    assert.equal(layout.width, 700); assert.equal(layout.height, 650);
    assert.equal(layout.regions.length, options.length);
    for (const r of layout.regions) {
      assert.ok(r.x >= 0 && r.y >= 0 && r.x + r.width <= 700 && r.y + r.height <= 650);
      assert.equal(r.width, 29.3); assert.equal(r.height, 40);
      for (const viewport of [320, 390, 1280]) assert.ok((r.x + r.width) / 700 * viewport <= viewport);
    }
    const old = { ...q, board: { imageUrl: q.previousBoardImageUrl } }; delete old.boardScene;
    assert.equal(tileQuestionSignature(q), tileQuestionSignature(old));
    const key = card.id, session = { tilePicks: { [key]: options.length - 1 }, tileSignatures: { [key]: tileQuestionSignature(old) } };
    assert.equal(savedTilePick(session, key, q), options.length - 1);
    for (const model of q.naga.models) {
      const evaluation = sourceBoardEvaluation(q, 0, model.name);
      assert.equal(evaluation.modelName, model.name);
      for (const t of evaluation.tiles) { assert.equal(t.value, model.rates[options[t.index]]); assert.deepEqual({x:t.x,y:t.y,width:t.width,height:t.height},layout.regions[t.index]); }
    }
    for (let i=0; i<options.length; i++) assert.equal(tileAnswer(q,i).correct,q.correctTiles.includes(options[i]));
  }
  const pon = cards.find(c => c.id.endsWith("pon-5800")).tileQuestion;
  assert.equal(pon.boardScene.immediateCall, true);
  assert.equal(pon.boardScene.hand.tiles.filter(t => t === null).length, 2);
  assert.equal(jsonBoardLayout(pon).regions.length, 11);
});

test("invalid, stale and non-anonymous JSON scenes fail closed", () => {
  const q=cards[0].tileQuestion;
  for (const mutate of [
    n=>{n.boardScene.players[1].name="private";},
    n=>{n.boardScene.players[2].hiddenSlots[0]="man1";},
    n=>{n.boardScene.hand.tiles[0]="man1";},
    n=>{n.boardScene.source.tv++;},
    n=>{n.boardScene.round.number=7;},
    n=>{n.boardScene.unexpected="<script>";},
    n=>{n.board={imageUrl:"https://example.test/a.jpg",width:1,height:1,regions:[]};},
  ]){const n=clone(q);mutate(n);assert.equal(normalizeTileQuestion(n),null);}
  const changedAnswer={...q,correctTiles:["1m"]}; assert.equal(normalizeTileQuestion(changedAnswer),null);
});

function loadComponent(url) {
  const cache=new Map();
  const load=file=>{
    if(cache.has(file))return cache.get(file);
    const exports={};cache.set(file,exports);
    const require=createRequire(file),compiled=ts.transpileModule(readFileSync(new URL(file),"utf8"),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS}}).outputText;
    vm.runInThisContext(`(function(require,exports){${compiled}\n})`)(id=>{
      if(id.startsWith("."))for(const extension of [".tsx",".ts"]){const path=new URL(id+extension,file);if(existsSync(path))return load(path.href);}
      return require(id);
    },exports);
    return exports;
  };
  return load(url.href).default;
}

test("actual React question replaces its legacy image, hides the answer and shows bars only after a pick", () => {
  const Component=loadComponent(new URL("../app/TileQuestion.tsx",import.meta.url));
  for(const card of cards){
    const props={data:card.tileQuestion,question:card.question,onSubmit:()=>{},explanation:card.answer,onModelChange:()=>{},onRetry:()=>{},navigation:{index:0,total:18,previous:()=>{},next:()=>{}}};
    const before=renderToStaticMarkup(React.createElement(Component,props));
    assert.equal((before.match(/class="naga-json-board-svg/g)??[]).length,1);
    assert.doesNotMatch(before,/src="https:|data-recommendation-bar|この局面のポイント/);
    assert.match(before,/aria-busy="true"/); // SSR stays disabled until approved tile assets load.
    const after=renderToStaticMarkup(React.createElement(Component,{...props,pick:0}));
    assert.match(after,/data-recommendation-bar/);assert.match(after,/この局面のポイント/);
    assert.match(after,/aria-label="評価タイプ"/);assert.doesNotMatch(after,/<option[^>]*>[^<]*（%）/);
    assert.match(after,/もう一度/);assert.match(after,/前の問題/);assert.match(after,/次の問題/);
  }
  const fresh=clone(cards[0].tileQuestion);delete fresh.previousBoardImageUrl;
  const html=renderToStaticMarkup(React.createElement(Component,{data:fresh,question:"何切る？",onSubmit:()=>{},onModelChange:()=>{},onRetry:()=>{}}));
  assert.equal((html.match(/class="naga-json-board-svg/g)??[]).length,1,"new JSON-only cards need no legacy image anchor");
});
