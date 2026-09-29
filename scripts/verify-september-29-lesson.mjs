// Read-only public checks. Does not read learning profiles or write shared teaching data.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import data from "../content/september-29.json" with { type: "json" };
import evidence from "../docs/september-29-provenance.json" with { type: "json" };
import { APP_VERSION } from "../app/lib/lesson.mjs";
import { SITE_ORIGIN, resolveSiteUrl } from "../app/lib/site-origin.mjs";
import { planCuration } from "./curate-september-29.mjs";
const origin=SITE_ORIGIN;
async function get(url){const r=await fetch(resolveSiteUrl(String(url)),{signal:AbortSignal.timeout(30000)});assert.equal(r.status,200,String(url));return r;}
const snapshot={notebook:await(await get(origin+"/api/notebook")).json(),catalog:await(await get(origin+"/api/catalog")).json()};
const lesson=snapshot.notebook.lessons.find((l)=>l.id===data.lessons[0].id);
assert.ok(lesson&&!lesson.deleted);
for(const key of ["date","teacher","title","videoUrl"])assert.equal(lesson[key],data.lessons[0][key]);
for(const q of data.cards){const row=snapshot.notebook.cards.find((r)=>r.id===q.id);assert.ok(row&&!row.deleted);for(const k of ["question","answer","kind"])assert.equal(row[k],q[k]);}
for(const q of data.items){const row=snapshot.catalog.items.find((r)=>r.id===q.id);assert.ok(row&&!row.deleted);for(const k of ["question","explanation","choices","correctIndex","sortOrder","type"])assert.deepEqual(row[k],q[k]);}
for(const r of data.resources){const row=snapshot.notebook.resources.find((x)=>x.id===r.id);assert.ok(row);for(const k of ["label","url","kind","sortOrder"])assert.equal(row[k],r[k]);}
const visibleCards=snapshot.notebook.cards.filter(c=>c.lessonId===lesson.id&&!c.deleted&&c.kind==="question");
const visibleChecks=snapshot.catalog.items.filter(c=>c.lessonIds.includes(lesson.id)&&!c.deleted);
assert.equal(visibleCards.length,6);assert.equal(visibleChecks.length,0);
const order=new Map(snapshot.catalog.orders.filter(o=>o.lessonId===lesson.id).map(o=>[o.cardKey,o.sortOrder]));
visibleCards.sort((a,b)=>(order.get(`${lesson.id}:custom:${a.id}`)??a.sortOrder)-(order.get(`${lesson.id}:custom:${b.id}`)??b.sortOrder));
assert.deepEqual(visibleCards.map(c=>c.id),data.cards.filter(c=>c.kind==="question").map(c=>c.id));
let preserved=false;
const at=process.argv.indexOf("--baseline");
if(at>=0){
  const before=JSON.parse(await readFile(process.argv[at+1],"utf8"));
  assert.deepEqual(planCuration(before,snapshot),[]);
  for(const group of ["notebook","catalog"])for(const [key,rows]of Object.entries(before[group])){
    if(!Array.isArray(rows))continue;
    for(const row of rows){
      const intentional=(group==="notebook"&&["cards","resources"].includes(key)&&row.lessonId===lesson.id)||(group==="catalog"&&key==="items"&&row.lessonIds?.includes(lesson.id))||(group==="catalog"&&key==="orders"&&row.lessonId===lesson.id);
      if(!intentional)assert.ok(snapshot[group][key].some((r)=>JSON.stringify(r)===JSON.stringify(row)),`Unrelated ${group}/${key} row changed`);
    }
  }
  assert.equal(snapshot.notebook.cards.length,before.notebook.cards.length);
  assert.equal(snapshot.catalog.items.length,before.catalog.items.length);
  assert.equal(snapshot.notebook.cards.filter(c=>c.lessonId===lesson.id&&c.deleted).length+snapshot.catalog.items.filter(c=>c.lessonIds.includes(lesson.id)&&c.deleted).length,24);
  preserved=true;
}
for(const im of Object.values(evidence.images)){
  const r=await get(im.url);assert.match(r.headers.get("content-type"),/image\/jpeg/);
  assert.equal(createHash("sha256").update(new Uint8Array(await r.arrayBuffer())).digest("hex"),im.sha256);
}
const publicUrls=["https://sakurakou-lesson-review.pages.dev/",origin+"/","https://tenten-ensuku.github.io/sakurakou-lesson-review/"];
for(const base of publicUrls){
  const home=await(await get(base)).text(); assert.match(home,/エンスク授業ノート/);
  const html=await(await get(new URL("materials/september-2026/0929.html",base))).text();
  assert.ok(html.includes(`data-app-version="${APP_VERSION}"`));
  const sections=[...html.matchAll(/<article class="scene"[^>]*>([\s\S]*?)<\/article>/g)];assert.equal(sections.length,6);
  assert.ok(html.includes("6問は授業ノートの9/29から解けます"));
  for(const [,s]of sections)assert.ok(s.indexOf("<figure>")<s.indexOf('class="scene-explanation"'));
  await get(new URL("materials/august-2026/summary.css",base));
  await get(new URL("tiles/man1-66-90-l.png",base));
  const old=await(await get(new URL("materials/september-2026/0927.html",base))).text();
  assert.ok(old.includes("1種受けの為だけの危険牌＜安牌"));
  assert.ok(old.includes("役アリ愚形を黙っていた所に立直が来たら、猶の事ダマである。"));
}
console.log(JSON.stringify({version:APP_VERSION,lesson:lesson.date,questions:6,retiredRestorable:24,summaryScenes:6,verifiedImages:13,unrelatedPublicDataUnchanged:preserved,publicUrls},null,2));
