// Generate app-ready data from the source-reviewed lesson. No existing DB rows are edited.
// Usage: node scripts/prepare-september-lesson.mjs <artifact-directory> [--upload-images]
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";
import { lesson, videoId, questions, summary, scenes, references } from "../content/september-2026-source.mjs";
import { renderSeptemberMaterial } from "./render-september-material.mjs";

const root = resolve(process.argv[2] ?? "");
if (!process.argv[2]) throw new Error("Source artifact directory required");
const origin = "https://sakurakou-lesson-review.kobotenmitsu.chatgpt.site";
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const uploadFile = join(root, "app-image-uploads.json");
let uploads = {};
try { uploads = JSON.parse(await readFile(uploadFile, "utf8")); } catch (e) { if (e.code !== "ENOENT") throw e; }
const reviewed = {};
for (const [key, scene] of Object.entries(scenes)) {
  const cropped = ["0365", "2747"].includes(key);
  const file = `scenes/${key}${cropped ? "-crop" : ""}.jpg`;
  const bytes = await readFile(join(root, file));
  const sha256 = hash(bytes);
  if (uploads[file]?.sha256 !== sha256) {
    if (!process.argv.includes("--upload-images")) throw new Error(`Image not uploaded: ${file}`);
    const r = await fetch(origin + "/api/images", { method: "POST", headers: { "content-type": "image/jpeg" }, body: bytes });
    if (!r.ok) throw new Error(`Image upload failed: ${file} (${r.status})`);
    const data = await r.json();
    if (!data.url?.startsWith(origin + "/api/images/note-images/")) throw new Error("Unexpected image URL");
    uploads[file] = { sha256, url: data.url };
    await writeFile(uploadFile, JSON.stringify(uploads, null, 2) + "\n");
  }
  reviewed[key] = { ...scene, ...uploads[file], sourceFile: file, sourceSecond: scene.at,
    transformation: cropped ? "Crop of the lecturer's complete tile diagram; no tiles redrawn or removed." : "Full 1280x720 source frame; no crop or redrawing.",
    width: cropped ? 960 : 1280, height: key === "0365" ? 320 : key === "2747" ? 600 : 720 };
}
const stamp = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const image = (key) => key ? `![${reviewed[key].caption}（動画 ${stamp(reviewed[key].at)}）](${reviewed[key].url})` : "";
const video = (at) => `${lesson.videoUrl}&t=${at}s`;
const output = { lessons: [lesson], cards: [], items: [], resources: [] };
output.cards.push({ id: "card-20260927-summary", lessonId: lesson.id, kind: "note", question: "授業の要約：8つのポイント",
  answer: summary.map((s) => `${s.title}\n${s.text}\n${video(s.at)}`).join("\n\n"), sortOrder: -1 });
const mapping = [];
if (questions.length !== 30) throw new Error("Exactly 30 questions required");
for (const [index, q] of questions.entries()) {
  if (!q.id || !q.explanation || !q.answer || q.at < 0 || q.at > 4831) throw new Error("Invalid source question");
  const id = `${q.type === "flashcard" ? "card" : "check"}-20260927-${q.id}`;
  const question = [image(q.scene), q.question].filter(Boolean).join("\n\n");
  const answer = [q.answer, q.explanation, "授業の該当場面\n" + video(q.at),
    ...q.refs.map((key) => `${references[key].title}\n${references[key].url}`)].join("\n\n");
  if (question.length > 2000 || answer.length > 5000) throw new Error(`Editor limit: ${q.id}`);
  if (q.type === "flashcard") output.cards.push({ id, lessonId: lesson.id, kind: "question", question, answer, sortOrder: index + 1 });
  else {
    if (q.choices.length !== 4 || new Set(q.choices).size !== 4 || !Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex > 3) throw new Error(`Invalid choices: ${q.id}`);
    output.items.push({ id, theoryId: "", type: q.type, question, choices: q.choices, correctIndex: q.correctIndex, explanation: answer, lessonIds: [lesson.id], sortOrder: index + 1, deleted: false, revision: 1 });
  }
  mapping.push({ sourceId: q.id, appId: id, displayNumber: index + 1, type: q.type, at: q.at, scene: q.scene ?? null, canonicalSources: q.refs, reviewStatus: "verified" });
}
output.resources.push({ id: "resource-20260927-summary", lessonId: lesson.id, kind: "link", label: "授業の要約・盤面で振り返る8つのポイント", url: `${origin}/materials/september-2026/0927.html`, sortOrder: 0 });
for (const [index, [key, r]] of Object.entries(references).entries()) output.resources.push({ id: `resource-20260927-${key}`, lessonId: lesson.id, kind: "link", label: r.title, url: r.url, sortOrder: index + 1 });
for (const [index, [key, s]] of Object.entries(reviewed).entries()) output.resources.push({ id: `resource-20260927-scene-${key}`, lessonId: lesson.id, kind: "image", label: s.caption, url: s.url, sortOrder: index + 4 });
const documents = JSON.parse(await readFile(join(root, "canonical-documents.json"), "utf8"));
const provenance = {
  video: { id: videoId, title: "桜紅さん牌譜検討前半", channel: "ねじまき鳥", date: "2026-09-27", durationSeconds: 4831, url: lesson.videoUrl },
  method: "Full downloaded video and audio; Japanese faster-whisper small/int8 CPU transcription, checked against source frames and current canonical documents. Transcription is an index, not a verbatim authority.",
  tools: { downloader: "yt-dlp 2026.08.19", frames: "ffmpeg 8.1.2", transcription: "faster-whisper 1.2.1 / small / ja / int8" },
  canonicalDocuments: Object.values(documents).map((d) => ({ title: d.title, documentId: d.documentId, revisionId: d.revisionId, checkedAt: "2026-09-27" })),
  transcriptSha256: hash(await readFile(join(root, "transcript.json"))),
  editorialNotes: ["講師の途中訂正を採用：おひたしの『お』は相手が親（75:28以降）。", "微差・分岐は理由を問う形式にし、唯一の何切る解として採点しない。", "天気の比喩と主観的な警戒度の数値は採用しない。", "2pのフォロー比較は24566789p、後のヘッドレス2型は45667789p。動画フレームで区別。", "シャンポンの点数は本場・供託を除く。", "人物の非公開連絡先や一時表示されたデスクトップは画像資料に使用しない。"],
  questions: mapping, images: reviewed,
};
await mkdir(resolve("public/materials/september-2026"), { recursive: true });
await writeFile(resolve("content/september-2026.json"), JSON.stringify(output, null, 2) + "\n");
await writeFile(resolve("docs/september-2026-provenance.json"), JSON.stringify(provenance, null, 2) + "\n");
await writeFile(resolve("public/materials/september-2026/0927.html"), renderSeptemberMaterial(provenance));
console.log(JSON.stringify({ lesson: lesson.date, questions: questions.length, types: Object.fromEntries(["flashcard", "choice", "cloze"].map((t) => [t, questions.filter((q) => q.type === t).length])), images: Object.keys(reviewed).length }));
