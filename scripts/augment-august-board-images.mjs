// Add only manually reviewed source frames. Full browser captures stay outside Git.
import { readFile, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import manifest from "../content/august-board-images.json" with { type: "json" };

const imageOrigin = "https://sakurakou-lesson-review.kobotenmitsu.chatgpt.site";
const json = async (file) => JSON.parse(await readFile(file, "utf8"));
const save = (file, value) => writeFile(file, JSON.stringify(value, null, 2) + "\n");

export async function augmentAugustBoardImages(root, uploadImages = false) {
  const data = await json(resolve("content/august-2026.json"));
  const provenance = await json(resolve("docs/august-2026-provenance.json"));
  const ledgerPath = join(root, "app-image-uploads.json");
  const uploads = await json(ledgerPath);
  const mappings = [];
  for (const a of manifest.assignments) {
    if (a.file.includes("-full") || a.file.includes("..")) throw new Error("Unpublishable capture");
    const bytes = await readFile(join(root, a.file));
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    if (uploads[a.file]?.sha256 !== sha256) {
      if (!uploadImages) throw new Error(`Reviewed frame needs upload: ${a.file}`);
      const r = await fetch(imageOrigin + "/api/images", {
        method: "POST", headers: { "content-type": "image/jpeg" }, body: bytes,
      });
      if (!r.ok) throw new Error(`Image upload failed: ${r.status}`);
      const value = await r.json();
      if (!value.url?.startsWith(imageOrigin + "/api/images/")) throw new Error("Unexpected image URL");
      uploads[a.file] = { sha256, url: value.url };
      await save(ledgerPath, uploads);
    }
    const { url } = uploads[a.file];
    if (!url.startsWith(imageOrigin + "/api/images/")) throw new Error("Unexpected image origin");
    provenance.images[a.file] = uploads[a.file];
    const lessonId = `lesson-2026${a.day}-nejimaki`;
    const lesson = provenance.lessons.find((l) => l.id === lessonId);
    if (!lesson) throw new Error("Lesson missing: " + lessonId);
    const stamp = `${Math.floor(a.seconds / 60)}:${String(Math.floor(a.seconds % 60)).padStart(2, "0")}`;
    const prefix = `![${a.caption}（動画 ${stamp}）](${url})\n\n`;
    for (const number of a.numbers) {
      const source = lesson.questions.find((q) => q.sourceNumber === number);
      const target = [...data.cards, ...data.items].find((q) => q.id === source?.appId);
      if (!target) throw new Error(`Question missing: ${a.day} Q${number}`);
      if (!target.question.includes(url)) target.question = prefix + target.question;
      if (target.question.length > 2000) throw new Error("Question editor limit exceeded");
      mappings.push({ ...a, lessonId, appId: target.id, sourceNumber: number, url, prefix,
        videoUrl: `${lesson.videoUrl}&t=${Math.floor(a.seconds)}s` });
    }
  }
  provenance.boardImages = { version: manifest.version, method: manifest.method, mappings };
  await save(resolve("content/august-2026.json"), data);
  await save(resolve("docs/august-2026-provenance.json"), provenance);
  console.log(JSON.stringify({ imageAssignments: mappings.length, reviewedFrames: manifest.assignments.length }));
}

// Preview data already exists, so seeding must not overwrite it. Add each image
// through the normal editor only when the original question still matches.
export async function syncLocalBoardImages(origin) {
  if (!/^http:\/\/(localhost|127\.0\.0\.1):\d+\/?$/.test(origin)) {
    throw new Error("This helper only updates an explicitly named local preview");
  }
  const get = async (path) => {
    const r = await fetch(new URL(path, origin));
    if (!r.ok) throw new Error(`Read failed: ${r.status}`);
    return r.json();
  };
  const provenance = await json(resolve("docs/august-2026-provenance.json"));
  const changes = [], skipped = [];
  for (const m of provenance.boardImages.mappings) {
    const flash = m.appId.startsWith("card-");
    const snapshot = await get(flash ? "/api/notebook" : "/api/catalog");
    const current = (flash ? snapshot.cards : snapshot.items).find((q) => q.id === m.appId);
    if (!current || current.deleted) { skipped.push({ id: m.appId, reason: "missing/deleted" }); continue; }
    if (current.question.includes(m.url)) continue;
    const expected = await json(resolve("content/august-2026.json"));
    const target = [...expected.cards, ...expected.items].find((q) => q.id === m.appId);
    if (target.question !== m.prefix + current.question) {
      skipped.push({ id: m.appId, reason: "question edited; needs manual review" }); continue;
    }
    const body = { ...current, question: m.prefix + current.question };
    const path = flash ? `/api/lessons/${m.lessonId}/cards/${m.appId}` : `/api/catalog/items/${m.appId}`;
    const r = await fetch(new URL(path, origin), {
      method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(`Save failed: ${m.appId} (${r.status})`);
    const reread = await get(flash ? "/api/notebook" : "/api/catalog");
    const saved = (flash ? reread.cards : reread.items).find((q) => q.id === m.appId);
    if (saved.question !== body.question || saved.deleted ||
        (flash ? saved.answer !== current.answer : saved.explanation !== current.explanation)) {
      throw new Error("Reload verification failed: " + m.appId);
    }
    changes.push(m.appId);
  }
  console.log(JSON.stringify({ localPreview: origin, updated: changes.length, skipped }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const root = process.argv[2];
  if (!root) throw new Error("Pass the local reviewed-video draft directory");
  await augmentAugustBoardImages(resolve(root), process.argv.includes("--upload-images"));
  const i = process.argv.indexOf("--sync-local");
  if (i >= 0) await syncLocalBoardImages(process.argv[i + 1]);
}
