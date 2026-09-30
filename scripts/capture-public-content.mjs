// Read public teaching rows only; no personal profiles, auth credentials or writes.
import { writeFile } from "node:fs/promises";
import { SITE_ORIGIN } from "../app/lib/site-origin.mjs";
if (!process.argv[2]) throw new Error("Output path required");
const get = async (path) => { const r = await fetch(SITE_ORIGIN + path, { signal: AbortSignal.timeout(30000) }); if (!r.ok) throw new Error(`GET ${path}: ${r.status}`); return r.json(); };
const [notebook, catalog] = await Promise.all([get("/api/notebook"), get("/api/catalog")]);
await writeFile(process.argv[2], JSON.stringify({ notebook, catalog }, null, 2) + "\n");
console.log(JSON.stringify({ lessons: notebook.lessons.length, cards: notebook.cards.length, checks: catalog.items.length }));
