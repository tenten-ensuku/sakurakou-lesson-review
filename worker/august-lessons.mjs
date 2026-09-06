import august from "../content/august-2026.json" with { type: "json" };

const initialized = new WeakMap();
export async function ensureAugustLessons(db) {
  if (!initialized.has(db)) {
    const statements = [];
    for (const lesson of august.lessons) {
      // The lesson row is the import receipt. Insert it LAST in the transaction.
      // This also preserves resource deletions, which use hard deletion in the legacy API.
      const missing = " WHERE NOT EXISTS (SELECT 1 FROM notebook_lessons WHERE lesson_id=?)";
      for (const c of august.cards.filter((c) => c.lessonId === lesson.id)) {
        statements.push(db.prepare(
          "INSERT OR IGNORE INTO notebook_cards(card_id,lesson_id,sort_order,kind,question,answer) SELECT ?,?,?,?,?,?" + missing,
        ).bind(c.id, c.lessonId, c.sortOrder, c.kind, c.question, c.answer, lesson.id));
      }
      for (const r of august.resources.filter((r) => r.lessonId === lesson.id)) {
        statements.push(db.prepare(
          "INSERT OR IGNORE INTO lesson_resources(resource_id,lesson_id,sort_order,kind,label,url) SELECT ?,?,?,?,?,?" + missing,
        ).bind(r.id, r.lessonId, r.sortOrder, r.kind, r.label, r.url, lesson.id));
      }
      statements.push(db.prepare(
        "INSERT OR IGNORE INTO notebook_lessons(lesson_id,lesson_date,teacher,title,video_url) VALUES (?,?,?,?,?)",
      ).bind(lesson.id, lesson.date, lesson.teacher, lesson.title, lesson.videoUrl));
    }
    const pending = db.batch(statements).catch((error) => {
      initialized.delete(db);
      throw error;
    });
    initialized.set(db, pending);
  }
  await initialized.get(db);
}

export async function seedAugustChecks(db) {
  // Check deletion is logical: never overwrite an existing row, including tombstones.
  await db.batch(august.items.map((q) => db.prepare(
    "INSERT OR IGNORE INTO review_checks(id,data) VALUES (?,?)",
  ).bind(q.id, JSON.stringify(q))));
}
