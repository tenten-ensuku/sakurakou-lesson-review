// Present existing summary sentences alongside the reviewed scene they describe.
// Does not modify shared questions, answers, lesson resources, or the database.
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { APP_VERSION } from "../app/lib/lesson.mjs";
import { tokenizeMahjongText } from "../app/lib/mahjong-tiles.mjs";
import scenePlan from "../content/august-material-scenes.json" with { type: "json" };

const origin = "https://sakurakou-lesson-review.kobotenmitsu.chatgpt.site";
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
const stamp = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
export const summarySentences = (s) => s.match(/[^。]+。?/gu) ?? [];
export const readSummary = (data, lessonId) => {
  const note = data.cards.find((c) => c.lessonId === lessonId && c.kind === "note");
  if (!note) throw new Error("Summary card missing");
  return note.answer.split("\n\n").map((block) => {
    const [title, text, url] = block.split("\n");
    return { title, text, url };
  });
};
const rich = (text) => tokenizeMahjongText(text).map((t) => t.type === "text" ? esc(t.value) :
  `<span class="tiles">${t.digits.map((n) => `<img src="../../tiles/${({m:"man",p:"pin",s:"sou",ji:"ji"})[t.suit]}${n}-66-90-l.png" alt="${esc(t.source ?? "麻雀牌")}" width="66" height="90">`).join("")}</span>`).join("");

export function renderMaterial(lesson, data, provenance) {
  const day = lesson.id.match(/lesson-2026(\d{4})-/)?.[1];
  const plan = scenePlan[day], summaries = readSummary(data, lesson.id);
  if (!plan || plan.length !== summaries.length) throw new Error("Summary plan mismatch");
  const used = new Set();
  let imageCount = 0;
  const sections = plan.map((group, index) => {
    const summary = summaries[group.summary], sentences = summarySentences(summary.text);
    const paragraph = (numbers) => {
      const text = numbers.map((n) => {
        if (!sentences[n]) throw new Error(`Missing sentence: ${day}/${group.summary}/${n}`);
        const key = `${group.summary}:${n}`;
        if (used.has(key)) throw new Error("Repeated summary sentence: " + key);
        used.add(key);
        return sentences[n];
      }).join("");
      return `<p>${rich(text)}</p>`;
    };
    const heading = `<h3 id="point-${group.summary + 1}">${index + 1}. ${esc(summary.title)}</h3>`;
    const scenes = group.scenes.map((scene, i) => {
      const image = provenance.images[scene.file];
      if (!image || scene.file.includes("-full")) throw new Error("Unreviewed scene: " + scene.file);
      const url = new URL(image.url);
      if (url.origin !== origin || !url.pathname.startsWith("/api/images/")) throw new Error("Invalid image origin");
      const loading = imageCount++ === 0 ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"';
      return `<article class="scene" data-scene-file="${esc(scene.file)}"><figure><a class="scene-image" href="${esc(image.url)}" target="_blank" rel="noreferrer" aria-label="${esc(scene.caption)}を拡大（別タブで開く）"><img src="${esc(image.url)}" alt="${esc(scene.caption)}" ${loading}></a><figcaption>${esc(scene.caption)}<span class="image-hint">画像を押すと拡大</span></figcaption></figure><div class="scene-explanation">${i === 0 ? heading : ""}${paragraph(scene.sentences)}<a class="source" href="${esc(lesson.videoUrl)}&amp;t=${Math.floor(scene.at)}s" target="_blank" rel="noreferrer">${stamp(scene.at)}の場面をYouTubeで見る</a></div></article>`;
    }).join("\n");
    const supplement = group.supplement?.length ? `<div class="summary-note">${scenes ? '<h4>補足</h4>' : heading}${paragraph(group.supplement)}<a class="source" href="${esc(summary.url)}" target="_blank" rel="noreferrer">このポイントをYouTubeで確認</a></div>` : "";
    return `<section aria-labelledby="point-${group.summary + 1}" data-summary-index="${group.summary}">${scenes}${supplement}</section>`;
  }).join("\n");
  const totalSentences = summaries.reduce((n,s) => n + summarySentences(s.text).length, 0);
  if (used.size !== totalSentences) throw new Error("Some summary sentences were dropped");
  const refs = data.resources.filter((r) => r.lessonId === lesson.id && r.url.startsWith("https://docs.google.com/"));
  return `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>${esc(lesson.date + " " + lesson.teacher + "先生｜" + lesson.title)}</title><link rel="stylesheet" href="summary.css?v=${APP_VERSION}"></head>
<body><main data-app-version="${APP_VERSION}"><header><a class="back" href="${origin}/">授業ノートへ</a><p>${esc(lesson.date)}　${esc(lesson.teacher)}先生</p><h1>${esc(lesson.title)}</h1><a class="video" href="${esc(lesson.videoUrl)}" target="_blank" rel="noreferrer">YouTubeで授業を見る</a></header><h2>場面ごとの振り返り</h2>
${sections}
<h2>照合した資料</h2><nav>${refs.map((r) => `<a class="source" href="${esc(r.url)}" target="_blank" rel="noreferrer">${esc(r.label)}</a>`).join("")}</nav><footer><p>講義の復習用要約です。個々の判断では、問題に書かれた条件と該当場面もあわせて確認してください。</p><a class="back" href="${origin}/">授業ノートへ戻る</a></footer></main></body></html>\n`;
}

export async function renderAugustMaterials() {
  const data = JSON.parse(await readFile(resolve("content/august-2026.json"), "utf8"));
  const provenance = JSON.parse(await readFile(resolve("docs/august-2026-provenance.json"), "utf8"));
  for (const l of data.lessons) {
    const day = l.id.match(/lesson-2026(\d{4})-/)[1];
    await writeFile(resolve(`public/materials/august-2026/${day}.html`), renderMaterial(l, data, provenance));
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await renderAugustMaterials();
