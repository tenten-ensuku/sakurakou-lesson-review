// Convert the reviewed package, preserving wording and stable source identities.
// Usage: node scripts/prepare-august-lessons.mjs <draft-directory> [--upload-images]
// Image uploads use the existing public teaching-material API, never private learning data.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";
import { tokenizeMahjongText } from "../app/lib/mahjong-tiles.mjs";
import { augmentAugustBoardImages } from "./augment-august-board-images.mjs";

const root = resolve(process.argv[2] ?? "");
if (!process.argv[2]) throw new Error("A reviewed draft directory is required");
const origin = "https://sakurakou-lesson-review.kobotenmitsu.chatgpt.site";
const source = JSON.parse(await readFile(join(root, "questions.json"), "utf8"));
const evidence = JSON.parse(await readFile(join(root, "evidence-manifest.json"), "utf8"));
const selectedImages = new Map([
  ["0822/00-15-19-combined.jpg", "複合形の受け入れ比較"],
  ["0822/01-06-02-surplus.jpg", "余剰牌と受け入れ"],
  ["0824/00-01-23-kan.jpg", "カン判断の検討場面"],
  ["0824/00-03-24-safety.jpg", "安全牌の持ち方"],
  ["0824/00-19-24-fold.jpg", "降り判断の検討場面"],
  ["0824/00-53-04-toitoi.jpg", "対々和の手組を振り返る"],
  ["0828/00-01-47-super-weak.jpg", "超愚形のリーチ判断"],
  ["0828/00-07-37-ranking.jpg", "ブロックの比較・講師の整理"],
  ["0828/00-09-38-headless.jpg", "鳴いた後の雀頭を確認"],
]);
const mapPath = join(root, "app-image-uploads.json");
let uploads;
try { uploads = JSON.parse(await readFile(mapPath, "utf8")); }
catch (e) { if (e.code !== "ENOENT") throw e; uploads = {}; }
for (const path of selectedImages.keys()) {
  const bytes = await readFile(join(root, path));
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  if (uploads[path]?.sha256 === sha256 && uploads[path]?.url?.startsWith(origin + "/api/images/")) continue;
  if (!process.argv.includes("--upload-images")) throw new Error(`Image not uploaded: ${path}`);
  const result = await fetch(origin + "/api/images", {
    method: "POST", headers: { "content-type": "image/jpeg" }, body: bytes,
  });
  if (!result.ok) throw new Error(`Image upload failed (${result.status}): ${path}`);
  const data = await result.json();
  if (!data.url?.startsWith(origin + "/api/images/")) throw new Error("Unexpected image URL");
  uploads[path] = { sha256, url: data.url };
  // Persist each successful upload outside Git so retrying never uploads it twice.
  await writeFile(mapPath, JSON.stringify(uploads, null, 2) + "\n");
}
const image = (path, caption) => {
  if (!path) return "";
  if (!selectedImages.has(path)) throw new Error(`Unreviewed image: ${path}`);
  return `![${(caption || selectedImages.get(path)).replace(/[\[\]]/g, "")} ](${uploads[path].url})`.replace(" ]", "]");
};
const hash = (id) => createHash("sha256").update(id).digest("hex").slice(0, 20);
const seconds = (at) => at.split(":").reduce((a, n) => a * 60 + Number(n), 0);
const esc = (text) => String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const rich = (text) => tokenizeMahjongText(text).map((t) => t.type === "text" ? esc(t.value) :
  `<span class="tiles">${t.digits.map((n) => `<img src="../../tiles/${({ m:"man", p:"pin", s:"sou", ji:"ji" })[t.suit]}${n}-66-90-l.png" alt="${esc(t.source ?? "麻雀牌")}" width="66" height="90">`).join("")}</span>`).join("");
