import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { APP_VERSION } from "../app/lib/lesson.mjs";
import { SITE_ORIGIN, resolveSiteUrl } from "../app/lib/site-origin.mjs";
import { tokenizeMahjongText } from "../app/lib/mahjong-tiles.mjs";
import { lesson, summary, references } from "../content/september-2026-source.mjs";
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const rich = (text) => tokenizeMahjongText(text).map((t) => t.type === "text" ? esc(t.value) : `<span class="tiles">${t.digits.map((n) => `<img src="../../tiles/${({ m: "man", p: "pin", s: "sou", ji: "ji" })[t.suit]}${n}-66-90-l.png" alt="${esc(t.source ?? "麻雀牌")}" width="66" height="90">`).join("")}</span>`).join("");
export function renderSeptemberMaterial(provenance, content = { lesson, summary, references }) {
  const { lesson, summary, references } = content;
  const sections = summary.map((s, index) => {
    const im = { ...provenance.images[s.scene], url: resolveSiteUrl(provenance.images[s.scene]?.url) };
    if (!im.url?.startsWith(SITE_ORIGIN + "/api/images/")) throw new Error("Unreviewed image");
    const time = `${Math.floor(im.at / 60)}:${String(im.at % 60).padStart(2, "0")}`;
    const note = s.teachingNote ? `<p class="teaching-note">${esc(s.teachingNote.attribution)}：<br><strong>「${esc(s.teachingNote.quote)}」</strong></p>` : "";
    return `<section aria-labelledby="point-${index + 1}"><article class="scene" data-scene="${s.scene}"><figure><a class="scene-image" href="${esc(im.url)}" target="_blank" rel="noreferrer" aria-label="${esc(im.caption)}を拡大（別タブで開く）"><img src="${esc(im.url)}" alt="${esc(im.caption)}" width="${im.width}" height="${im.height}" loading="${index ? "lazy" : "eager"}"></a><figcaption>${esc(im.caption)}<span class="image-hint">画像を押すと拡大</span></figcaption></figure><div class="scene-explanation"><h3 id="point-${index + 1}">${index + 1}. ${esc(s.title)}</h3><p>${rich(s.text)}</p>${note}<a class="source" href="${esc(lesson.videoUrl)}&amp;t=${im.at}s" target="_blank" rel="noreferrer">${time}の場面をYouTubeで見る</a></div></article></section>`;
  }).join("\n");
  return `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>${esc(lesson.date)} ${esc(lesson.teacher)}先生｜${esc(lesson.title)}</title><link rel="stylesheet" href="../august-2026/summary.css?v=${APP_VERSION}"></head>
<body><main data-app-version="${APP_VERSION}"><header><a class="back" href="https://sakurakou-lesson-review.pages.dev/">授業ノートへ</a><p>${esc(lesson.date)}　${esc(lesson.teacher)}先生</p><h1>${esc(lesson.title)}</h1><a class="video" href="${esc(lesson.videoUrl)}" target="_blank" rel="noreferrer">YouTubeで授業を見る</a></header><h2>場面ごとの振り返り</h2>
${sections}
<h2>照合した資料</h2><nav>${Object.values(references).map((r) => `<a class="source" href="${esc(r.url)}" target="_blank" rel="noreferrer">${esc(r.title)}</a>`).join("")}</nav><footer><p>講義の条件を保って整理した復習用要約です。微差の場面は唯一解とせず、判断理由と適用条件を確認してください。30問は授業ノートの${esc(lesson.date)}から解けます。</p><a class="back" href="https://sakurakou-lesson-review.pages.dev/">授業ノートへ戻る</a></footer></main></body></html>\n`;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const p = JSON.parse(await readFile(resolve("docs/september-2026-provenance.json"), "utf8"));
  await writeFile(resolve("public/materials/september-2026/0927.html"), renderSeptemberMaterial(p));
}
