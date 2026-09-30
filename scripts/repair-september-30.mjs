// Scoped, retryable correction of existing 9/30 rows. Never recreates IDs,
// changes order/deletion, or overwrites a public edit made after the baseline.
// node scripts/repair-september-30.mjs <baseline.json> [--apply]
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { isDeepStrictEqual } from "node:util";
import data from "../content/september-30.json" with { type: "json" };
import { SITE_ORIGIN } from "../app/lib/site-origin.mjs";
if (!process.argv[2]) throw new Error("Baseline path required");
const before = JSON.parse(await readFile(process.argv[2], "utf8"));
const get = async () => { const r = await fetch(SITE_ORIGIN + "/api/notebook", { signal: AbortSignal.timeout(30000) }); assert.equal(r.status, 200); return r.json(); };
const fields = (row, keys) => Object.fromEntries(keys.map(k => [k, row[k] ?? null]));
const cardFields = ["kind", "question", "answer", "tileQuestion"];
const resourceFields = ["kind", "label", "url"];
const current = await get(), plan = [];
for (const [collection, keys, endpoint] of [["cards", cardFields, "cards"], ["resources", resourceFields, "resources"]]) {
  for (const desired of data[collection]) {
    const old = before.notebook[collection].find(r => r.id === desired.id), row = current[collection].find(r => r.id === desired.id);
    assert.ok(old && row, `Existing row missing: ${desired.id}`);
    for (const k of ["id", "lessonId", "sortOrder", "deleted"]) assert.deepEqual(row[k], old[k], `Metadata changed: ${desired.id}/${k}`);
    assert.equal(desired.sortOrder, old.sortOrder, `Order must stay stable: ${desired.id}`);
    const expected = fields(old, keys), next = fields(desired, keys), actual = fields(row, keys);
    if (isDeepStrictEqual(actual, next)) continue; // safely resume a partial run
    assert.deepEqual(actual, expected, `Public edit detected: ${desired.id}`);
    plan.push({ endpoint, desired, expected, next });
  }
}
console.log(JSON.stringify({ apply: process.argv.includes("--apply"), cards: plan.filter(p=>p.endpoint==="cards").length, resources: plan.filter(p=>p.endpoint==="resources").length }));
if (process.argv.includes("--apply")) for (const p of plan) {
  const r = await fetch(`${SITE_ORIGIN}/api/lessons/${p.desired.lessonId}/${p.endpoint}/${p.desired.id}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...p.next, expected: p.expected }), signal: AbortSignal.timeout(30000) });
  assert.equal(r.status, 200, `Correction stopped; completed rows can be retried safely: ${p.desired.id}`);
  const reloaded = (await get())[p.endpoint].find(v=>v.id===p.desired.id);
  assert.deepEqual(fields(reloaded, p.endpoint==="cards" ? cardFields : resourceFields), p.next, `Readback mismatch: ${p.desired.id}`);
  console.log(JSON.stringify({ verified: p.desired.id }));
}
