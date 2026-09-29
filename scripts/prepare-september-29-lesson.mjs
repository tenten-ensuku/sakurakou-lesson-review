// Material generation is repeatable; uploaded frames are cached by SHA-256.
// Usage: node scripts/prepare-september-29-lesson.mjs <source-directory> [--upload-images]
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";
import * as content from "../content/september-29-source.mjs";
import { renderSeptemberMaterial } from "./render-september-material.mjs";
const { lesson, videoId, questions, summary, scenes, references } = content;
if (!process.argv[2]) throw new Error("Source artifact directory required");
const root = resolve(process.argv[2]);
const origin = "https://sakurakou-lesson-review.kobotenmitsu.chatgpt.site";
const hash = (b) => createHash("sha256").update(b).digest("hex");
const cache = join(root, "app-image-uploads.json");
let uploads = {};
try { uploads = JSON.parse(await readFile(cache, "utf8")); } catch (e) { if (e.code !== "ENOENT") throw e; }
const images = {};
for (const [key, scene] of Object.entries(scenes)) {
  const file = `frames/${key}.jpg`, bytes = await readFile(join(root, file));
  const sha256 = hash(bytes);
  if (uploads[file]?.sha256 !== sha256) {
    if (!process.argv.includes("--upload-images")) throw new Error(`Image not uploaded: ${file}`);
    const r = await fetch(origin + "/api/images", { method: "POST", headers: { "content-type": "image/jpeg" }, body: bytes });
    if (!r.ok) throw new Error(`Image upload failed: ${file} (${r.status})`);
    const { url } = await r.json();
    if (!url?.startsWith(origin + "/api/images/note-images/")) throw new Error("Unexpected image URL");
    uploads[file] = { sha256, url };
    await writeFile(cache, JSON.stringify(uploads, null, 2) + "\n");
  }
  images[key] = { ...scene, ...uploads[file], sourceFile: file, sourceSecond: scene.at,
    transformation: "Full 1280x720 source frame; no crop or redrawing.", width: 1280, height: 720 };
}
const stamp = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const image = (key) => key ? `![${images[key].caption}（動画 ${stamp(images[key].at)}）](${images[key].url})` : "";
const video = (at) => `${lesson.videoUrl}&t=${at}s`;
const output = { lessons: [lesson], cards: [], items: [], resources: [] };
output.cards.push({ id: "card-20260929-summary", lessonId: lesson.id, kind: "note", question: "授業の要約：7つのポイント",
  answer: summary.map((s) => `${s.title}\n${s.text}\n${video(s.at)}`).join("\n\n"), sortOrder: -1 });
const mapping = [];
if (questions.length !== 30 || new Set(questions.map((q) => q.id)).size !== 30) throw new Error("30 unique questions required");
for (const [i, q] of questions.entries()) {
  if (!q.answer || !q.explanation || q.at < 0 || q.at > 1288) throw new Error(`Invalid source question: ${q.id}`);
  const id = `${q.type === "flashcard" ? "card" : "check"}-20260929-${q.id}`;
  const question = [image(q.scene), q.question].filter(Boolean).join("\n\n");
  const answer = [q.answer, q.explanation, "授業の該当場面\n" + video(q.at), ...q.refs.map((k) => `${references[k].title}\n${references[k].url}`)].join("\n\n");
  if (question.length > 2000 || answer.length > 5000) throw new Error(`Editor limit: ${q.id}`);
  if (q.type === "flashcard") output.cards.push({ id, lessonId: lesson.id, kind: "question", question, answer, sortOrder: i + 1 });
  else {
    if (q.choices.length !== 4 || new Set(q.choices).size !== 4 || !Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex > 3) throw new Error(`Invalid choices: ${q.id}`);
    output.items.push({ id, theoryId: "", type: q.type, question, choices: q.choices, correctIndex: q.correctIndex, explanation: answer, lessonIds: [lesson.id], sortOrder: i + 1, deleted: false, revision: 1 });
  }
  mapping.push({ sourceId: q.id, appId: id, displayNumber: i + 1, type: q.type, at: q.at, scene: q.scene ?? null, canonicalSources: q.refs, reviewStatus: "verified" });
}
output.resources.push({ id: "resource-20260929-summary", lessonId: lesson.id, kind: "link", label: "授業の要約・盤面で振り返る7つのポイント", url: `${origin}/materials/september-2026/0929.html`, sortOrder: 0 });
for (const [i, [k, r]] of Object.entries(references).entries()) output.resources.push({ id: `resource-20260929-${k}`, lessonId: lesson.id, kind: "link", label: r.title, url: r.url, sortOrder: i + 1 });
for (const [i, [k, im]] of Object.entries(images).entries()) output.resources.push({ id: `resource-20260929-scene-${k}`, lessonId: lesson.id, kind: "image", label: im.caption, url: im.url, sortOrder: i + 4 });
const docs = JSON.parse(await readFile(join(root, "canonical-documents.json"), "utf8"));
const provenance = {
  video: { id: videoId, title: "桜紅さん牌譜検討　後半", channel: "ねじまき鳥", date: "2026-09-29", durationSeconds: 1288, url: lesson.videoUrl },
  method: "Full Japanese auto-caption track read, with individually inspected full source frames and current canonical documents. Captions are an index, not a verbatim authority. No separate audio transcription was used.",
  tools: { downloader: "yt-dlp 2026.08.19", frames: "ffmpeg 8.1.2", captions: "YouTube ja-orig / rolling-caption deduplication" },
  canonicalDocuments: Object.values(docs).map((d) => ({ title: d.title, documentId: d.documentId, revisionId: d.revisionId, checkedAt: "2026-09-29" })),
  transcriptSha256: hash(await readFile(join(root, "captions-clean.json"))),
  editorialNotes: ["8:20以降のルール確認と西切り評価の補足を優先。AI内部の理由を断定しない。", "副露からの染め手・聴牌は推測と確定を区別。", "微差の何切るは候補の理由を問う。唯一解として採点しない。", "赤五索は通常の5sの牌画像に置換せず、実際の盤面画像と文字で示す。", "画像は切り抜かず全景を保持。打牌後の画像は説明に明記。", "南4局の受け入れは見え枚数を引く前の比較と明記。", "既存9/27授業のユーザー追記と公開編集データは上書きしない。"],
  questions: mapping, images,
};
await mkdir(resolve("public/materials/september-2026"), { recursive: true });
await writeFile(resolve("content/september-29.json"), JSON.stringify(output, null, 2) + "\n");
await writeFile(resolve("docs/september-29-provenance.json"), JSON.stringify(provenance, null, 2) + "\n");
await writeFile(resolve("public/materials/september-2026/0929.html"), renderSeptemberMaterial(provenance, content));
console.log(JSON.stringify({ lesson: lesson.date, questions: questions.length, types: Object.fromEntries(["flashcard", "choice", "cloze"].map((t) => [t, questions.filter((q) => q.type === t).length])), images: Object.keys(images).length }));
