import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import {
  progressFrom,
  mergeEvents,
  canRate,
  jstDay,
} from "../app/lib/progress.mjs";
import {
  handleLearningApi,
  hashSecret,
  sanitizeEvent,
  ensureLearning,
} from "../worker/learning-api.mjs";
import { seedCatalog } from "../app/lib/catalog-seed.mjs";
import { handleAdminApi } from "../worker/admin-api.mjs";
import august from "../content/august-2026.json" with { type: "json" };
import { ensureAugustLessons } from "../worker/august-lessons.mjs";
import { isCheckAvailable } from "../app/lib/check-availability.mjs";
import { buildQuestionIndex } from "../app/lib/study-index.mjs";
function database() {
  const sql = new DatabaseSync(":memory:");
  const wrap = (query, values = []) => ({
    bind: (...v) => wrap(query, v),
    all: async () => ({ results: sql.prepare(query).all(...values) }),
    run: async () => sql.prepare(query).run(...values),
  });
  return {
    prepare: wrap,
    batch: async (stmts) => {
      sql.exec("BEGIN");
      try {
        const results = [];
        for (const s of stmts) results.push(await s.run());
        sql.exec("COMMIT");
        return results;
      } catch (e) {
        sql.exec("ROLLBACK");
        throw e;
      }
    },
    sql,
  };
}
const secret = "ensuku-" + "a".repeat(64),
  other = "ensuku-" + "b".repeat(64);
test("cold catalog initialization uses bounded batches, coalesces concurrent requests and preserves edits", async () => {
  const db = database(),
    original = db.batch;
  let batches = 0;
  db.batch = async (statements) => {
    batches++;
    return original(statements);
  };
  await Promise.all([
    ensureLearning(db),
    ensureLearning(db),
    ensureLearning(db),
  ]);
  assert.equal(batches, 2);
  const row = db.sql.prepare("SELECT id FROM theory_catalog LIMIT 1").get();
  db.sql
    .prepare("UPDATE theory_catalog SET data=? WHERE id=?")
    .run('{"title":"edited","deleted":true}', row.id);
  // A new binding simulates a new worker isolate/cold start against the same DB.
  await ensureLearning({ prepare: db.prepare, batch: db.batch });
  assert.equal(batches, 4);
  assert.equal(
    JSON.parse(
      db.sql.prepare("SELECT data FROM theory_catalog WHERE id=?").get(row.id)
        .data,
    ).title,
    "edited",
  );
});
test("failed catalog initialization can be retried", async () => {
  const db = database(),
    original = db.batch;
  let batches = 0;
  db.batch = async (statements) => {
    if (++batches === 1) throw new Error("offline");
    return original(statements);
  };
  await assert.rejects(ensureLearning(db), /offline/);
  await ensureLearning(db);
  assert.equal(batches, 3);
});
async function call(db, path, method = "GET", value, token = secret) {
  const response = await handleLearningApi(
    new Request("https://example.test" + path, {
      method,
      headers: {
        origin: "https://tenten-ensuku.github.io",
        ...(token ? { authorization: "Bearer " + token } : {}),
        ...(value ? { "content-type": "application/json" } : {}),
      },
      body: value ? JSON.stringify(value) : undefined,
    }),
    { DB: db },
  );
  return {
    status: response.status,
    data: response.status === 204 ? null : await response.json(),
    headers: response.headers,
  };
}
const at = (day, hour = 4) =>
  "2026-08-" +
  String(day).padStart(2, "0") +
  "T" +
  String(hour).padStart(2, "0") +
  ":00:00.000Z";
