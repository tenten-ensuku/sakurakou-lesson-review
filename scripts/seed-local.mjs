// Read production teaching content into a LOCAL Miniflare DB only. Never touches production.
import {DatabaseSync} from "node:sqlite";
import {readdir} from "node:fs/promises";
import {resolve,join} from "node:path";
import {FLASHCARD_OVERRIDES_SCHEMA_SQL,NOTEBOOK_SCHEMA_SQL} from "../db/schema.mjs";
const dir=resolve(".wrangler/state/v3/d1");
async function walk(d){return(await Promise.all((await readdir(d,{withFileTypes:true})).map(x=>x.isDirectory()?walk(join(d,x.name)):[join(d,x.name)]))).flat();}
const files=(await walk(dir)).filter(x=>x.endsWith(".sqlite")&&!x.endsWith("metadata.sqlite"));
if(files.length!==1)throw new Error("Expected one LOCAL Miniflare D1 database");
const db=new DatabaseSync(files[0]);
db.exec(FLASHCARD_OVERRIDES_SCHEMA_SQL);for(const s of NOTEBOOK_SCHEMA_SQL)db.exec(s);
const r=await fetch("https://sakurakou-lesson-review.kobotenmitsu.chatgpt.site/api/notebook");
if(!r.ok)throw new Error("Production content read failed");const n=await r.json();
for(const t of ["learning_profiles","learning_events","teacher_shares"]){/* These private tables are never read from production or seeded here. */void t;}
db.exec("BEGIN");
try{
 for(const l of n.lessons)db.prepare("INSERT OR IGNORE INTO notebook_lessons(lesson_id,lesson_date,teacher,title,video_url,deleted) VALUES (?,?,?,?,?,?)").run(l.id,l.date,l.teacher,l.title,l.videoUrl,l.deleted?1:0);
 for(const l of n.metadata)db.prepare("INSERT OR IGNORE INTO lesson_metadata_overrides(lesson_id,lesson_date,teacher,title,video_url) VALUES (?,?,?,?,?)").run(l.lessonId??l.id,l.date,l.teacher,l.title,l.videoUrl);
 for(const c of n.cards)db.prepare("INSERT OR IGNORE INTO notebook_cards(card_id,lesson_id,sort_order,kind,question,answer,deleted) VALUES (?,?,?,?,?,?,?)").run(c.id,c.lessonId,c.sortOrder,c.kind,c.question,c.answer,c.deleted?1:0);
 for(const c of n.overrides)db.prepare("INSERT OR IGNORE INTO lesson_card_overrides(lesson_id,card_id,question,answer,deleted) VALUES (?,?,?,?,?)").run(c.lessonId,c.id,c.question,c.answer,c.deleted?1:0);
 for(const r of n.resources)db.prepare("INSERT OR IGNORE INTO lesson_resources(resource_id,lesson_id,sort_order,kind,label,url) VALUES (?,?,?,?,?,?)").run(r.id,r.lessonId,r.sortOrder,r.kind,r.label,r.url);
 db.exec("COMMIT");
}catch(e){db.exec("ROLLBACK");throw e;}
db.close();console.log("Seeded existing public lessons into local D1 only.");