const output = { lessons: [], cards: [], items: [], resources: [] };
const provenance = { sourcePackage: "reviewed-video-drafts", sourceMethod: evidence.method, canonicalDocuments: evidence.canonicalDocuments, lessons: [], images: uploads };
const materialDir = resolve("public/materials/august-2026");
await mkdir(materialDir, { recursive: true });
const expectedVideos = { "2026-08-22": "0NFphQRVaq8", "2026-08-24": "cJ6zv4MH_IA", "2026-08-28": "IogKcSnPscE" };
if (source.lessons.length !== 3) throw new Error("Expected three separate lessons");
for (const l of source.lessons) {
  if (expectedVideos[l.date] !== l.videoId || l.questions.length !== 30 || l.teacher !== "ねじまき鳥") throw new Error("Lesson metadata mismatch");
  const compact = l.date.replaceAll("-", ""), day = compact.slice(4);
  const lessonId = `lesson-${compact}-nejimaki`;
  const date = `${Number(day.slice(0, 2))}/${Number(day.slice(2))}`;
  const videoUrl = `https://www.youtube.com/watch?v=${l.videoId}`;
  output.lessons.push({ id: lessonId, date, teacher: l.teacher, title: l.title, videoUrl });
  const notes = l.summary.map((s) => `${s.title}\n${s.text}\n${videoUrl}&t=${seconds(s.at)}s`).join("\n\n");
  output.cards.push({ id: `card-${compact}-summary`, lessonId, kind: "note", question: "授業の要約：6つのポイント", answer: notes, sortOrder: -1 });
  const mapping = [];
  const refs = new Map();
  for (const q of l.questions) {
    const question = [q.prompt.text.replace(/【[　\s]*】/g, "［　］"), image(q.prompt.imageUrl, q.prompt.imageCaption)].filter(Boolean).join("\n\n");
    const details = q.explanation;
    for (const r of details.canonicalSources ?? []) refs.set(r.url, r);
    const answer = [
      q.answer.text, details.text,
      ...(details.exceptions ?? []).map((s) => "条件・例外：" + s),
      ...(details.inferences ?? []).map((s) => "補足（推論）：" + s),
      image(details.imageUrl),
      "授業の該当場面\n" + q.source.urls.join("\n"),
      ...(details.canonicalSources ?? []).map((r) => `${r.title}${r.section ? "・" + r.section : ""}\n${r.url}`),
    ].filter(Boolean).join("\n\n");
    if (question.length > 2000 || answer.length > 5000) throw new Error("Editor limit exceeded");
    const id = `${q.type === "flashcard" ? "card" : "check"}-${compact}-${hash(q.questionId)}`;
    if (q.type === "flashcard") {
      output.cards.push({ id, lessonId, kind: "question", question, answer, sortOrder: q.displayNumber });
    } else {
      const choices = q.prompt.choices;
      if (choices.length !== 4 || new Set(choices).size !== 4) throw new Error("Invalid choices");
      output.items.push({ id, theoryId: "", type: q.type, question, choices, correctIndex: q.answer.correctIndex, explanation: answer, lessonIds: [lessonId], sortOrder: q.displayNumber, deleted: false, revision: 1 });
    }
    mapping.push({ sourceId: q.questionId, appId: id, sourceNumber: q.displayNumber, type: q.type, at: q.source.at });
  }
  const lessonImages = [...selectedImages].filter(([path]) => path.startsWith(day + "/"));
  const resources = [
    { kind: "link", label: "授業の要約・6つのポイント", url: `${origin}/materials/august-2026/${day}.html` },
    ...lessonImages.map(([path, label]) => ({ kind: "image", label, url: uploads[path].url })),
    ...[...refs.values()].map((r) => ({ kind: "link", label: r.title, url: r.url })),
  ];
  resources.forEach((r, i) => output.resources.push({ ...r, id: `resource-${compact}-${hash(r.url)}`, lessonId, sortOrder: i }));
  const html = `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>${esc(date + " ねじまき鳥先生｜" + l.title)}</title><link rel="stylesheet" href="summary.css"></head><body><main><header><a class="back" href="${origin}/">授業ノートへ</a><p>${esc(date)}　ねじまき鳥先生</p><h1>${esc(l.title)}</h1><a class="video" href="${videoUrl}" target="_blank" rel="noreferrer">YouTubeで授業を見る</a></header><h2>授業の要約</h2>${l.summary.map((s, i) => `<section><h3>${i + 1}. ${esc(s.title)}</h3><p>${rich(s.text)}</p><a class="source" href="${videoUrl}&t=${seconds(s.at)}s" target="_blank" rel="noreferrer">${esc(s.at)}の場面を見る</a></section>`).join("")}<h2>場面画像</h2><p class="muted">解説や検討後の画像を含みます。先に問題を解きたいときは、授業ノートから始めてください。</p>${lessonImages.map(([path, label]) => `<figure><a href="${uploads[path].url}" target="_blank" rel="noreferrer"><img src="${uploads[path].url}" alt="${esc(label)}" loading="lazy"></a><figcaption>${esc(label)}（画像を押すと拡大）</figcaption></figure>`).join("")}<h2>照合した資料</h2><nav>${[...refs.values()].map((r) => `<a class="source" href="${esc(r.url)}" target="_blank" rel="noreferrer">${esc(r.title)}</a>`).join("")}</nav><footer><p>講義の復習用要約です。個々の判断では、問題に書かれた条件と該当場面もあわせて確認してください。</p><a class="back" href="${origin}/">授業ノートへ戻る</a></footer></main></body></html>\n`;
  await writeFile(join(materialDir, day + ".html"), html);
  provenance.lessons.push({ id: lessonId, sourceDate: l.date, videoUrl, title: l.title, questions: mapping });
}
await mkdir(resolve("content"), { recursive: true });
await writeFile(resolve("content/august-2026.json"), JSON.stringify(output, null, 2) + "\n");
await writeFile(resolve("docs/august-2026-provenance.json"), JSON.stringify(provenance, null, 2) + "\n");
console.log(JSON.stringify({ lessons: output.lessons.length, flashcards: output.cards.filter((c) => c.kind === "question").length, checks: output.items.length, summaries: 3, images: selectedImages.size }));
await augmentAugustBoardImages(root, process.argv.includes("--upload-images"));