const event = (id, day, correct = true) => ({
  id,
  at: at(day),
  type: "attempt",
  itemId: "check-zero-choice",
  theoryIds: ["theory-zero"],
  correct,
});
test("self rating collects but never invents objective stars", () => {
  const s = progressFrom([
    {
      id: "known",
      type: "known",
      at: at(1),
      target: "base:1",
      theoryIds: ["theory-zero"],
    },
  ]);
  assert.equal(s.collected, 1);
  assert.equal(s.stars, 0);
  assert.equal(canRate(false), false);
  assert.equal(canRate(true, true), false);
  assert.equal(canRate(true, false, true), false);
  assert.equal(canRate(true), true);
});
test("JST next day and seven-day rules; repeats and wrong answers do not demote", () => {
  assert.equal(
    jstDay("2026-08-01T15:00:00Z"),
    jstDay("2026-08-02T00:00:00+09:00"),
  );
  let events = [event("a", 1), event("b", 1)];
  assert.equal(progressFrom(events).stars, 1);
  events.push(event("c", 2));
  assert.equal(progressFrom(events).stars, 2);
  events.push(event("d", 7));
  assert.equal(progressFrom(events).stars, 2);
  events.push(event("e", 8));
  assert.equal(progressFrom(events).stars, 3);
  events.push(event("f", 20, false));
  assert.equal(progressFrom(events).stars, 3);
  assert.equal(progressFrom(events).theories["theory-zero"].needsReview, true);
  assert.equal(progressFrom(mergeEvents(events, events)).stars, 3);
});
test("two-star obtained on day 8 still needs another day for three stars", () => {
  assert.equal(
    progressFrom([event("a", 1), event("b", 8), event("c", 8)]).stars,
    2,
  );
  assert.equal(
    progressFrom([event("a", 1), event("b", 8), event("c", 9)]).stars,
    3,
  );
});
test("rewards are cumulative and unavailable cosmetics cannot be equipped", () => {
  const locked = {
    id: "r",
    at: at(2),
    type: "outfit",
    outfit: "hat",
    room: true,
  };
  assert.equal(progressFrom([locked]).outfit, "base");
  const history = Array.from({ length: 10 }, (_, i) =>
    [event("a" + i, 1), event("b" + i, 2), event("c" + i, 8)].map((e) => ({
      ...e,
      theoryIds: ["theory-" + i],
    })),
  ).flat();
  const state = progressFrom([...history, { ...locked, at: at(9) }]);
  assert.equal(state.stars, 30);
  assert.equal(state.outfit, "hat");
  assert.equal(state.room, true);
  // Catalog deletion cannot lower previously earned progress.
  assert.equal(progressFrom(history).stars, 30);
});
test("canonical catalog has one entry per concept and two distinct learning tasks", () => {
  const c = seedCatalog();
  assert.equal(c.theories.length, 14);
  assert.equal(c.items.length, 28);
  assert.equal(new Set(c.theories.map((t) => t.id)).size, 14);
  for (const t of c.theories) {
    assert.ok(t.canonical);
    assert.ok(t.conditions);
    assert.ok(t.exceptions);
    assert.match(t.sourceUrl, /docs.google.com/);
  }
  for (const q of c.items) {
    assert.equal(q.choices.length, 4);
    assert.equal(new Set(q.choices).size, 4);
    assert.ok(q.correctIndex >= 0 && q.correctIndex < 4);
    if (q.type === "cloze") assert.ok(q.question.includes("［　］"));
  }
});
test("server grades itself, rejects stale and future attempts, and scopes duplicates by session", () => {
  const c = seedCatalog(),
    q = c.items[0],
    e = {
      id: "uuid",
      type: "attempt",
      at: at(1),
      sessionId: "s-1",
      itemId: q.id,
      revision: q.revision,
      choiceIndex: q.correctIndex,
      correct: false,
    };
  const saved = sanitizeEvent(e, c, Date.parse(at(10)));
  assert.equal(saved.correct, true);
  assert.equal(saved.id, "attempt:s-1:" + q.id);
  assert.equal(sanitizeEvent({ ...e, revision: 0 }, c), null);
  assert.equal(sanitizeEvent({ ...e, at: "2100-01-01T00:00:00Z" }, c), null);
});
test("API: anonymous private profile, hashed secrets, no cross-profile access, readonly revocable teacher links", async () => {
  const db = database();
  assert.equal(
    (await call(db, "/api/learning/sync", "GET", undefined, "")).status,
    401,
  );
  assert.equal(
    (await call(db, "/api/learning/profile", "POST", {})).status,
    200,
  );
  assert.equal(
    (await call(db, "/api/learning/profile", "POST", {})).status,
    200,
  );
  assert.equal(
    db.sql.prepare("SELECT count(*) AS n FROM learning_profiles").get().n,
    1,
  );
  assert.equal(
    db.sql.prepare("SELECT token_hash FROM learning_profiles").get().token_hash,
    await hashSecret(secret),
  );
  const catalog = (await call(db, "/api/catalog")).data;
  const q = catalog.items[0],
    a = {
      id: "attempt:test-session:" + q.id,
      type: "attempt",
      sessionId: "test-session",
      itemId: q.id,
      revision: q.revision,
      choiceIndex: q.correctIndex,
      at: at(1),
    };
  let saved = await call(db, "/api/learning/sync", "POST", { events: [a] });
  assert.equal(saved.data.events.length, 1);
  assert.equal(progressFrom(saved.data.events).stars, 1);
  saved = await call(db, "/api/learning/sync", "POST", { events: [a] });
  assert.equal(saved.data.events.length, 1);
  await call(db, "/api/learning/profile", "POST", {}, other);
  assert.equal(
    (await call(db, "/api/learning/sync", "GET", undefined, other)).data.events
      .length,
    0,
  );
  const share = (await call(db, "/api/learning/shares", "POST", {})).data.token;
  const teacher = await call(
    db,
    "/api/learning/teacher",
    "GET",
    undefined,
    share,
  );
  assert.equal(teacher.status, 200);
  assert.equal(teacher.data.stars, 1);
  assert.equal(teacher.data.sessions, undefined);
  assert.equal(teacher.data.events, undefined);
  assert.equal(
    (await call(db, "/api/learning/sync", "POST", { events: [a] }, share))
      .status,
    401,
  );
  await call(db, "/api/learning/shares", "DELETE");
  assert.equal(
    (await call(db, "/api/learning/teacher", "GET", undefined, share)).status,
    404,
  );
  db.sql.close();
});
test("API: catalog edits persist, soft delete/restore, ordering leaves IDs alone, failed validation is atomic", async () => {
  const db = database(),
    catalog = (await call(db, "/api/catalog")).data,
    t = catalog.theories[0],
    q = catalog.items[0];
  await call(db, "/api/catalog/theories/" + t.id, "PUT", {
    ...t,
    title: "編集後のタイトル",
    deleted: true,
  });
  let c = (await call(db, "/api/catalog")).data;
  assert.equal(c.theories[0].title, "編集後のタイトル");
  assert.equal(c.theories[0].deleted, true);
  await call(db, "/api/catalog/theories/" + t.id, "PUT", {
    ...t,
    deleted: false,
  });
  await call(db, "/api/catalog/items/" + q.id, "PUT", {
    ...q,
    explanation: "説明の更新",
  });
  c = (await call(db, "/api/catalog")).data;
  assert.equal(c.items.find((x) => x.id === q.id).revision, 2);
  const bad = await call(db, "/api/catalog/items/" + q.id, "PUT", {
    ...q,
    choices: ["same", "same", "same", "same"],
  });
  assert.equal(bad.status, 400);
  assert.equal(
    (await call(db, "/api/catalog")).data.items.find((x) => x.id === q.id)
      .explanation,
    "説明の更新",
  );
  const order = {
    lessonId: "sakurakou-2026-07-21",
    keys: ["sakurakou-2026-07-21:base:3", "sakurakou-2026-07-21:base:1"],
  };
  assert.equal(
    (await call(db, "/api/catalog/order", "PUT", order)).status,
    200,
  );
  assert.deepEqual(
    (await call(db, "/api/catalog")).data.orders.map((x) => x.cardKey),
    order.keys,
  );
  assert.equal(
    (
      await call(db, "/api/catalog/order", "PUT", {
        ...order,
        keys: [order.keys[0], order.keys[0]],
      })
    ).status,
    400,
  );
  db.sql.close();
});
test("session state, manual review removal and offline batch retries round trip", async () => {
  const db = database();
  await call(db, "/api/learning/profile", "POST", {});
  const session = {
    id: "session-1",
    slot: "flash:lesson-1",
    lessonId: "lesson-1",
    mode: "flash",
    keys: ["lesson-1:base:1", "lesson-1:base:2"],
    index: 1,
    elapsed: 46,
    revealed: true,
    picks: {},
    ratings: { "lesson-1:base:1": "known" },
    completed: false,
  };
  const events = [
    { id: "session-save", type: "session", at: at(1), session },
    {
      id: "review",
      type: "review",
      at: at(1),
      target: "lesson-1:base:2",
      active: true,
    },
  ];
  await call(db, "/api/learning/sync", "POST", { events });
  await call(db, "/api/learning/sync", "POST", { events });
  let state = progressFrom((await call(db, "/api/learning/sync")).data.events);
  assert.equal(state.sessions[session.slot].index, 1);
  assert.equal(state.sessions[session.slot].elapsed, 46);
  assert.equal(state.sessions[session.slot].revealed, true);
  assert.equal(state.reviewIds.length, 1);
  await call(db, "/api/learning/sync", "POST", {
    events: [
      {
        id: "remove",
        type: "review",
        at: at(2),
        target: "lesson-1:base:2",
        active: false,
      },
    ],
  });
  state = progressFrom((await call(db, "/api/learning/sync")).data.events);
  assert.equal(state.reviewIds.length, 0);
  db.sql.close();
});
test("CORS permits authorization for the app only", async () => {
  const r = await handleLearningApi(
    new Request("https://api.test/api/learning/sync", {
      method: "OPTIONS",
      headers: { origin: "https://tenten-ensuku.github.io" },
    }),
    {},
  );
  assert.equal(r.status, 204);
  assert.match(r.headers.get("access-control-allow-headers"), /authorization/);
  const bad = await handleLearningApi(
    new Request("https://api.test/api/learning/sync", {
      headers: { origin: "https://evil.example" },
    }),
    {},
  );
  assert.equal(bad.status, 403);
  assert.equal(bad.headers.get("access-control-allow-origin"), null);
});

