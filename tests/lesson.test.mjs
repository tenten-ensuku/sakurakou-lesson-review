import test from "node:test";
import assert from "node:assert/strict";
import { APP_VERSION, BASE_CARDS, LESSON_TITLE, VIDEO_URL, getRank, mergeLessonCards, mergeOverrides, questionNumber, sortLessons } from "../app/lib/lesson.mjs";

test("lesson metadata and version are synchronized", () => {
  assert.equal(APP_VERSION, 14);
  assert.equal(LESSON_TITLE, "7/21　てんてん先生　蒼嵐戦　牌譜検討");
  assert.equal(VIDEO_URL, "https://youtu.be/zhg7AH9aWgk");
});

test("the source is renumbered to 23 consecutive questions with four information cards", () => {
  const questions = BASE_CARDS.filter((card) => card.kind === "question");
  assert.equal(questions.length, 23);
  assert.equal(BASE_CARDS.length, 27);
  assert.deepEqual(questions.map((card) => questionNumber(BASE_CARDS, card.id)), Array.from({length:23},(_,i)=>i+1));
  assert.equal(BASE_CARDS.filter((card) => card.kind !== "question").length, 4);
});

test("deletion closes the visible question-number gap and restoration is reversible", () => {
  const merged = mergeOverrides([{lessonId:"sakurakou-2026-07-21",id:2,deleted:true}]);
  const third = merged.find((card) => card.id === 3);
  assert.equal(questionNumber(merged, third.id), 2);
  assert.equal(mergeOverrides([]).length, 27);
});

test("rank boundaries match the drill convention", () => {
  assert.equal(getRank(49), "D"); assert.equal(getRank(50), "C");
  assert.equal(getRank(65), "B"); assert.equal(getRank(80), "A"); assert.equal(getRank(90), "S");
});

test("custom lesson cards append to the editable notebook and dates sort newest first", () => {
  const cards = mergeLessonCards(BASE_CARDS, [], [{id:"card-custom",lessonId:"sakurakou-2026-07-21",sortOrder:1,kind:"question",question:"自作問題",answer:"自作解説"}]);
  assert.equal(cards.at(-1).question, "自作問題");
  assert.deepEqual(sortLessons([{date:"7/2",title:"古い"},{date:"7/22",title:"新しい"}]).map((item) => item.title), ["新しい","古い"]);
});
