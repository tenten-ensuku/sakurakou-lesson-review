import { FLASHCARD_OVERRIDES_SCHEMA_SQL } from "../db/schema.mjs";

const LESSON_ID = "sakurakou-2026-07-21";
const MAX_CARD_ID = 27;

function trustedOrigin(origin) {
  return !origin || /^https:\/\/[a-z0-9-]+\.kobotenmitsu\.chatgpt\.site$/i.test(origin)
    || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
}
function headers(request) {
  const origin = request.headers.get("origin");
  const value = new Headers({
    "Access-Control-Allow-Headers":"content-type, x-admin-password",
    "Access-Control-Allow-Methods":"GET, POST, PUT, DELETE, OPTIONS",
    "Cache-Control":"no-store", Vary:"Origin",
  });
  if (origin && trustedOrigin(origin)) value.set("Access-Control-Allow-Origin", origin);
  return value;
}
function json(request, value, status = 200) {
  const valueHeaders = headers(request); valueHeaders.set("Content-Type","application/json; charset=utf-8");
  return new Response(JSON.stringify(value), {status,headers:valueHeaders});
}
function authorized(request, env, bodyPassword = "") {
  return Boolean(env.ADMIN_PASSWORD) && (request.headers.get("x-admin-password") ?? bodyPassword) === env.ADMIN_PASSWORD;
}
function cardPath(pathname) {
  const match = pathname.match(/^\/api\/admin\/cards\/([^/]+)\/(\d+)(\/delete)?$/);
  if (!match || match[1] !== LESSON_ID) return null;
  const id = Number(match[2]);
  if (!Number.isInteger(id) || id < 1 || id > MAX_CARD_ID) return null;
  return { id, deleting:Boolean(match[3]) };
}

export async function handleAdminApi(request, env) {
  const url = new URL(request.url);
  if (url.pathname !== "/api/cards" && url.pathname !== "/api/admin/login" && !url.pathname.startsWith("/api/admin/cards/")) return null;
  if (!trustedOrigin(request.headers.get("origin"))) return json(request,{error:"許可されていない接続元です。"},403);
  if (request.method === "OPTIONS") return new Response(null,{status:204,headers:headers(request)});

  if (url.pathname === "/api/admin/login" && request.method === "POST") {
    if (!env.ADMIN_PASSWORD) return json(request,{error:"管理機能が設定されていません。"},503);
    let body; try { body = await request.json(); } catch { return json(request,{error:"入力内容を確認してください。"},400); }
    return authorized(request,env,typeof body?.password === "string" ? body.password : "")
      ? json(request,{ok:true}) : json(request,{error:"パスワードが違います。"},401);
  }
  if (!env.DB) return json(request,{error:"問題データベースを利用できません。"},503);
  await env.DB.prepare(FLASHCARD_OVERRIDES_SCHEMA_SQL).run();

  if (url.pathname === "/api/cards" && request.method === "GET") {
    const result = await env.DB.prepare("SELECT lesson_id, card_id, question, answer, deleted, updated_at FROM lesson_card_overrides ORDER BY card_id").all();
    return json(request,{overrides:(result.results ?? []).map((row) => ({lessonId:row.lesson_id,id:row.card_id,question:row.question,answer:row.answer,...(row.deleted === 1 ? {deleted:true}:{}),updatedAt:row.updated_at}))});
  }

  const parsed = cardPath(url.pathname);
  if (!parsed) return json(request,{error:"対象のカードが見つかりません。"},404);
  if (!authorized(request,env)) return json(request,{error:"管理パスワードを確認してください。"},401);

  if (parsed.deleting) {
    if (request.method !== "DELETE") return json(request,{error:"対応していない操作です。"},405);
    await env.DB.prepare(`INSERT INTO lesson_card_overrides (lesson_id,card_id,question,answer,deleted,updated_at) VALUES (?,?,'','',1,CURRENT_TIMESTAMP) ON CONFLICT(lesson_id,card_id) DO UPDATE SET question='',answer='',deleted=1,updated_at=CURRENT_TIMESTAMP`).bind(LESSON_ID,parsed.id).run();
    return json(request,{ok:true,deleted:true});
  }
  if (request.method === "PUT") {
    let body; try { body = await request.json(); } catch { return json(request,{error:"入力内容を確認してください。"},400); }
    const question = typeof body?.question === "string" ? body.question.trim() : "";
    const answer = typeof body?.answer === "string" ? body.answer.trim() : "";
    if (!question || !answer) return json(request,{error:"タイトル・問題文と解答・本文を入力してください。"},400);
    if (question.length > 2000 || answer.length > 5000) return json(request,{error:"文章が長すぎます。"},400);
    await env.DB.prepare(`INSERT INTO lesson_card_overrides (lesson_id,card_id,question,answer,deleted,updated_at) VALUES (?,?,?,?,0,CURRENT_TIMESTAMP) ON CONFLICT(lesson_id,card_id) DO UPDATE SET question=excluded.question,answer=excluded.answer,deleted=0,updated_at=CURRENT_TIMESTAMP`).bind(LESSON_ID,parsed.id,question,answer).run();
    return json(request,{ok:true});
  }
  if (request.method === "DELETE") {
    await env.DB.prepare("DELETE FROM lesson_card_overrides WHERE lesson_id = ? AND card_id = ?").bind(LESSON_ID,parsed.id).run();
    return json(request,{ok:true});
  }
  return json(request,{error:"対応していない操作です。"},405);
}