test("deleting and restoring edited base cards and custom lessons preserves content", async () => {
  const db = database();
  const admin = async (path, method = "GET", body) => {
    const r = await handleAdminApi(
      new Request("https://example.test" + path, {
        method,
        headers: { "content-type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      }),
      { DB: db },
    );
    assert.equal(r.status, 200);
    return r.json();
  };
  const path = "/api/admin/cards/sakurakou-2026-07-21/1";
  await admin(path, "PUT", {
    question: "編集した問題",
    answer: "編集した解説",
  });
  await admin(path + "/delete", "DELETE");
  let n = await admin("/api/notebook");
  assert.equal(n.overrides[0].deleted, true);
  await admin(path, "DELETE");
  n = await admin("/api/notebook");
  assert.equal(n.overrides[0].question, "編集した問題");
  assert.equal(n.overrides[0].answer, "編集した解説");
  assert.notEqual(n.overrides[0].deleted, true);
  const { lesson } = await admin("/api/lessons", "POST", {
    date: "9/6",
    teacher: "テスト先生",
    title: "確認授業",
    videoUrl: "",
  });
  await admin("/api/lessons/" + lesson.id, "DELETE");
  assert.equal((await admin("/api/notebook")).lessons.find((l) => l.id === lesson.id).deleted, true);
  await admin("/api/lessons/" + lesson.id + "/restore", "POST");
  assert.equal((await admin("/api/notebook")).lessons.find((l) => l.id === lesson.id).deleted, false);
  db.sql.close();
});

test("August lessons stay separate with 30 questions each and the corrected 8/28 video", () => {
  assert.deepEqual(august.lessons.map((l) => l.date), ["8/28", "8/24", "8/22"]);
  assert.match(august.lessons[0].videoUrl, /IogKcSnPscE/);
  const ids = [...august.cards, ...august.items, ...august.resources, ...august.lessons].map((x) => x.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const l of august.lessons) {
    assert.equal(l.teacher, "ねじまき鳥");
    const flash = august.cards.filter((c) => c.lessonId === l.id && c.kind === "question");
    const checks = august.items.filter((q) => q.lessonIds.includes(l.id));
    assert.equal(flash.length + checks.length, 30);
    assert.ok(checks.some((q) => q.type === "choice"));
    assert.ok(checks.some((q) => q.type === "cloze"));
    assert.deepEqual([...flash, ...checks].map((q) => q.sortOrder).sort((a,b) => a-b), Array.from({length:30}, (_,i) => i+1));
    assert.equal(august.cards.filter((c) => c.lessonId === l.id && c.kind === "note").length, 1);
    const resources = august.resources.filter((r) => r.lessonId === l.id);
    assert.match(resources[0].label, /授業の要約/);
    assert.ok(resources.some((r) => r.kind === "image"));
    for (const r of resources) assert.match(r.url, /^https:\/\//);
    const index = buildQuestionIndex([l], {[l.id]: flash.map((c) => ({...c, source:"custom"}))}, checks, []);
    assert.equal(index.length, 30);
    for (const q of checks) {
      assert.equal(q.choices.length, 4);
      assert.equal(new Set(q.choices).size, 4);
      assert.ok(q.correctIndex >= 0 && q.correctIndex < 4);
      assert.match(q.explanation, /https:\/\/www.youtube.com\/watch\?v=/);
      if (q.type === "cloze") assert.equal((q.question.match(/［　］/g) ?? []).length, 1);
    }
  }
});

test("August import is idempotent and preserves lesson/card edits, tombstones and deleted resources", async () => {
  const db = database();
  const request = () => new Request("https://example.test/api/notebook");
  const initial = await (await handleAdminApi(request(), { DB: db })).json();
  assert.equal(initial.lessons.length, 3);
  assert.equal(initial.cards.length, 31);
  const l = august.lessons[0], c = august.cards[1], r = august.resources[0];
  db.sql.prepare("UPDATE notebook_lessons SET title=?, deleted=1 WHERE lesson_id=?").run("edited title", l.id);
  db.sql.prepare("UPDATE notebook_cards SET answer=?, deleted=1 WHERE card_id=?").run("edited answer", c.id);
  db.sql.prepare("DELETE FROM lesson_resources WHERE resource_id=?").run(r.id);
  await ensureAugustLessons({ prepare: db.prepare, batch: db.batch });
  const again = await (await handleAdminApi(request(), { DB: db })).json();
  assert.equal(again.lessons.length, initial.lessons.length);
  assert.equal(again.cards.length, initial.cards.length);
  assert.equal(again.lessons.find((x) => x.id === l.id).title, "edited title");
  assert.equal(again.lessons.find((x) => x.id === l.id).deleted, true);
  assert.equal(again.cards.find((x) => x.id === c.id).answer, "edited answer");
  assert.equal(again.cards.find((x) => x.id === c.id).deleted, true);
  assert.ok(!again.resources.some((x) => x.id === r.id));
  db.sql.close();
});

test("standalone lesson checks can be edited, graded, reviewed and restored without inventing a theory", async () => {
  const db = database(), q = {...august.items[0]};
  let result = await call(db, "/api/catalog/items/" + q.id, "PUT", {...q, explanation: "編集済み解説"});
  assert.equal(result.status, 200);
  const read = () => JSON.parse(db.sql.prepare("SELECT data FROM review_checks WHERE id=?").get(q.id).data);
  assert.equal(read().explanation, "編集済み解説");
  assert.equal(read().revision, 2);
  result = await call(db, "/api/catalog/items/" + q.id, "PUT", {...read(), lessonIds: []});
  assert.equal(result.status, 400);
  const catalog = {theories: [], items: [read()]};
  const wrong = sanitizeEvent({id:"attempt1", type:"attempt", itemId:q.id, revision:2, sessionId:"session-test", choiceIndex:(q.correctIndex+1)%4, at:at(1)}, catalog, Date.parse(at(2)));
  assert.equal(wrong.correct, false);
  assert.deepEqual(wrong.theoryIds, []);
  const state = progressFrom([wrong]);
  assert.deepEqual(state.reviewIds, ["check:" + q.id]);
  assert.deepEqual(state.theories, {});
  assert.equal(isCheckAvailable(read(), []), true);
  assert.equal(isCheckAvailable({...read(), theoryId:"missing"}, []), false);
  for (const deleted of [true, false]) {
    assert.equal((await call(db, "/api/catalog/items/" + q.id, "PUT", {...read(), deleted})).status, 200);
    assert.equal(isCheckAvailable(read(), []), !deleted);
  }
  await call(db, "/api/catalog/items/" + q.id, "PUT", {...read(), deleted:true});
  await ensureLearning({ prepare:db.prepare, batch:db.batch });
  assert.equal(read().deleted, true);
  assert.equal(read().explanation, "編集済み解説");
  db.sql.close();
});

test("removing one review question does not clear other reviews for the same knowledge", () => {
  const rows = [
    { ...event("a", 1, false), itemId: "one" },
    { ...event("b", 1, false), itemId: "two" },
    {
      id: "c",
      at: at(2),
      type: "review",
      target: "check:one",
      active: false,
      theoryIds: ["theory-zero"],
    },
  ];
  assert.equal(progressFrom(rows).theories["theory-zero"].needsReview, true);
  rows.push({
    id: "d",
    at: at(3),
    type: "review",
    target: "check:two",
    active: false,
    theoryIds: ["theory-zero"],
  });
  assert.equal(progressFrom(rows).theories["theory-zero"].needsReview, false);
});
