// Read-only post-build / post-deployment content verification.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import august from "../content/august-2026.json" with { type: "json" };
import provenance from "../docs/august-2026-provenance.json" with { type: "json" };

const origin = process.argv[2] || "http://localhost:3000";
async function get(path) {
  const r = await fetch(new URL(path, origin));
  assert.equal(r.status, 200, path);
  return r;
}
const [notebook, catalog] = await Promise.all([
  get("/api/notebook").then((r) => r.json()),
  get("/api/catalog").then((r) => r.json()),
]);
const verified = [];
for (const expected of august.lessons) {
  const l = notebook.lessons.find((l) => l.id === expected.id);
  assert.ok(l, expected.date);
  assert.equal(l.date, expected.date);
  assert.equal(l.teacher, expected.teacher);
  assert.equal(l.videoUrl, expected.videoUrl);
  assert.ok(!l.deleted);
  const cards = notebook.cards.filter((c) => c.lessonId === l.id && !c.deleted);
  const checks = catalog.items.filter((q) => q.lessonIds.includes(l.id) && !q.deleted);
  assert.equal(cards.filter((c) => c.kind === "question").length + checks.length, 30);
  assert.equal(cards.filter((c) => c.kind === "note").length, 1);
  const resource = notebook.resources.filter((r) => r.lessonId === l.id).sort((a,b) => a.sortOrder-b.sortOrder)[0];
  assert.match(resource.label, /授業の要約/);
  const summary = await get(new URL(resource.url).pathname);
  assert.match(summary.headers.get("content-type"), /text\/html/);
  const html = await summary.text();
  assert.ok(html.includes(expected.title));
  assert.equal((html.match(/<section>/g) ?? []).length, 6);
  assert.ok(!html.includes("headless-full"));
  verified.push({date:l.date, teacher:l.teacher, questions:30, summarySections:6});
}
await Promise.all(Object.values(provenance.images).map(async ({url, sha256}) => {
  const r = await get(url);
  assert.match(r.headers.get("content-type"), /image\/jpeg/);
  const bytes = new Uint8Array(await r.arrayBuffer());
  assert.equal(createHash("sha256").update(bytes).digest("hex"), sha256, url);
}));
const css = await get("/materials/august-2026/summary.css");
assert.match(await css.text(), /object-fit:contain/);
console.log(JSON.stringify({ origin, lessons: verified, verifiedImages: Object.keys(provenance.images).length }, null, 2));
