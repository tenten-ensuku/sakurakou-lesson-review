import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  loadContentSnapshot,
  readContentSnapshot,
  saveContentSnapshot,
  SNAPSHOT_KEY,
} from "../app/lib/content-loading.mjs";
import { materialDetails } from "../app/lib/materials.mjs";
const snapshot = () => ({
  notebook: {
    overrides: [],
    metadata: [],
    lessons: [{ id: "new" }, { id: "old" }],
    cards: [],
    resources: [],
  },
  catalog: { theories: [], items: [], orders: [] },
});
const storage = () => {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
};
test("only a complete notebook + catalog is published, regardless of response order", async () => {
  for (const first of ["/api/notebook", "/api/catalog"]) {
    const data = snapshot(),
      pending = {};
    let published = false;
    const result = loadContentSnapshot(
      (path) =>
        new Promise((resolve) => {
          pending[path] = resolve;
        }),
    ).then((value) => {
      published = true;
      return value;
    });
    pending[first](first === "/api/notebook" ? data.notebook : data.catalog);
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(published, false);
    const other = first === "/api/notebook" ? "/api/catalog" : "/api/notebook";
    pending[other](other === "/api/notebook" ? data.notebook : data.catalog);
    assert.deepEqual(await result, data);
  }
});
test("cache is atomic and legacy cache requires both complete parts", () => {
  const s = storage(),
    data = snapshot();
  assert.equal(readContentSnapshot(s), null);
  s.setItem("ensuku-notebook-content-v1", JSON.stringify(data.notebook));
  assert.equal(readContentSnapshot(s), null);
  s.setItem("ensuku-catalog-v1", JSON.stringify(data.catalog));
  assert.deepEqual(readContentSnapshot(s), data);
  assert.equal(saveContentSnapshot(s, data), true);
  s.setItem("ensuku-notebook-content-v1", "broken");
  assert.deepEqual(readContentSnapshot(s), data);
  assert.equal(saveContentSnapshot(s, { notebook: data.notebook }), false);
  assert.deepEqual(JSON.parse(s.getItem(SNAPSHOT_KEY)), data);
});
test("failed or timed out refresh keeps cached lessons; unavailable storage never throws", async () => {
  const s = storage(),
    data = snapshot();
  saveContentSnapshot(s, data);
  await assert.rejects(
    loadContentSnapshot(async () => {
      throw new Error("offline");
    }),
  );
  await assert.rejects(
    loadContentSnapshot(() => new Promise(() => {}), 5),
    /タイムアウト/,
  );
  await assert.rejects(
    loadContentSnapshot(async () => ({})),
    /教材データ/,
  );
  assert.deepEqual(readContentSnapshot(s), data);
  const denied = {
    getItem() {
      throw new Error("denied");
    },
    setItem() {
      throw new Error("quota");
    },
  };
  assert.equal(readContentSnapshot(denied), null);
  assert.equal(saveContentSnapshot(denied, data), false);
  assert.deepEqual(
    data.notebook.lessons.map((l) => l.id),
    ["new", "old"],
  );
});
test("initial render is gated; cached content does not disable the study entry during refresh", () => {
  const page = readFileSync("app/page.tsx", "utf8");
  assert.match(page, /if \(!booted \|\| !contentReady\)/);
  assert.match(page, /readContentSnapshot\(localStorage\)/);
  assert.doesNotMatch(page, /disabled=\{!learner.ready \|\| loading\}/);
});
test("resources display actual names, safe service labels and clear actions without changing raw URLs", () => {
  const resource = {
    label: "基本序列",
    kind: "link",
    url: "https://docs.google.com/document/d/abc/edit?usp=sharing",
  };
  const original = JSON.stringify(resource);
  assert.deepEqual(materialDetails(resource), {
    title: "基本序列",
    service: "Googleドキュメント",
    action: "読む",
    image: false,
  });
  assert.equal(JSON.stringify(resource), original);
  assert.equal(
    materialDetails({ url: "https://youtu.be/test" }).action,
    "動画を見る",
  );
  assert.equal(
    materialDetails({ url: "https://example.com/board.png", kind: "image" })
      .action,
    "画像を見る",
  );
  assert.equal(
    materialDetails({ url: "https://www.example.com/very/long/path" }).service,
    "example.com",
  );
  assert.equal(materialDetails({ url: "javascript:alert(1)" }), null);
  const component = readFileSync("app/LessonMaterials.tsx", "utf8");
  assert.match(component, /if \(!visible.length\) return null/);
  assert.match(component, /visible.slice\(0, 2\)/);
  assert.match(component, /visible.length > 2/);
  assert.match(component, /href=\{resource.url\}/);
});
