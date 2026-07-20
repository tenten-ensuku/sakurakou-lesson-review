import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { linkLabel, tokenizeRichText } from "../app/lib/rich-text.mjs";

test("turns long URLs into compact automatic link tokens", () => {
  assert.deepEqual(
    tokenizeRichText("解説動画 https://www.youtube.com/watch?v=Gu7x_B0-3MU を確認"),
    [
      { type: "text", value: "解説動画 " },
      {
        type: "link",
        url: "https://www.youtube.com/watch?v=Gu7x_B0-3MU",
        label: "YouTubeで見る",
        kind: "youtube",
      },
      { type: "text", value: " を確認" },
    ],
  );
});

test("keeps trailing Japanese punctuation outside the URL", () => {
  assert.deepEqual(
    tokenizeRichText("資料：https://docs.google.com/document/d/example/edit。"),
    [
      { type: "text", value: "資料：" },
      {
        type: "link",
        url: "https://docs.google.com/document/d/example/edit",
        label: "Googleドキュメントを開く",
        kind: "external",
      },
      { type: "text", value: "。" },
    ],
  );
});

test("uses only a compact hostname for ordinary links", () => {
  assert.deepEqual(
    linkLabel("https://example.com/a/very/long/path?with=many&query=values"),
    { label: "example.comを開く", kind: "external" },
  );
  assert.deepEqual(tokenizeRichText("URLなし"), [{ type: "text", value: "URLなし" }]);
});

test("renders automatic links through the shared mahjong text component", () => {
  const page = readFileSync("app/page.tsx", "utf8");
  const css = readFileSync("app/globals.css", "utf8");
  assert.match(page, /tokenizeRichText\(text\)/);
  assert.match(page, /className=\{`embedded-link embedded-link--\$\{token\.kind\}`\}/);
  assert.match(page, /target="_blank"/);
  assert.match(css, /\.embedded-link--youtube/);
});
