import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  buildQuestionIndex,
  filterQuestionIndex,
  knowledgeStatus,
} from "../app/lib/study-index.mjs";

const lessons = [
  { id: "a", date: "8/18", teacher: "てんてん", title: "基本序列" },
  { id: "b", date: "7/21", teacher: "鳥", title: "牌譜検討" },
];
const cards = {
  a: [
    { id: 7, source: "base", kind: "section", question: "序章", answer: "" },
    {
      id: 11,
      source: "base",
      kind: "question",
      question: "孤立牌の比較は？",
      answer: "3mが強い",
    },
    {
      id: 13,
      source: "custom",
      kind: "question",
      question: "消した問題",
      answer: "",
      deleted: true,
    },
    {
      id: 99,
      source: "custom",
      kind: "question",
      question: "残す牌は？",
      answer: "白",
    },
  ],
};
const checks = [
  {
    id: "c1",
    theoryId: "t1",
    lessonIds: ["a", "b"],
    type: "cloze",
    question: "強い牌は［ ］",
    explanation: "中央の牌",
  },
  {
    id: "c2",
    theoryId: "deleted",
    lessonIds: ["a"],
    type: "choice",
    question: "非表示知識",
    explanation: "",
  },
];
const theories = [{ id: "t1" }, { id: "deleted", deleted: true }];

test("search index excludes notes/deletions, keeps IDs and numbers only visible questions", () => {
  const index = buildQuestionIndex(lessons, cards, checks, theories);
  assert.deepEqual(
    index.map((q) => q.key),
    ["a:base:11", "a:custom:99", "check:c1"],
  );
  assert.deepEqual(
    index.map((q) => q.number),
    [1, 2, 0],
  );
  assert.equal(index.filter((q) => q.key === "check:c1").length, 1);
  assert.equal(filterQuestionIndex(index, "", "b")[0].key, "check:c1");
});
test("search covers questions, answers, lesson metadata and full-width query normalization", () => {
  const index = buildQuestionIndex(lessons, cards, checks, theories);
  assert.equal(filterQuestionIndex(index, "３ｍ")[0].key, "a:base:11");
  assert.equal(filterQuestionIndex(index, "てんてん 白")[0].key, "a:custom:99");
  assert.equal(filterQuestionIndex(index, "8/18").length, 3);
  assert.equal(filterQuestionIndex(index, "鳥")[0].key, "check:c1");
  assert.equal(filterQuestionIndex(index, "不存在").length, 0);
});
test("knowledge status prioritizes review and does not turn legacy stars into mastery", () => {
  assert.equal(knowledgeStatus().label, "未確認");
  assert.equal(knowledgeStatus({ stars: 3 }).label, "未確認");
  assert.equal(knowledgeStatus({ collected: true }).label, "確認済み");
  assert.equal(
    knowledgeStatus({ collected: true, needsReview: true }).label,
    "要復習",
  );
});
test("main learner UI has no growth, reward, star or rank controls", async () => {
  const source = await readFile(
    new URL("../app/page.tsx", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(
    source,
    /setPromotion|setTab\("buddy"\)|<Stars|<Hero|state\.stars|REWARDS|今回のランク/,
  );
  assert.match(source, /授業・問題を検索/);
  assert.match(source, /この問題から復習/);
  assert.match(source, /解き直す問題を検索/);
});
