import data from "../content/september-30.json" with { type: "json" };
const initialized = new WeakMap();
export async function ensureSeptember30Lessons(db) {
  if (!initialized.has(db)) {
    const statements = [];
    for (const lesson of data.lessons) {
      // Lesson receipt is last in the transaction. Never replace later public edits.
      const missing = " WHERE NOT EXISTS (SELECT 1 FROM notebook_lessons WHERE lesson_id=?)";
      for (const c of data.cards.filter((c) => c.lessonId === lesson.id)) statements.push(db.prepare("INSERT OR IGNORE INTO notebook_cards(card_id,lesson_id,sort_order,kind,question,answer,tile_question) SELECT ?,?,?,?,?,?,?" + missing).bind(c.id, c.lessonId, c.sortOrder, c.kind, c.question, c.answer, c.tileQuestion ? JSON.stringify(c.tileQuestion) : "", lesson.id));
      for (const r of data.resources.filter((r) => r.lessonId === lesson.id)) statements.push(db.prepare("INSERT OR IGNORE INTO lesson_resources(resource_id,lesson_id,sort_order,kind,label,url) SELECT ?,?,?,?,?,?" + missing).bind(r.id, r.lessonId, r.sortOrder, r.kind, r.label, r.url, lesson.id));
      statements.push(db.prepare("INSERT OR IGNORE INTO notebook_lessons(lesson_id,lesson_date,teacher,title,video_url) VALUES (?,?,?,?,?)").bind(lesson.id, lesson.date, lesson.teacher, lesson.title, lesson.videoUrl));
    }
    const pending = db.batch(statements).catch((error) => { initialized.delete(db); throw error; });
    initialized.set(db, pending);
  }
  await initialized.get(db);
}
