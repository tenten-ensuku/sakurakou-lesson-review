import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import content from "../content/august-2026.json" with { type: "json" };
import provenance from "../docs/august-2026-provenance.json" with { type: "json" };
import manifest from "../content/august-board-images.json" with { type: "json" };
import { tokenizeRichText } from "../app/lib/rich-text.mjs";
import { syncLocalBoardImages } from "../scripts/augment-august-board-images.mjs";

test("all 30 scene-dependent questions show a verified source image before the question", () => {
  const rows = [...content.cards, ...content.items];
  const maps = provenance.boardImages.mappings;
  assert.equal(maps.length, 30);
  assert.equal(new Set(maps.map((m) => m.appId)).size, 30);
  for (const m of maps) {
    const q = rows.find((q) => q.id === m.appId);
    assert.ok(q);
    assert.ok(q.question.startsWith(m.prefix));
    assert.equal(tokenizeRichText(q.question)[0].type, "image");
    assert.equal(tokenizeRichText(q.question)[0].url, m.url);
    assert.equal(provenance.images[m.file].url, m.url);
    assert.ok(m.seconds > 0);
    assert.ok(!m.file.includes("-full"));
    assert.ok(m.evidence.length > 15);
    assert.ok(q.question.length <= 2000);
  }
  const example = maps.find((m) => m.day === "0828" && m.sourceNumber === 5);
  assert.match(example.caption, /対面の河と副露/);
  assert.match(example.videoUrl, /IogKcSnPscE/);
  assert.equal(manifest.assignments.length, 17);
});

test("post-discard and hypothetical images explicitly state how to read them", () => {
  const maps = provenance.boardImages.mappings;
  for (const number of [27,28]) {
    const m = maps.find((m) => m.day === "0824" && m.sourceNumber === number);
    assert.match(m.caption, /8sを切った直後/);
    assert.match(m.caption, /1枚手牌に戻し/);
  }
  assert.match(maps.find((m) => m.day === "0824" && m.sourceNumber === 29).caption, /下に離した8sも手牌に含め/);
  assert.match(maps.find((m) => m.day === "0828" && m.sourceNumber === 12).caption, /23m・23p/);
});

test("image augmentation keeps stable question IDs/counts and refuses remote preview writes", async () => {
  // Existing stable-ID mapping remains the authority, not the visible number.
  for (const l of provenance.lessons) {
    const ids = l.questions.map((q) => q.appId);
    assert.equal(ids.length, 30);
    assert.ok(ids.every((id) => [...content.cards, ...content.items].some((q) => q.id === id)));
  }
  await assert.rejects(syncLocalBoardImages("https://example.com"), /only updates/);
  await assert.rejects(syncLocalBoardImages("http://localhost:3000.evil.test"), /only updates/);
});

test("rendered learning images open at original size without breaking inline tile text", async () => {
  const file = new URL("../app/RichContent.tsx", import.meta.url);
  const source = await readFile(file, "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: {
    jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS,
  } }).outputText;
  const exports = {};
  const require = createRequire(file);
  vm.runInNewContext(`(function(require,exports){${compiled}\n})`)(
    (id) => require(id === "./lib/notebook-types" ? "./lib/notebook-types.ts" : id), exports,
  );
  const html = renderToStaticMarkup(React.createElement(exports.default, {
    text: "![東1局の盤面](https://example.test/board.jpg)\n\n6sのくっつきと2pの先切りを比較。",
  }));
  assert.match(html, /class="note-image-open"/);
  assert.match(html, /href="https:\/\/example.test\/board.jpg" target="_blank" rel="noreferrer"/);
  assert.match(html, /別タブで開く/);
  assert.match(html, /画像を押すと拡大/);
  assert.match(html, /sou6-66-90-l.png/);
  assert.match(html, /pin2-66-90-l.png/);
  assert.match(html, /のくっつきと/);
  const css = await readFile(new URL("../app/notebook.css", import.meta.url), "utf8");
  assert.match(css, /\.note-image img\s*\{[^}]*height:\s*auto;[^}]*object-fit:\s*contain;/s);
  assert.match(css, /\.study-text > span\s*\{\s*display:\s*block;/);
  assert.doesNotMatch(css, /\.study-text > span\s*\{[^}]*display:\s*contents/);
});
