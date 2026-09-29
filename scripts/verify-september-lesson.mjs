// Public-content-only checks. Never requests personal profiles, events or share secrets.
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import data from "../content/september-2026.json" with { type: "json" };
import evidence from "../docs/september-2026-provenance.json" with { type: "json" };
import { APP_VERSION } from "../app/lib/lesson.mjs";
import { SITE_ORIGIN, resolveSiteUrl } from "../app/lib/site-origin.mjs";
const args = process.argv.slice(2);
const origin = args.find((a) => /^https?:/.test(a)) || SITE_ORIGIN;
async function get(path) { const r = await fetch(resolveSiteUrl(new URL(path, origin).href)); assert.equal(r.status, 200, path); return r; }
const snapshot = { notebook: await (await get("/api/notebook")).json(), catalog: await (await get("/api/catalog")).json() };
if (args.includes("--capture")) {
  await writeFile(args[args.indexOf("--capture")+1], JSON.stringify(snapshot, null, 2) + "\n");
  console.log(JSON.stringify({ captured: true, lessons: snapshot.notebook.lessons.length, cards: snapshot.notebook.cards.length, checks: snapshot.catalog.items.length }));
} else {
  const l = snapshot.notebook.lessons.find((l) => l.id === data.lessons[0].id);
  assert.ok(l && !l.deleted);
  for (const k of ["date", "teacher", "title", "videoUrl"]) assert.equal(l[k], data.lessons[0][k]);
  for (const expected of data.cards) {
    const row = snapshot.notebook.cards.find((c) => c.id === expected.id);
    assert.ok(row && !row.deleted);
    for (const k of ["question", "answer", "sortOrder", "kind"]) assert.equal(row[k], expected[k]);
  }
  for (const expected of data.items) {
    const row = snapshot.catalog.items.find((c) => c.id === expected.id);
    assert.ok(row && !row.deleted);
    for (const k of ["question", "explanation", "sortOrder", "choices", "correctIndex", "type"]) assert.deepEqual(row[k], expected[k]);
  }
  const html = await (await get("/materials/september-2026/0927.html")).text();
  assert.ok(html.includes(`data-app-version="${APP_VERSION}"`));
  const scenes = [...html.matchAll(/<article class="scene"[^>]*>([\s\S]*?)<\/article>/g)];
  assert.equal(scenes.length, 8);
  for (const [, s] of scenes) assert.ok(s.indexOf("<figure>") < s.indexOf('class="scene-explanation"'));
  for (const im of Object.values(evidence.images)) {
    const r = await get(im.url);
    assert.match(r.headers.get("content-type"), /image\/jpeg/);
    assert.equal(createHash("sha256").update(new Uint8Array(await r.arrayBuffer())).digest("hex"), im.sha256);
  }
  let preserved = false;
  if (args.includes("--baseline")) {
    const before = JSON.parse(await readFile(args[args.indexOf("--baseline")+1], "utf8"));
    for (const group of ["notebook", "catalog"]) for (const [name, rows] of Object.entries(before[group])) {
      if (!Array.isArray(rows)) continue;
      const after = snapshot[group][name];
      for (const row of rows) assert.ok(after.some((x) => JSON.stringify(x) === JSON.stringify(row)), `Existing ${group}/${name} row changed`);
    }
    preserved = true;
  }
  console.log(JSON.stringify({ origin, lesson: l.date, questions: 30, images: 17, summaryScenes: 8, existingPublicDataUnchanged: preserved, version: APP_VERSION }, null, 2));
}
