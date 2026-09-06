import { isCheckAvailable } from "./check-availability.mjs";
// Searchable display index. Stable learning IDs are never replaced by Q numbers.
export function buildQuestionIndex(lessons, cardsByLesson, checks, theories) {
  const entries = [];
  for (const lesson of lessons.filter((l) => !l.deleted)) {
    let number = 0;
    for (const card of cardsByLesson[lesson.id] ?? []) {
      if (card.deleted || card.kind !== "question") continue;
      entries.push({
        key: `${lesson.id}:${card.source}:${card.id}`,
        lesson,
        lessonIds: [lesson.id],
        number: ++number,
        type: "flash",
        label: "カード",
        question: card.question,
        answer: card.answer,
      });
    }
  }
  const seen = new Set();
  for (const check of checks) {
    if (
      check.deleted ||
      seen.has(check.id) ||
      !isCheckAvailable(check, theories)
    )
      continue;
    const related = lessons.filter(
      (l) => !l.deleted && check.lessonIds.includes(l.id),
    );
    if (!related.length) continue;
    seen.add(check.id);
    entries.push({
      key: "check:" + check.id,
      lesson: related[0],
      lessonIds: related.map((l) => l.id),
      lessonSearch: related
        .map((l) => [l.date, l.teacher, l.title].join(" "))
        .join(" "),
      number: 0,
      type: "check",
      label: check.type === "cloze" ? "穴埋め" : "四択",
      question: check.question,
      answer: check.explanation,
      theoryId: check.theoryId,
    });
  }
  return entries;
}
const normalize = (s) => s.normalize("NFKC").toLocaleLowerCase("ja");
export function filterQuestionIndex(entries, query = "", lessonId = "") {
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
  return entries.filter((q) => {
    if (lessonId && !q.lessonIds.includes(lessonId)) return false;
    const text = normalize(
      [
        q.question,
        q.answer,
        q.lesson.date,
        q.lesson.teacher,
        q.lesson.title,
        q.lessonSearch ?? "",
      ].join(" "),
    );
    return terms.every((term) => text.includes(term));
  });
}
export function knowledgeStatus(progress) {
  if (progress?.needsReview) return { kind: "review", label: "要復習" };
  if (progress?.collected) return { kind: "confirmed", label: "確認済み" };
  return { kind: "unseen", label: "未確認" };
}
