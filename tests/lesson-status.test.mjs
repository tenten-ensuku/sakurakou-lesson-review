import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { progressFrom, mergeEvents } from "../app/lib/progress.mjs";
import { buildQuestionIndex, lessonStudyStatus } from "../app/lib/study-index.mjs";

const event = (id, data) => ({ id, at: `2026-09-08T00:00:0${id}.000Z`, ...data });
const session = (id, data = {}) => ({ id, slot: "flash:lesson", mode: "flash", lessonId: "lesson", keys: [], picks: {}, ratings: {}, ...data });
const entries = [
  { key: "lesson:custom:a", lessonIds: ["lesson"] },
  { key: "lesson:custom:b", lessonIds: ["lesson"] },
  { key: "check:c", lessonIds: ["lesson", "other"] },
];

test("unanswered is distinct from wrong answers and manual review markers", () => {
  const state = progressFrom([
    event(1, { type: "known", target: "lesson:custom:a" }),
    event(2, { type: "attempt", itemId: "c", correct: false }),
    event(3, { type: "review", target: "lesson:custom:b", active: true }),
  ]);
  assert.deepEqual(lessonStudyStatus(entries, "lesson", state), { total: 3, unanswered: 1, review: 2 });
  assert.deepEqual(lessonStudyStatus(entries, "other", state), { total: 1, unanswered: 0, review: 1 });
});

test("old checkpoints retain flashcard again ratings across restart, reload and resend", () => {
  const events = [
    event(1, { type: "session", session: session("old", { ratings: { "lesson:custom:a": "again" } }) }),
    event(2, { type: "session", session: session("new") }),
  ];
  const state = progressFrom(JSON.parse(JSON.stringify(mergeEvents(events, events))));
  assert.equal(state.sessions["flash:lesson"].id, "new");
  assert.deepEqual(state.answeredIds, ["lesson:custom:a"]);
  assert.equal(lessonStudyStatus(entries, "lesson", state).unanswered, 2);
  assert.match(readFileSync("app/lib/use-learner.ts", "utf8"), /v\.session\?\.id !== data\.session\?\.id/);
});

test("old choice checkpoints accept choice zero; viewing, skipping and review removal are not answers", () => {
  const state = progressFrom([
    event(1, { type: "session", session: session("check", { picks: { c: 0 }, revealed: true, index: 2, completed: true }) }),
    event(2, { type: "review", target: "lesson:custom:b", active: false }),
  ]);
  assert.deepEqual(state.answeredIds, ["check:c"]);
  assert.equal(lessonStudyStatus(entries, "lesson", state).unanswered, 2);
});

test("notes, deleted questions, unavailable checks and stale review IDs do not inflate counts", () => {
  const lessons = [{ id: "lesson" }];
  const cards = { lesson: [
    { id: "a", source: "custom", kind: "question" },
    { id: "b", source: "custom", kind: "question", deleted: true },
    { id: "note", source: "custom", kind: "note" },
    { id: "heading", source: "custom", kind: "section" },
  ] };
  const checks = [{ id: "gone", lessonIds: ["lesson"], deleted: true }];
  const index = buildQuestionIndex(lessons, cards, checks, []);
  const state = { answeredIds: ["lesson:custom:b"], reviewIds: ["lesson:custom:b", "lesson:custom:note", "check:gone"] };
  assert.deepEqual(lessonStudyStatus(index, "lesson", state), { total: 1, unanswered: 1, review: 0 });
  cards.lesson[1].deleted = false;
  assert.deepEqual(lessonStudyStatus(buildQuestionIndex(lessons, cards, checks, []), "lesson", state), { total: 2, unanswered: 1, review: 1 });
});

test("reorder preserves counts, added questions are unanswered and missing old state is safe", () => {
  const state = { answeredIds: ["lesson:custom:a", "check:c"], reviewIds: ["check:c", "check:c"] };
  assert.deepEqual(lessonStudyStatus(entries.toReversed(), "lesson", state), { total: 3, unanswered: 1, review: 1 });
  assert.deepEqual(lessonStudyStatus([...entries, { key: "new", lessonIds: ["lesson"] }], "lesson", state), { total: 4, unanswered: 2, review: 1 });
  assert.deepEqual(lessonStudyStatus(entries, "lesson", {}), { total: 3, unanswered: 3, review: 0 });
  assert.deepEqual(lessonStudyStatus(entries, "materials-only", state), { total: 0, unanswered: 0, review: 0 });
});

test("lesson status is visible without a duplicate hero or encyclopedia; resume and editors remain", () => {
  const page = readFileSync("app/page.tsx", "utf8");
  const entry = readFileSync("app/LessonEntry.tsx", "utf8");
  assert.doesNotMatch(page, /continue-section|latestSession|primaryLesson|encyclopedia|図鑑/);
  assert.match(page, /lessonStudyStatus\(questionIndex, l.id, state\)/);
  assert.match(page, /途中から再開する/);
  assert.match(page, /知識・確認問題を編集/);
  assert.match(entry, /未回答 <strong>\{unansweredCount\}/);
  assert.match(entry, /解き直し <strong>\{reviewCount\}/);
  assert.match(entry, /questionCount > 0 && <div className="lesson-learning-status"/);
});
