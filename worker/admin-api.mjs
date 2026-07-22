import { FLASHCARD_OVERRIDES_SCHEMA_SQL, NOTEBOOK_SCHEMA_SQL } from "../db/schema.mjs";

const DEFAULT_LESSON_ID = "sakurakou-2026-07-21";
const MAX_BASE_CARD_ID = 27;
const MAX_LESSON_LENGTH = 120;
const MAX_URL_LENGTH = 2000;
const MAX_QUESTION_LENGTH = 2000;
const MAX_ANSWER_LENGTH = 5000;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const IMAGE_TYPES = new Map([["image/jpeg","jpg"],["image/png","png"],["image/webp","webp"],["image/gif","gif"]]);

function trustedOrigin(origin) {
  return !origin || /^https:\/\/[a-z0-9-]+\.kobotenmitsu\.chatgpt\.site$/i.test(origin)
    || origin === "https://tenten-ensuku.github.io"
    || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
}
function headers(request) {
  const origin = request.headers.get("origin");
  const value = new Headers({
    "Access-Control-Allow-Headers":"content-type",
    "Access-Control-Allow-Methods":"GET, POST, PUT, DELETE, OPTIONS",
    "Cache-Control":"no-store", Vary:"Origin",
  });
  if (origin && trustedOrigin(origin)) value.set("Access-Control-Allow-Origin", origin);
  return value;
}
function json(request, value, status = 200) {
  const responseHeaders = headers(request); responseHeaders.set("Content-Type","application/json; charset=utf-8");
  return new Response(JSON.stringify(value), { status, headers:responseHeaders });
}
function validLessonId(value) { return value === DEFAULT_LESSON_ID || /^lesson-[a-z0-9-]{10,80}$/i.test(value); }
function validCardId(value) { return /^card-[a-z0-9-]{10,80}$/i.test(value); }
function text(value, max) { return typeof value === "string" && value.trim().length <= max ? value.trim() : ""; }
function dateText(value) { return typeof value === "string" && /^\d{1,2}\/\d{1,2}$/.test(value.trim()) ? value.trim() : ""; }
function videoUrl(value) {
  const url = text(value, MAX_URL_LENGTH);
  if (!url) return "";
  try { const parsed = new URL(url); return /^https?:$/.test(parsed.protocol) ? url : ""; } catch { return ""; }
}
async function ensureSchema(db) {
  await db.prepare(FLASHCARD_OVERRIDES_SCHEMA_SQL).run();
  for (const sql of NOTEBOOK_SCHEMA_SQL) await db.prepare(sql).run();
}
async function parseBody(request) {
  try { return await request.json(); } catch { return null; }
}
async function nextSortOrder(db, lessonId) {
  const result = await db.prepare("SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order FROM notebook_cards WHERE lesson_id = ?").bind(lessonId).all();
  return Number(result.results?.[0]?.next_order ?? 1);
}

