import data from '../content/october-26.json' with {type:'json'};
const initialized=new WeakSet();
export async function ensureOctober26Lessons(db){
 if(initialized.has(db))return;
 const statements=[];
 for(const lesson of data.lessons){
  const missing=' WHERE NOT EXISTS (SELECT 1 FROM notebook_lessons WHERE lesson_id=?)';
  for(const c of data.cards.filter(c=>c.lessonId===lesson.id))statements.push(db.prepare('INSERT OR IGNORE INTO notebook_cards(card_id,lesson_id,sort_order,kind,question,answer,tile_question) SELECT ?,?,?,?,?,?,?'+missing).bind(c.id,c.lessonId,c.sortOrder,c.kind,c.question,c.answer,c.tileQuestion?JSON.stringify(c.tileQuestion):'',lesson.id));
  for(const r of data.resources.filter(r=>r.lessonId===lesson.id))statements.push(db.prepare('INSERT OR IGNORE INTO lesson_resources(resource_id,lesson_id,sort_order,kind,label,url) SELECT ?,?,?,?,?,?'+missing).bind(r.id,r.lessonId,r.sortOrder,r.kind,r.label,r.url,lesson.id));
  statements.push(db.prepare('INSERT OR IGNORE INTO notebook_lessons(lesson_id,lesson_date,teacher,title,video_url) VALUES (?,?,?,?,?)').bind(lesson.id,lesson.date,lesson.teacher,lesson.title,lesson.videoUrl));
 }
 // Share only completed initialization; never another request's in-flight D1 IO.
 await db.batch(statements);initialized.add(db);
}
export const october26CheckStatements=db=>data.items.map(q=>db.prepare('INSERT OR IGNORE INTO review_checks(id,data) VALUES (?,?)').bind(q.id,JSON.stringify(q)));
