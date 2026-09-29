import test from "node:test";
import assert from "node:assert/strict";
import { planCuration } from "../scripts/curate-september-29.mjs";
import data from "../content/september-29.json" with { type: "json" };
const lessonId=data.lessons[0].id;
function fixture(){
  return {notebook:{cards:[...data.cards.map(c=>({...c,question:"before "+c.question,deleted:false})),{id:"retired",lessonId,question:"old",answer:"old",deleted:false}],resources:data.resources.map(r=>({...r}))},catalog:{items:[{id:"old-check",lessonIds:[lessonId],question:"old",deleted:false,revision:1}],orders:[]}};
}
test("curation updates retained IDs and retires rather than removes questions",()=>{
  const before=fixture(),plans=planCuration(before,before);
  assert.equal(plans.filter(p=>p.key==="cards"&&p.method==="PUT").length,7);
  const retired=plans.find(p=>p.id==="retired");
  assert.equal(retired.after.deleted,true);assert.equal(retired.after.question,"old");
  const check=plans.find(p=>p.id==="old-check");
  assert.equal(check.after.deleted,true);assert.equal(check.after.revision,2);
  assert.ok(plans.every(p=>p.key!=="resources"));
});
test("curation retries are idempotent and never revive retired questions",()=>{
  const before=fixture(),live=structuredClone(before);
  for(const p of planCuration(before,live)){
    if(p.key==="orders")live.catalog.orders=p.after.keys.map((cardKey,sortOrder)=>({lessonId,cardKey,sortOrder}));
    else live[p.group][p.key]=live[p.group][p.key].map(r=>r.id===p.id?p.after:r);
  }
  assert.deepEqual(planCuration(before,live),[]);
  assert.equal(live.notebook.cards.length,before.notebook.cards.length);
  assert.equal(live.catalog.items.length,before.catalog.items.length);
});
test("curation refuses concurrent public edits and cross-lesson questions",()=>{
  const before=fixture(),live=structuredClone(before);
  live.notebook.cards[1].answer="student edit";
  assert.throws(()=>planCuration(before,live),/Shared edit conflict/);
  const shared=fixture();shared.catalog.items[0].lessonIds.push("another-lesson");
  assert.throws(()=>planCuration(shared,shared),/shared across lessons/);
  const reordered=structuredClone(before);reordered.catalog.orders=[{lessonId,cardKey:"student",sortOrder:0}];
  assert.throws(()=>planCuration(before,reordered),/order edit conflict/);
});