export async function handleAdminApi(request, env) {
  const url = new URL(request.url);
  const managed = url.pathname === "/api/notebook" || url.pathname === "/api/cards"
    || url.pathname.startsWith("/api/admin/cards/") || url.pathname.startsWith("/api/lessons") || url.pathname.startsWith("/api/images");
  if (!managed) return null;
  if (!trustedOrigin(request.headers.get("origin"))) return json(request,{error:"許可されていない接続元です。"},403);
  if (request.method === "OPTIONS") return new Response(null,{status:204,headers:headers(request)});
  const imageMatch = url.pathname.match(/^\/api\/images\/(note-images\/[a-f0-9-]+\.(?:jpg|png|webp|gif))$/i);
  if (imageMatch && request.method === "GET") {
    if (!env.MEDIA) return json(request,{error:"画像保存を利用できません。"},503);
    const object = await env.MEDIA.get(imageMatch[1]);
    if (!object) return json(request,{error:"画像が見つかりません。"},404);
    const imageHeaders = headers(request); imageHeaders.set("Content-Type",object.httpMetadata?.contentType ?? "application/octet-stream"); imageHeaders.set("Cache-Control","public, max-age=31536000, immutable");
    return new Response(object.body,{headers:imageHeaders});
  }
  if (url.pathname === "/api/images" && request.method === "POST") {
    if (!env.MEDIA) return json(request,{error:"画像保存を利用できません。"},503);
    const type = request.headers.get("content-type")?.split(";",1)[0].toLowerCase() ?? "";
    const extension = IMAGE_TYPES.get(type); const declaredSize = Number(request.headers.get("content-length") ?? "0");
    if (!extension || (declaredSize && declaredSize > MAX_IMAGE_BYTES)) return json(request,{error:"PNG・JPEG・WebP・GIFの8MB以下の画像を選んでください。"},400);
    const bytes = await request.arrayBuffer();
    if (!bytes.byteLength || bytes.byteLength > MAX_IMAGE_BYTES) return json(request,{error:"PNG・JPEG・WebP・GIFの8MB以下の画像を選んでください。"},400);
    const key = `note-images/${crypto.randomUUID()}.${extension}`;
    await env.MEDIA.put(key,bytes,{httpMetadata:{contentType:type}});
    return json(request,{ok:true,url:`${url.origin}/api/images/${key}`,markdown:`![画像](${url.origin}/api/images/${key})`});
  }
  if (!env.DB) return json(request,{error:"保存データベースを利用できません。"},503);
  await ensureSchema(env.DB);

  if (url.pathname === "/api/notebook" && request.method === "GET") {
    const [legacy, metadata, lessons, cards] = await Promise.all([
      env.DB.prepare("SELECT lesson_id, card_id, question, answer, deleted, updated_at FROM lesson_card_overrides ORDER BY card_id").all(),
      env.DB.prepare("SELECT lesson_id, lesson_date, title, video_url, updated_at FROM lesson_metadata_overrides").all(),
      env.DB.prepare("SELECT lesson_id, lesson_date, title, video_url, deleted, updated_at FROM notebook_lessons ORDER BY created_at DESC").all(),
      env.DB.prepare("SELECT card_id, lesson_id, sort_order, kind, question, answer, deleted, updated_at FROM notebook_cards ORDER BY lesson_id, sort_order, created_at").all(),
    ]);
    return json(request,{
      overrides:(legacy.results ?? []).map((row) => ({lessonId:row.lesson_id,id:row.card_id,question:row.question,answer:row.answer,...(row.deleted === 1 ? {deleted:true}:{}),updatedAt:row.updated_at})),
      metadata:(metadata.results ?? []).map((row) => ({lessonId:row.lesson_id,date:row.lesson_date,title:row.title,videoUrl:row.video_url,updatedAt:row.updated_at})),
      lessons:(lessons.results ?? []).map((row) => ({id:row.lesson_id,date:row.lesson_date,title:row.title,videoUrl:row.video_url,deleted:row.deleted === 1,updatedAt:row.updated_at})),
      cards:(cards.results ?? []).map((row) => ({id:row.card_id,lessonId:row.lesson_id,sortOrder:row.sort_order,kind:row.kind,question:row.question,answer:row.answer,deleted:row.deleted === 1,updatedAt:row.updated_at})),
    });
  }
  if (url.pathname === "/api/cards" && request.method === "GET") {
    const result = await env.DB.prepare("SELECT lesson_id, card_id, question, answer, deleted, updated_at FROM lesson_card_overrides ORDER BY card_id").all();
    return json(request,{overrides:(result.results ?? []).map((row) => ({lessonId:row.lesson_id,id:row.card_id,question:row.question,answer:row.answer,...(row.deleted === 1 ? {deleted:true}:{}),updatedAt:row.updated_at}))});
  }

  const baseMatch = url.pathname.match(/^\/api\/admin\/cards\/([^/]+)\/(\d+)(\/delete)?$/);
  if (baseMatch && baseMatch[1] === DEFAULT_LESSON_ID) {
    const id = Number(baseMatch[2]);
    if (!Number.isInteger(id) || id < 1 || id > MAX_BASE_CARD_ID) return json(request,{error:"対象のカードが見つかりません。"},404);
    if (baseMatch[3]) {
      if (request.method !== "DELETE") return json(request,{error:"この操作は削除専用です。"},405);
      await env.DB.prepare("INSERT INTO lesson_card_overrides (lesson_id,card_id,question,answer,deleted,updated_at) VALUES (?,?,'','',1,CURRENT_TIMESTAMP) ON CONFLICT(lesson_id,card_id) DO UPDATE SET question='',answer='',deleted=1,updated_at=CURRENT_TIMESTAMP").bind(DEFAULT_LESSON_ID,id).run();
      return json(request,{ok:true,deleted:true});
    }
    if (request.method === "PUT") {
      const body = await parseBody(request); const question = text(body?.question,MAX_QUESTION_LENGTH); const answer = text(body?.answer,MAX_ANSWER_LENGTH);
      if (!question || !answer) return json(request,{error:"問題文と解説を入力してください。"},400);
      await env.DB.prepare("INSERT INTO lesson_card_overrides (lesson_id,card_id,question,answer,deleted,updated_at) VALUES (?,?,?,?,0,CURRENT_TIMESTAMP) ON CONFLICT(lesson_id,card_id) DO UPDATE SET question=excluded.question,answer=excluded.answer,deleted=0,updated_at=CURRENT_TIMESTAMP").bind(DEFAULT_LESSON_ID,id,question,answer).run();
      return json(request,{ok:true});
    }
    if (request.method === "DELETE") {
      await env.DB.prepare("DELETE FROM lesson_card_overrides WHERE lesson_id = ? AND card_id = ?").bind(DEFAULT_LESSON_ID,id).run();
      return json(request,{ok:true,restored:true});
    }
    return json(request,{error:"この操作には対応していません。"},405);
  }

  if (url.pathname === "/api/lessons" && request.method === "POST") {
    const body = await parseBody(request); const date = dateText(body?.date); const title = text(body?.title,MAX_LESSON_LENGTH); const video = videoUrl(body?.videoUrl);
    if (!date || !title || (body?.videoUrl && !video)) return json(request,{error:"日付、タイトル、YouTubeリンクを確認してください。"},400);
    const id = `lesson-${crypto.randomUUID()}`;
    await env.DB.prepare("INSERT INTO notebook_lessons (lesson_id,lesson_date,title,video_url) VALUES (?,?,?,?)").bind(id,date,title,video).run();
    return json(request,{ok:true,lesson:{id,date,title,videoUrl:video}});
  }

  const lessonMatch = url.pathname.match(/^\/api\/lessons\/([^/]+)$/);
  if (lessonMatch) {
    const lessonId = lessonMatch[1];
    if (!validLessonId(lessonId)) return json(request,{error:"対象の授業が見つかりません。"},404);
    if (request.method === "PUT") {
      const body = await parseBody(request); const date = dateText(body?.date); const title = text(body?.title,MAX_LESSON_LENGTH); const video = videoUrl(body?.videoUrl);
      if (!date || !title || (body?.videoUrl && !video)) return json(request,{error:"日付、タイトル、YouTubeリンクを確認してください。"},400);
      if (lessonId === DEFAULT_LESSON_ID) await env.DB.prepare("INSERT INTO lesson_metadata_overrides (lesson_id,lesson_date,title,video_url,updated_at) VALUES (?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(lesson_id) DO UPDATE SET lesson_date=excluded.lesson_date,title=excluded.title,video_url=excluded.video_url,updated_at=CURRENT_TIMESTAMP").bind(lessonId,date,title,video).run();
      else await env.DB.prepare("UPDATE notebook_lessons SET lesson_date=?,title=?,video_url=?,updated_at=CURRENT_TIMESTAMP WHERE lesson_id=?").bind(date,title,video,lessonId).run();
      return json(request,{ok:true});
    }
    if (request.method === "DELETE" && lessonId !== DEFAULT_LESSON_ID) {
      await env.DB.prepare("UPDATE notebook_lessons SET deleted=1,updated_at=CURRENT_TIMESTAMP WHERE lesson_id=?").bind(lessonId).run();
      return json(request,{ok:true,deleted:true});
    }
  }

  const cardCollection = url.pathname.match(/^\/api\/lessons\/([^/]+)\/cards$/);
  if (cardCollection && request.method === "POST") {
    const lessonId = cardCollection[1];
    if (!validLessonId(lessonId)) return json(request,{error:"対象の授業が見つかりません。"},404);
    const body = await parseBody(request); const kind = ["question","section","note"].includes(body?.kind) ? body.kind : "question";
    const question = text(body?.question,MAX_QUESTION_LENGTH); const answer = text(body?.answer,MAX_ANSWER_LENGTH);
    if (!question || !answer) return json(request,{error:"問題文と解説を入力してください。"},400);
    const id = `card-${crypto.randomUUID()}`; const sortOrder = await nextSortOrder(env.DB,lessonId);
    await env.DB.prepare("INSERT INTO notebook_cards (card_id,lesson_id,sort_order,kind,question,answer) VALUES (?,?,?,?,?,?)").bind(id,lessonId,sortOrder,kind,question,answer).run();
    return json(request,{ok:true,card:{id,lessonId,sortOrder,kind,question,answer}});
  }

  const cardMatch = url.pathname.match(/^\/api\/lessons\/([^/]+)\/cards\/([^/]+)(\/restore)?$/);
  if (cardMatch && validLessonId(cardMatch[1]) && validCardId(cardMatch[2])) {
    const [,lessonId,cardId,restore] = cardMatch;
    if (restore) {
      if (request.method !== "POST") return json(request,{error:"この操作には対応していません。"},405);
      await env.DB.prepare("UPDATE notebook_cards SET deleted=0,updated_at=CURRENT_TIMESTAMP WHERE lesson_id=? AND card_id=?").bind(lessonId,cardId).run();
      return json(request,{ok:true,restored:true});
    }
    if (request.method === "PUT") {
      const body = await parseBody(request); const kind = ["question","section","note"].includes(body?.kind) ? body.kind : "question";
      const question = text(body?.question,MAX_QUESTION_LENGTH); const answer = text(body?.answer,MAX_ANSWER_LENGTH);
      if (!question || !answer) return json(request,{error:"問題文と解説を入力してください。"},400);
      await env.DB.prepare("UPDATE notebook_cards SET kind=?,question=?,answer=?,deleted=0,updated_at=CURRENT_TIMESTAMP WHERE lesson_id=? AND card_id=?").bind(kind,question,answer,lessonId,cardId).run();
      return json(request,{ok:true});
    }
    if (request.method === "DELETE") {
      await env.DB.prepare("UPDATE notebook_cards SET deleted=1,updated_at=CURRENT_TIMESTAMP WHERE lesson_id=? AND card_id=?").bind(lessonId,cardId).run();
      return json(request,{ok:true,deleted:true});
    }
  }
  return json(request,{error:"対象の操作が見つかりません。"},404);
}
