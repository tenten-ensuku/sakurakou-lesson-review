// Explicitly invoked deployment check. Creates one anonymous QA record, never edits lessons.
import assert from "node:assert/strict";
import { newSecret } from "../app/lib/progress.mjs";
const base = process.argv[2];
if (!base?.startsWith("https://"))
  throw new Error("Pass the deployed HTTPS API origin");
const request = async (path, method = "GET", body, token) => {
  const r = await fetch(base + path, {
    method,
    headers: {
      origin: "https://tenten-ensuku.github.io",
      ...(token ? { authorization: "Bearer " + token } : {}),
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, body: await r.json(), headers: r.headers };
};
const notebook = await request("/api/notebook");
assert.equal(notebook.status, 200);
const catalog = await request("/api/catalog");
assert.equal(catalog.status, 200);
assert.ok(catalog.body.theories.length >= 14);
assert.ok(catalog.body.items.length >= 28);
assert.equal((await request("/api/learning/sync")).status, 401);
const secret = newSecret();
assert.equal(
  (await request("/api/learning/profile", "POST", {}, secret)).status,
  200,
);
const q = catalog.body.items.find((q) => !q.deleted),
  sessionId = crypto.randomUUID();
const event = {
  id: "qa-" + crypto.randomUUID(),
  type: "attempt",
  at: new Date().toISOString(),
  sessionId,
  itemId: q.id,
  revision: q.revision,
  choiceIndex: q.correctIndex,
};
await request("/api/learning/sync", "POST", { events: [event] }, secret);
await request("/api/learning/sync", "POST", { events: [event] }, secret);
const saved = await request("/api/learning/sync", "GET", undefined, secret);
assert.equal(saved.status, 200);
assert.equal(saved.body.events.length, 1);
assert.equal(saved.body.events[0].correct, true);
const share = await request("/api/learning/shares", "POST", {}, secret);
assert.equal(share.status, 200);
const teacher = await request(
  "/api/learning/teacher",
  "GET",
  undefined,
  share.body.token,
);
assert.equal(teacher.status, 200);
assert.equal(teacher.body.stars, 1);
assert.equal(teacher.body.events, undefined);
assert.equal(teacher.body.sessions, undefined);
assert.equal(
  (
    await request(
      "/api/learning/sync",
      "POST",
      { events: [] },
      share.body.token,
    )
  ).status,
  401,
);
await request("/api/learning/shares", "DELETE", undefined, secret);
assert.equal(
  (await request("/api/learning/teacher", "GET", undefined, share.body.token))
    .status,
  404,
);
console.log(
  JSON.stringify({
    ok: true,
    lessons: notebook.body.lessons.length + 1,
    baseOverrides: notebook.body.overrides.length,
    customCards: notebook.body.cards.length,
    resources: notebook.body.resources.length,
    theories: catalog.body.theories.length,
    checks: catalog.body.items.length,
    privateSave: "passed",
    retryDeduplication: "passed",
    teacherReadOnlyAndRevocation: "passed",
  }),
);
