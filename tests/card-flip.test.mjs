import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pagePath = new URL("../app/page.tsx", import.meta.url);

test("question cards show one face at a time and can return from the answer", async () => {
  const source = await readFile(pagePath,"utf8");
  assert.match(source,/card-face--answer/);
  assert.match(source,/card-face--question/);
  assert.match(source,/問題を見る/);
  assert.match(source,/setRevealed\(\(value\)=>!value\)/);
});

test("overlapping English helper labels are removed from question cards", async () => {
  const source = await readFile(pagePath,"utf8");
  assert.doesNotMatch(source,/>QUESTION</);
  assert.doesNotMatch(source,/THINK & REVEAL/);
});
