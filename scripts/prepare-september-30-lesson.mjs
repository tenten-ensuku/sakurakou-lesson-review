// node scripts/prepare-september-30-lesson.mjs <source-directory> [--upload-images]
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";
import * as content from "../content/september-30-source.mjs";
import { normalizeTileQuestion } from "../app/lib/tile-question.mjs";
import { renderSeptemberMaterial } from "./render-september-material.mjs";
import { SITE_ORIGIN } from "../app/lib/site-origin.mjs";
const { lesson, videoId, questions, summary, scenes, references } = content;
if (!process.argv[2]) throw new Error("Source artifact directory required");
const root = resolve(process.argv[2]);
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
    const r = await fetch(SITE_ORIGIN + "/api/images", { method: "POST", headers: { "content-type": "image/jpeg" }, body: bytes, signal: AbortSignal.timeout(60000) });
    if (!r.ok) throw new Error(`Image upload failed: ${file} (${r.status})`);
    const { url } = await r.json();
    if (!url?.startsWith(SITE_ORIGIN + "/api/images/note-images/")) throw new Error("Unexpected image URL");
    uploads[file] = { sha256, url };
    await writeFile(cache, JSON.stringify(uploads, null, 2) + "\n");
  }
  images[key] = { ...scene, ...uploads[file], sourceFile: file, sourceSecond: scene.at, transformation: "Full 1280x720 source frame; no crop or redrawing.", width: 1280, height: 720 };
}
const stamp = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const image = (key) => `![${images[key].caption}（動画 ${stamp(images[key].at)}）](${images[key].url})`;
const video = (at) => `${lesson.videoUrl}&t=${at}s`;
const output = { lessons: [lesson], cards: [], items: [], resources: [] };
output.cards.push({ id: "card-20260930-summary", lessonId: lesson.id, kind: "note", question: `授業の要約：${summary.length}のポイント`, answer: summary.map((s) => `${s.title}\n${s.text}\n${video(s.at)}`).join("\n\n"), sortOrder: -1 });
const mapping = [];
if (!questions.length || new Set(questions.map((q) => q.id)).size !== questions.length) throw new Error("Unique substantive questions required; no fixed quota");
for (const [i, q] of questions.entries()) {
  if (!q.answer || !q.explanation || q.at < 0 || q.at > 4794 || !images[q.scene]) throw new Error(`Invalid question: ${q.id}`);
  const id = `card-20260930-${q.id}`;
  const question = [image(q.scene), q.question].join("\n\n");
  const answer = [q.answer, q.explanation, video(q.at), ...q.refs.map((k) => references[k].url)].join("\n\n");
  if (question.length > 2000 || answer.length > 5000) throw new Error(`Editor limit: ${q.id}`);
  const tileQuestion = q.tileQuestion ? normalizeTileQuestion(q.tileQuestion) : null;
  if (q.tileQuestion && !tileQuestion) throw new Error(`Invalid tile answer: ${q.id}`);
  output.cards.push({ id, lessonId: lesson.id, kind: "question", question, answer, sortOrder: i + 1, ...(tileQuestion ? { tileQuestion } : {}) });
  mapping.push({ sourceId: q.id, appId: id, displayNumber: i + 1, type: tileQuestion ? "tile-select" : "flashcard", at: q.at, scene: q.scene, ...(tileQuestion ? { tileQuestion } : {}), canonicalSources: q.refs, reviewStatus: "verified" });
}
output.resources.push({ id: "resource-20260930-summary", lessonId: lesson.id, kind: "link", label: `授業の要約・盤面で振り返る${summary.length}のポイント`, url: `${SITE_ORIGIN}/materials/september-2026/0930.html`, sortOrder: 0 });
for (const [i, [k, r]] of Object.entries(references).entries()) output.resources.push({ id: `resource-20260930-${k}`, lessonId: lesson.id, kind: "link", label: r.title, url: r.url, sortOrder: i + 1 });
for (const [i, [k, im]] of Object.entries(images).entries()) output.resources.push({ id: `resource-20260930-scene-${k}`, lessonId: lesson.id, kind: "image", label: im.caption, url: im.url, sortOrder: i + 4 });
const docs = JSON.parse(await readFile(join(root, "canonical-documents.json"), "utf8"));
const provenance = {
  video: { id: videoId, title: "桜花　動画検討　★3", channel: "てんてん", date: "2026-09-30", durationSeconds: 4793.254, url: lesson.videoUrl, publishedAtUTC: "2026-09-29T23:38:21Z", publishedAtJST: "2026-09-30T08:38:21+09:00" },
  method: "Full Japanese auto-caption track indexed and read through lesson conclusion, with individually inspected full source frames and enlarged hand/river crops. Captions are an index, not verbatim authority; no separate audio transcription or continuous audio playback claimed.",
  tools: { downloader: "yt-dlp 2026.08.19", frames: "ffmpeg 8.1.2", captions: "YouTube ja-orig / rolling-caption deduplication" },
  canonicalDocuments: Object.values(docs).map((d) => ({ title: d.title, documentId: d.documentId, revisionId: d.revisionId, checkedAt: "2026-09-30" })),
  transcriptSha256: hash(await readFile(join(root, "captions-clean.json"))),
  editorialNotes: [
    "No fixed 30-question quota. Keep distinct lecturer-emphasized decisions, concise explanations for 雀豪, and precise conditional definitions.",
    "At 8:30, 3p no-chance and passed 8p remove the two ryanmen waits on 5p; three visible 5p remove shabo. Unlike the verbal shorthand, these facts alone do not logically exclude kan5p. Keep the lecturer's low-risk 5p recommendation without calling it absolute safety.",
    "At 16–18 minutes prioritize the lecturer's correction to West, not the initial 5s suggestion. Red 5s and red 5m retain dedicated approved assets.",
    "At 28:30 the viewer displays 3m separated and only 13 visible tiles. Use explicitly labeled candidate tiles, not an invented complete hand.",
    "Honitsu discussion's 23m dora-ryanmen is a hypothetical comparison, not the displayed 114s hand. The actual image has 11s head and 4s isolated tile.",
    "89p block deletion accepts either tile. East or North accepts both as allowed by the lecturer. The last-round 6s push is not universally wrong.",
    "4p pon question displays the eight concealed tiles AFTER the hypothetical pon, before discarding. Independent winning-hand enumeration verifies 5s tanki vs depleted 6p/9p waits.",
    "Keiten 2500-point swing holds with one or two other tenpai players; with zero or three it is 3000. Preserve the condition rather than generalizing the spoken shorthand.",
    "Canonical honitsu 9/10/11 excerpts preserve the live document wording. Older lessons, stable IDs, personal records, and public edits are not changed.",
  ],
  questions: mapping, images,
};
await mkdir(resolve("public/materials/september-2026"), { recursive: true });
await writeFile(resolve("content/september-30.json"), JSON.stringify(output, null, 2) + "\n");
await writeFile(resolve("docs/september-30-provenance.json"), JSON.stringify(provenance, null, 2) + "\n");
await writeFile(resolve("public/materials/september-2026/0930.html"), renderSeptemberMaterial(provenance, content));
console.log(JSON.stringify({ lesson: lesson.date, questions: questions.length, tileQuestions: questions.filter((q) => q.tileQuestion).length, images: Object.keys(images).length, summary: summary.length }));
