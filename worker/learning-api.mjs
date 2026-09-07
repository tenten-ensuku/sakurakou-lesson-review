import { LEARNING_SCHEMA_SQL } from "../db/learning-schema.mjs";
import { seedCatalog } from "../app/lib/catalog-seed.mjs";
import { isCheckAvailable } from "../app/lib/check-availability.mjs";
import { seedAugustChecks } from "./august-lessons.mjs";
import { progressFrom, teacherView, newSecret } from "../app/lib/progress.mjs";
export const validSecret = (v) => /^ensuku-[a-f0-9]{64}$/.test(v ?? "");
export async function hashSecret(secret) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret)),
    ),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
}
const origins = (o) =>
  !o ||
  o === "https://tenten-ensuku.github.io" ||
  o === "https://sakurakou-lesson-review.pages.dev" ||
  /^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(o) ||
  /^https:\/\/[a-z0-9-]+\.kobotenmitsu\.chatgpt\.site$/.test(o);
function response(req, data, status = 200) {
  const h = {
    "content-type": "application/json;charset=utf-8",
    "cache-control": "no-store",
    "access-control-allow-headers": "content-type,authorization",
    "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
    vary: "Origin",
    "referrer-policy": "no-referrer",
  };
  const o = req.headers.get("origin");
  if (o && origins(o)) h["access-control-allow-origin"] = o;
  return new Response(status === 204 ? null : JSON.stringify(data), {
    status,
    headers: h,
  });
}
async function body(req) {
  const bytes = await req.text();
  if (bytes.length > 250000) throw new Error("入力が大きすぎます。");
  try {
    return JSON.parse(bytes);
  } catch {
    throw new Error("入力形式を確認してください。");
  }
}
const idOK = (id) => typeof id === "string" && /^[a-z0-9:_-]{1,220}$/i.test(id);
const string = (v, max = 5000) =>
  typeof v === "string" && v.length <= max ? v : null;
const ids = (v) =>
  Array.isArray(v) && v.length <= 500 && v.every(idOK) ? [...new Set(v)] : null;
