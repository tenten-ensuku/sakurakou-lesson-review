import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import data from "../content/august-2026.json" with { type: "json" };
import provenance from "../docs/august-2026-provenance.json" with { type: "json" };
import plan from "../content/august-material-scenes.json" with { type: "json" };
import { APP_VERSION } from "../app/lib/lesson.mjs";
import { renderMaterial, readSummary, summarySentences } from "../scripts/render-august-materials.mjs";

test("material pages alternate each reviewed scene with its matching explanation", async () => {
  for (const lesson of data.lessons) {
    const day = lesson.id.match(/lesson-2026(\d{4})-/)[1];
    const html = renderMaterial(lesson, data, provenance);
    assert.equal(await readFile(new URL(`../public/materials/august-2026/${day}.html`, import.meta.url), "utf8"), html);
    assert.equal((html.match(/<section\b/g) ?? []).length, 6);
    const expected = plan[day].flatMap((group) => group.scenes);
    const articles = [...html.matchAll(/<article class="scene"[^>]*>([\s\S]*?)<\/article>/g)];
    assert.equal(articles.length, expected.length);
    for (const [i, [, article]] of articles.entries()) {
      const image = article.indexOf("<figure>");
      const explanation = article.indexOf('class="scene-explanation"');
      const paragraph = article.indexOf("<p>");
      const video = article.indexOf('class="source"');
      assert.ok(image >= 0 && image < explanation && explanation < paragraph && paragraph < video);
      assert.ok(article.includes(provenance.images[expected[i].file].url));
      assert.ok(article.includes(`&amp;t=${Math.floor(expected[i].at)}s`));
      assert.match(article, /画像を押すと拡大/);
    }
    assert.ok(html.indexOf('<article class="scene"') < html.indexOf('class="summary-note"'));
    assert.equal((html.match(/loading="eager"/g) ?? []).length, 1);
    assert.ok(html.includes(`summary.css?v=${APP_VERSION}`));
    assert.ok(html.includes(`data-app-version="${APP_VERSION}"`));
    assert.ok(!html.includes("<h2>場面画像</h2>"));
    assert.ok(!html.includes("-full.jpg"));
  }
});

test("every original summary sentence is kept exactly once without inventing explanations", () => {
  for (const lesson of data.lessons) {
    const day = lesson.id.match(/lesson-2026(\d{4})-/)[1];
    const summary = readSummary(data, lesson.id);
    const covered = new Set();
    for (const group of plan[day]) {
      const sentences = summarySentences(summary[group.summary].text);
      for (const n of [...group.scenes.flatMap((s) => s.sentences), ...(group.supplement ?? [])]) {
        const key = `${group.summary}:${n}`;
        assert.ok(sentences[n]);
        assert.ok(!covered.has(key));
        covered.add(key);
      }
    }
    assert.equal(covered.size, summary.reduce((n,s) => n + summarySentences(s.text).length, 0));
  }
});

test("cross-scene topics are split and post-discard images remain clearly labeled", () => {
  const reach = plan["0828"].find((g) => g.summary === 1);
  assert.equal(reach.scenes.length, 2);
  assert.match(reach.scenes[0].file, /super-weak/);
  assert.match(reach.scenes[1].file, /1185/);
  const defence = plan["0828"].find((g) => g.summary === 4);
  assert.equal(defence.scenes.length, 2);
  assert.match(defence.scenes[0].file, /0895/);
  assert.match(defence.scenes[1].file, /1390/);
  const toitoi = plan["0824"].flatMap((g) => g.scenes).find((s) => s.file.includes("toitoi"));
  assert.match(toitoi.caption, /8sを切った後/);
});
