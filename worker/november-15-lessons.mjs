import data from '../content/november-15.json' with {type:'json'};
const initialized=new WeakSet();
export async function ensureNovember15Lessons(db){
 if(initialized.has(db))return;
 const {id,date,teacher,title,videoUrl}=data.lessons[0];
 const missing=' WHERE NOT EXISTS (SELECT 1 FROM notebook_lessons WHERE lesson_id=?)';
 // Seed once in one batch; do not restore a removed resource or overwrite an edit.
 await db.batch([
  ...data.cards.map(c=>db.prepare('INSERT OR IGNORE INTO notebook_cards(card_id,lesson_id,sort_order,kind,question,answer,tile_question) SELECT ?,?,?,?,?,?,?'+missing).bind(c.id,id,c.sortOrder,c.kind,c.question,c.answer,c.tileQuestion?JSON.stringify(c.tileQuestion):'',id)),
  ...data.resources.map(r=>db.prepare('INSERT OR IGNORE INTO lesson_resources(resource_id,lesson_id,sort_order,kind,label,url) SELECT ?,?,?,?,?,?'+missing).bind(r.id,id,r.sortOrder,r.kind,r.label,r.url,id)),
  db.prepare('INSERT OR IGNORE INTO notebook_lessons(lesson_id,lesson_date,teacher,title,video_url) VALUES (?,?,?,?,?)').bind(id,date,teacher,title,videoUrl),
 ]);initialized.add(db);
}
export const november15CheckStatements=db=>data.items.map(q=>db.prepare('INSERT OR IGNORE INTO review_checks(id,data) VALUES (?,?)').bind(q.id,JSON.stringify(q)));