const http = (v) =>
  !v || (typeof v === "string" && v.length < 2000 && /^https?:\/\//i.test(v));
const initialized = new WeakMap();
export async function ensureLearning(db) {
  if (!initialized.has(db)) {
    const seed = seedCatalog();
    // One ordered transaction avoids dozens of cold-start network round trips.
    // INSERT OR IGNORE must never overwrite shared edits or deleted entries.
    const pending = db
      .batch([
        ...LEARNING_SCHEMA_SQL.map((sql) => db.prepare(sql)),
        ...seed.theories.map((t) =>
          db
            .prepare(
              "INSERT OR IGNORE INTO theory_catalog(id,data) VALUES (?,?)",
            )
            .bind(t.id, JSON.stringify(t)),
        ),
        ...seed.items.map((q) =>
          db
            .prepare(
              "INSERT OR IGNORE INTO review_checks(id,data) VALUES (?,?)",
            )
            .bind(q.id, JSON.stringify(q)),
        ),
      ])
      .then(() => seedAugustChecks(db))
      .catch((error) => {
        initialized.delete(db);
        throw error;
      });
    initialized.set(db, pending);
  }
  await initialized.get(db);
}
export async function readCatalog(db) {
  const [a, b, c] = await Promise.all([
    db.prepare("SELECT data FROM theory_catalog").all(),
    db.prepare("SELECT data FROM review_checks").all(),
    db
      .prepare(
        "SELECT lesson_id,card_key,sort_order FROM card_order ORDER BY sort_order",
      )
      .all(),
  ]);
  return {
    theories: (a.results ?? [])
      .map((x) => JSON.parse(x.data))
      .sort((a, b) => a.sortOrder - b.sortOrder),
    items: (b.results ?? [])
      .map((x) => JSON.parse(x.data))
      .sort((a, b) => a.sortOrder - b.sortOrder),
    orders: (c.results ?? []).map((x) => ({
      lessonId: x.lesson_id,
      cardKey: x.card_key,
      sortOrder: x.sort_order,
    })),
  };
}
async function readEvents(db, profile) {
  const r = await db
    .prepare(
      "SELECT data FROM learning_events WHERE profile_hash=? ORDER BY event_at,event_id",
    )
    .bind(profile)
    .all();
  return (r.results ?? []).map((x) => JSON.parse(x.data));
}
function validateTheory(v) {
  if (
    !idOK(v?.id) ||
    !string(v.title, 160)?.trim() ||
    !string(v.canonical)?.trim() ||
    !string(v.conditions) ||
    !string(v.exceptions) ||
    !string(v.category, 80) ||
    !string(v.sourceLabel, 160) ||
    !http(v.sourceUrl) ||
    !ids(v.lessonIds) ||
    !ids(v.cardKeys)
  )
    return null;
  return {
    id: v.id,
    title: v.title.trim(),
    canonical: v.canonical,
    conditions: v.conditions,
    exceptions: v.exceptions,
    category: v.category,
    sourceLabel: v.sourceLabel,
    sourceUrl: v.sourceUrl,
    lessonIds: ids(v.lessonIds),
    cardKeys: ids(v.cardKeys),
    deleted: !!v.deleted,
    sortOrder: Number.isFinite(v.sortOrder) ? v.sortOrder : 999,
  };
}
function validateCheck(v) {
  if (
    !idOK(v?.id) ||
    (v.theoryId !== "" && !idOK(v.theoryId)) ||
    !["choice", "cloze"].includes(v.type) ||
    !string(v.question, 2000)?.trim() ||
    !string(v.explanation) ||
    !Array.isArray(v.choices) ||
    v.choices.length !== 4 ||
    v.choices.some((c) => !string(c, 1000)?.trim()) ||
    new Set(v.choices.map((x) => x.trim())).size !== 4 ||
    !Number.isInteger(v.correctIndex) ||
    v.correctIndex < 0 ||
    v.correctIndex > 3 ||
    !ids(v.lessonIds) ||
    (!v.theoryId && !v.lessonIds.length)
  )
    return null;
  if (v.type === "cloze" && !v.question.includes("［　］")) return null;
  return {
    id: v.id,
    theoryId: v.theoryId,
    type: v.type,
    question: v.question,
    choices: v.choices,
    correctIndex: v.correctIndex,
    explanation: v.explanation,
    lessonIds: ids(v.lessonIds),
    sortOrder: Number.isFinite(v.sortOrder) ? v.sortOrder : 999,
    deleted: !!v.deleted,
  };
}
export function sanitizeEvent(e, catalog, now = Date.now()) {
  if (
    !idOK(e?.id) ||
    !Number.isFinite(Date.parse(e.at)) ||
    Date.parse(e.at) < Date.parse("2026-01-01") ||
    Date.parse(e.at) > now + 60000
  )
    return null;
  const event = {
    id: e.id,
    at: new Date(Math.min(Date.parse(e.at), now)).toISOString(),
    type: e.type,
  };
  if (e.type === "attempt") {
    const q = catalog.items.find((q) => q.id === e.itemId && !q.deleted);
    if (
      !q ||
      !isCheckAvailable(q, catalog.theories) ||
      q.revision !== e.revision ||
      !Number.isInteger(e.choiceIndex) ||
      e.choiceIndex < 0 ||
      e.choiceIndex > 3 ||
      !idOK(e.sessionId)
    )
      return null;
    return {
      ...event,
      id: "attempt:" + e.sessionId + ":" + q.id,
      itemId: q.id,
      revision: q.revision,
      choiceIndex: e.choiceIndex,
      sessionId: e.sessionId,
      correct: e.choiceIndex === q.correctIndex,
      theoryIds: q.theoryId ? [q.theoryId] : [],
    };
  }
  if (e.type === "known" && idOK(e.target))
    return {
      ...event,
      target: e.target,
      theoryIds: catalog.theories
        .filter((t) => !t.deleted && t.cardKeys.includes(e.target))
        .map((t) => t.id),
    };
  if (e.type === "review" && idOK(e.target) && typeof e.active === "boolean")
    return {
      ...event,
      target: e.target,
      active: e.active,
      theoryIds: catalog.theories
        .filter(
          (t) =>
            !t.deleted &&
            (t.cardKeys.includes(e.target) ||
              catalog.items.some(
                (q) => q.theoryId === t.id && "check:" + q.id === e.target,
              )),
        )
        .map((t) => t.id),
    };
  if (
    e.type === "outfit" &&
    ["base", "glasses", "scarf", "hat"].includes(e.outfit) &&
    typeof e.room === "boolean"
  )
    return { ...event, outfit: e.outfit, room: e.room };
  if (e.type === "session") {
    const s = e.session;
    if (
      !s ||
      !idOK(s.slot) ||
      !idOK(s.id) ||
      !idOK(s.lessonId) ||
      !["flash", "check", "theory"].includes(s.mode) ||
      !ids(s.keys) ||
      !s.keys.length ||
      !Number.isInteger(s.index) ||
      s.index < 0 ||
      s.index >= s.keys.length ||
      !Number.isFinite(s.elapsed) ||
      s.elapsed < 0 ||
      s.elapsed > 31536000
    )
      return null;
    const picks = {};
    for (const [key, value] of Object.entries(s.picks ?? {})) {
      if (!idOK(key)) return null;
      if (Number.isInteger(value) && value >= 0 && value <= 3)
        picks[key] = value;
    }
    const ratings = {};
    for (const [key, value] of Object.entries(s.ratings ?? {})) {
      if (idOK(key) && ["known", "again"].includes(value)) ratings[key] = value;
    }
    return {
      ...event,
      session: {
        id: s.id,
        slot: s.slot,
        lessonId: s.lessonId,
        mode: s.mode,
        keys: s.keys,
        index: s.index,
        elapsed: Math.floor(s.elapsed),
        revealed: !!s.revealed,
        picks,
        ratings,
        completed: !!s.completed,
        reviewOnly: !!s.reviewOnly,
      },
    };
  }
  return null;
}
export async function handleLearningApi(req, env) {
  const path = new URL(req.url).pathname;
  if (!path.startsWith("/api/learning") && !path.startsWith("/api/catalog"))
    return null;
  if (!origins(req.headers.get("origin")))
    return response(req, { error: "許可されていない接続元です。" }, 403);
  if (req.method === "OPTIONS") return response(req, null, 204);
  if (!env.DB) return response(req, { error: "保存先に接続できません。" }, 503);
  try {
    await ensureLearning(env.DB);
    if (path === "/api/catalog" && req.method === "GET")
      return response(req, await readCatalog(env.DB));
    const cm = path.match(/^\/api\/catalog\/(theories|items)\/([a-z0-9-]+)$/i);
    if (cm && req.method === "PUT") {
      const data = await body(req);
      if (data.id !== cm[2])
        return response(req, { error: "IDが一致しません。" }, 400);
      const value =
        cm[1] === "theories" ? validateTheory(data) : validateCheck(data);
      if (!value)
        return response(
          req,
          {
            error:
              "必須項目・4つの異なる選択肢・正解を確認してください。穴埋めには［　］を1つ置きます。",
          },
          400,
        );
      const table = cm[1] === "theories" ? "theory_catalog" : "review_checks";
      if (cm[1] === "items") {
        const theory = value.theoryId ? await env.DB.prepare(
          "SELECT data FROM theory_catalog WHERE id=?",
        )
          .bind(value.theoryId)
          .all() : null;
        if (value.theoryId && !theory?.results?.length)
          return response(
            req,
            { error: "図鑑項目を先に保存してください。" },
            400,
          );
        const prev = await env.DB.prepare(
          "SELECT data FROM review_checks WHERE id=?",
        )
          .bind(value.id)
          .all();
        value.revision =
          (prev.results?.length
            ? JSON.parse(prev.results[0].data).revision
            : 0) + 1;
      }
      await env.DB.prepare(
        "INSERT INTO " +
          table +
          "(id,data) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,updated_at=CURRENT_TIMESTAMP",
      )
        .bind(value.id, JSON.stringify(value))
        .run();
      return response(req, { ok: true });
    }
    if (path === "/api/catalog/order" && req.method === "PUT") {
      const v = await body(req);
      if (
        !idOK(v.lessonId) ||
        !ids(v.keys) ||
        v.keys.length !== new Set(v.keys).size
      )
        return response(req, { error: "並び順を確認してください。" }, 400);
      const stmts = v.keys.map((key, i) =>
        env.DB.prepare(
          "INSERT INTO card_order(lesson_id,card_key,sort_order) VALUES (?,?,?) ON CONFLICT(lesson_id,card_key) DO UPDATE SET sort_order=excluded.sort_order",
        ).bind(v.lessonId, key, i),
      );
      if (stmts.length) await env.DB.batch(stmts);
      return response(req, { ok: true });
    }
    const bearer = req.headers.get("authorization")?.replace(/^Bearer /, "");
    if (!validSecret(bearer))
      return response(req, { error: "引継ぎコードが必要です。" }, 401);
    const hash = await hashSecret(bearer);
    if (path === "/api/learning/teacher" && req.method === "GET") {
      const shares = await env.DB.prepare(
        "SELECT profile_hash FROM teacher_shares WHERE share_hash=? AND revoked=0",
      )
        .bind(hash)
        .all();
      if (!shares.results?.length)
        return response(
          req,
          { error: "この共有リンクは利用できません。" },
          404,
        );
      return response(
        req,
        teacherView(
          progressFrom(
            await readEvents(env.DB, shares.results[0].profile_hash),
          ),
        ),
      );
    }
    if (path === "/api/learning/profile" && req.method === "POST") {
      await env.DB.prepare(
        "INSERT OR IGNORE INTO learning_profiles(token_hash) VALUES (?)",
      )
        .bind(hash)
        .run();
      return response(req, { ok: true });
    }
    const profile = await env.DB.prepare(
      "SELECT token_hash FROM learning_profiles WHERE token_hash=?",
    )
      .bind(hash)
      .all();
    if (!profile.results?.length)
      return response(req, { error: "引継ぎコードを確認してください。" }, 401);
    if (path === "/api/learning/sync" && req.method === "GET")
      return response(req, { events: await readEvents(env.DB, hash) });
    if (path === "/api/learning/sync" && req.method === "POST") {
      const data = await body(req);
      if (!Array.isArray(data.events) || data.events.length > 100)
        return response(
          req,
          { error: "一度に送れる記録は100件までです。" },
          400,
        );
      const catalog = await readCatalog(env.DB),
        rejected = [],
        statements = [];
      for (const raw of data.events) {
        const e = sanitizeEvent(raw, catalog);
        if (!e) {
          rejected.push(raw?.id);
          continue;
        }
        statements.push(
          env.DB.prepare(
            "INSERT OR IGNORE INTO learning_events(profile_hash,event_id,data,event_at) VALUES (?,?,?,?)",
          ).bind(hash, e.id, JSON.stringify(e), e.at),
        );
      }
      if (statements.length) await env.DB.batch(statements);
      return response(req, {
        events: await readEvents(env.DB, hash),
        rejected,
      });
    }
    if (path === "/api/learning/shares" && req.method === "POST") {
      const token = newSecret(),
        shareHash = await hashSecret(token);
      await env.DB.prepare(
        "INSERT INTO teacher_shares(share_hash,profile_hash) VALUES (?,?)",
      )
        .bind(shareHash, hash)
        .run();
      return response(req, { token });
    }
    if (path === "/api/learning/shares" && req.method === "DELETE") {
      await env.DB.prepare(
        "UPDATE teacher_shares SET revoked=1 WHERE profile_hash=?",
      )
        .bind(hash)
        .run();
      return response(req, { ok: true });
    }
    return response(req, { error: "この操作には対応していません。" }, 405);
  } catch (error) {
    return response(
      req,
      {
        error:
          error instanceof SyntaxError
            ? "入力を確認してください。"
            : "保存できませんでした。通信を確認して再度お試しください。",
      },
      500,
    );
  }
}
