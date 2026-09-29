// Guarded shared-content update, using a captured public baseline. No personal records are read.
// node scripts/curate-september-29.mjs <baseline.json> [--apply] [--origin http://localhost:3000]
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { isDeepStrictEqual as equal } from "node:util";
import data from "../content/september-29.json" with { type: "json" };
import { SITE_ORIGIN } from "../app/lib/site-origin.mjs";
const lessonId = data.lessons[0].id;
const withoutTime = (row) => Object.fromEntries(Object.entries(row ?? {}).filter(([k]) => k !== "updatedAt"));
const same = (a,b) => equal(withoutTime(a), withoutTime(b));
export function planCuration(before, live, target=data) {
  const plans=[];
  const add=(group,key,old,wanted,path,method="PUT")=>{
    const now=live[group][key].find(r=>r.id===old.id);
    if(same(now,wanted))return;
    if(!same(now,old))throw new Error(`Shared edit conflict: ${old.id}`);
    plans.push({group,key,id:old.id,before:now,after:wanted,path,method});
  };
  const oldCards=before.notebook.cards.filter(c=>c.lessonId===lessonId);
  for(const c of target.cards)if(!oldCards.some(r=>r.id===c.id))throw new Error(`Unexpected new ID: ${c.id}`);
  for(const old of oldCards){
    const keep=target.cards.find(c=>c.id===old.id);
    const wanted=keep?{...old,kind:keep.kind,question:keep.question,answer:keep.answer}:{...old,deleted:true};
    add("notebook","cards",old,wanted,`/api/lessons/${lessonId}/cards/${old.id}`,keep?"PUT":"DELETE");
  }
  for(const old of before.catalog.items.filter(q=>q.lessonIds?.includes(lessonId))){
    if(old.lessonIds.length!==1)throw new Error(`Question shared across lessons: ${old.id}`);
    add("catalog","items",old,{...old,deleted:true,revision:old.revision+1},`/api/catalog/items/${old.id}`);
  }
  for(const old of before.notebook.resources.filter(r=>r.lessonId===lessonId)){
    const keep=target.resources.find(r=>r.id===old.id);
    if(!keep)throw new Error(`Do not remove source media: ${old.id}`);
    add("notebook","resources",old,{...old,label:keep.label,kind:keep.kind,url:keep.url},`/api/lessons/${lessonId}/resources/${old.id}`);
  }
  const keys=target.cards.map(c=>`${lessonId}:custom:${c.id}`);
  const orders=keys.map((cardKey,sortOrder)=>({lessonId,cardKey,sortOrder}));
  const oldOrders=before.catalog.orders.filter(o=>o.lessonId===lessonId);
  const current=live.catalog.orders.filter(o=>o.lessonId===lessonId);
  const desired=[...oldOrders.filter(o=>!keys.includes(o.cardKey)),...orders];
  const sorted=a=>[...a].sort((x,y)=>x.cardKey.localeCompare(y.cardKey));
  if(!equal(sorted(current),sorted(desired))){
    if(!equal(sorted(current),sorted(oldOrders)))throw new Error("Shared order edit conflict");
    plans.push({group:"catalog",key:"orders",id:"order",path:"/api/catalog/order",method:"PUT",after:{lessonId,keys}});
  }
  return plans;
}
async function run(){
  if(!process.argv[2])throw new Error("Captured public baseline required");
  const oi=process.argv.indexOf("--origin"),origin=oi<0?SITE_ORIGIN:process.argv[oi+1];
  if(origin!==SITE_ORIGIN&&!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin))throw new Error("Unexpected publication target");
  const before=JSON.parse(await readFile(process.argv[2],"utf8"));
  const get=async path=>{const r=await fetch(origin+path);if(!r.ok)throw Error(`GET ${path}: ${r.status}`);return r.json();};
  const snapshot=async()=>({notebook:await get("/api/notebook"),catalog:await get("/api/catalog")});
  let live=await snapshot();
  const plans=planCuration(before,live);
  console.log(JSON.stringify({origin,mode:process.argv.includes("--apply")?"apply":"dry-run",operations:plans.map(p=>({id:p.id,method:p.method}))}));
  if(!process.argv.includes("--apply"))return;
  for(const op of plans){
    // Check again before every write, including after interruption/retry.
    live=await snapshot();
    const fresh=planCuration(before,live).find(p=>p.id===op.id);
    if(!fresh)continue;
    const r=await fetch(origin+fresh.path,{method:fresh.method,headers:{"content-type":"application/json"},body:fresh.method==="DELETE"?undefined:JSON.stringify(fresh.after)});
    if(!r.ok)throw new Error(`Update failed: ${fresh.id} (${r.status})`);
    live=await snapshot();
    if(planCuration(before,live).some(p=>p.id===fresh.id))throw Error(`Readback mismatch: ${fresh.id}`);
    console.log(`Verified ${fresh.id}`);
  }
  if(planCuration(before,await snapshot()).length)throw Error("Curation incomplete");
  console.log("Curation verified: six cards; retired questions remain restorable.");
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)await run();
