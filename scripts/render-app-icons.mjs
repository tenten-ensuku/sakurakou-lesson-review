import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

// Render the existing student-mark typography, not new illustration artwork.
// Use the installed Noto Sans JP font (the app's first-choice font).
const directory = new URL("../public/icons/", import.meta.url);
const source = await readFile(new URL("sakura.svg", directory));
const sizes = [16, 32, 48, 180, 192, 512];
const rendered = new Map();
for (const size of sizes) {
  const png = await sharp(source, { density: 288 })
    .resize(size, size)
    .png()
    .toBuffer();
  await writeFile(new URL(`sakura-${size}.png`, directory), png);
  rendered.set(size, png);
}

// Modern ICO supports PNG frames; include the three common tab icon sizes.
const frames = [16, 32, 48];
const header = Buffer.alloc(6 + frames.length * 16);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(frames.length, 4);
let offset = header.length;
frames.forEach((size, index) => {
  const entry = 6 + index * 16;
  const png = rendered.get(size);
  header[entry] = size;
  header[entry + 1] = size;
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(png.length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += png.length;
});
await writeFile(new URL("../favicon.ico", directory), Buffer.concat([
  header, ...frames.map((size) => rendered.get(size)),
]));
console.log(`Rendered ${sizes.length} Sakura PNG icons and favicon.ico`);
