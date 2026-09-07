import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import sharp from "sharp";

test("tab, shortcut and home-screen icons use the Sakura mark, with valid sizes", async () => {
  const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
  assert.ok(!layout.includes("/icons/ensuku-"));
  for (const size of [32, 180, 192]) assert.ok(layout.includes(`/icons/sakura-${size}.png`));
  const manifest = JSON.parse(await readFile(new URL("../public/manifest.webmanifest", import.meta.url)));
  assert.deepEqual(manifest.icons.map((icon) => icon.src), ["icons/sakura-192.png", "icons/sakura-512.png"]);
  for (const size of [16, 32, 48, 180, 192, 512]) {
    const file = new URL(`../public/icons/sakura-${size}.png`, import.meta.url);
    const metadata = await sharp(await readFile(file)).metadata();
    assert.equal(metadata.width, size);
    assert.equal(metadata.height, size);
    assert.equal(metadata.format, "png");
  }
  const icon = await readFile(new URL("../public/favicon.ico", import.meta.url));
  assert.equal(icon.readUInt16LE(2), 1);
  assert.equal(icon.readUInt16LE(4), 3);
});

test("the icon retains the header mark's text and colours", async () => {
  const svg = await readFile(new URL("../public/icons/sakura.svg", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/notebook.css", import.meta.url), "utf8");
  assert.ok(svg.includes(">桜</text>"));
  for (const colour of ["#bfdfd1", "#103b38"]) {
    assert.ok(svg.includes(colour));
    assert.ok(css.includes(colour));
  }
  const { data, info } = await sharp(await readFile(new URL("../public/icons/sakura-192.png", import.meta.url)))
    .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(data[3], 0, "circle corners remain transparent");
  let darkPixels = 0;
  for (let p = 0; p < data.length; p += info.channels) {
    if (data[p] < 50 && data[p + 1] < 100 && data[p + 2] < 100 && data[p + 3] > 200) darkPixels++;
  }
  assert.ok(darkPixels > 1500, "the Sakura glyph must be visible, not an empty circle");
});
