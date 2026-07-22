import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pagePath = new URL("../app/page.tsx", import.meta.url);

test("session cards can edit questions before reveal and explanations after reveal", async () => {
  const source = await readFile(pagePath,"utf8");
  assert.match(source,/revealed \? "answer" : "question"/);
  assert.match(source,/revealed \? "解説を編集" : "問題を編集"/);
  assert.match(source,/問題文<textarea autoFocus/);
  assert.match(source,/解説文<textarea autoFocus/);
});

test("inline saves reuse the shared card API and keep the session card in place", async () => {
  const source = await readFile(pagePath,"utf8");
  assert.match(source,/api\/admin\/cards\/\$\{DEFAULT_LESSON\.id\}\/\$\{current\.id\}/);
  assert.match(source,/api\/lessons\/\$\{sessionLesson\.id\}\/cards\/\$\{current\.id\}/);
  assert.match(source,/position === index \? \{\.\.\.card,\.\.\.draft\} : card/);
  assert.match(source,/disabled=\{!revealed \|\| Boolean\(inlineEdit\)\}/);
});
