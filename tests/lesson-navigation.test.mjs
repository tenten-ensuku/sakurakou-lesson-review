import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { orderMaterials, isFeaturedMaterial } from "../app/lib/materials.mjs";
import highlights from "../content/featured-materials.json" with { type: "json" };

test("lesson list has its own named heading band and a data-driven count", () => {
  const page = readFileSync("app/page.tsx", "utf8");
  const css = readFileSync("app/notebook.css", "utf8");
  assert.match(page, /<section className="lesson-section" aria-labelledby="lesson-list-title">/);
  assert.match(page, /<header className="section-title lesson-list-heading">[\s\S]*?<h2 id="lesson-list-title">授業一覧<\/h2>[\s\S]*?<span>\{lessons.length\}授業<\/span>/);
  assert.match(css, /\.notebook \.lesson-list-heading\s*\{[^}]*background: #e1eee5;/);
});

test("lesson boundaries use a stronger rule than the inner status dividers", () => {
  const css = readFileSync("app/notebook.css", "utf8");
  assert.match(css, /\.lesson-line\s*\{\s*border-bottom: 4px solid #8eac9c;/);
  assert.match(css, /\.lesson-learning-status\s*\{[^}]*border-bottom: 1px solid #dde6db;/);
});

test("the requested 8/18 material stays first without altering shared IDs, order or edits", () => {
  const { lessonId, resourceId } = highlights[0];
  const resources = [
    {id:"first", lessonId, sortOrder:1, label:"基本序列", url:"https://example.com/a"},
    {id:resourceId, lessonId, sortOrder:4, label:"生徒が編集した教材名", url:"https://kihon-joretsu-review.pages.dev/"},
    {id:"second", lessonId, sortOrder:2, label:"一手先フォロー牌", url:"https://example.com/b"},
  ];
  const before = structuredClone(resources);
  assert.deepEqual(orderMaterials(resources).map(r=>r.id), [resourceId,"first","second"]);
  assert.deepEqual(resources,before);
  assert.equal(orderMaterials(resources)[0].label,"生徒が編集した教材名");
  assert.equal(isFeaturedMaterial({...resources[1], lessonId:"another"}),false);
  assert.deepEqual(orderMaterials(resources.filter(r=>r.id!==resourceId)).map(r=>r.id),["first","second"]);
});

test("lesson titles are static and the visible actions name their destinations", () => {
  const entry=readFileSync("app/LessonEntry.tsx","utf8");
  const page=readFileSync("app/page.tsx","utf8");
  assert.match(entry, /<h3>\{lesson.title\}<\/h3>/);
  assert.match(entry, /問題を解く/);
  assert.match(entry, /資料を見る/);
  assert.match(entry, /授業動画を見る/);
  assert.match(entry, /materials.length > 0/);
  assert.match(entry, /questionCount > 0 \|\| noteCount > 0/);
  assert.doesNotMatch(page, /lesson-toggle|setExpanded|review-shortcuts/);
  assert.match(page, /view === "lesson"/);
  assert.match(page, /フラッシュカードを始める/);
  assert.match(page, /四択・穴埋めを始める/);
  assert.match(page, /問題・解説を一覧で読む/);
  assert.match(page, /run.lessonId === lesson.id/);
});

test("all resource views share the same priority and feature presentation", () => {
  for(const file of ["app/page.tsx","app/LegacyNotebook.tsx"]) {
    assert.match(readFileSync(file,"utf8"), /orderMaterials\(/);
  }
  const component=readFileSync("app/LessonMaterials.tsx","utf8");
  assert.match(component,/material-link--featured/);
  assert.match(component,/おすすめの復習教材/);
  assert.match(component,/href=\{resource.url\}/);
});
