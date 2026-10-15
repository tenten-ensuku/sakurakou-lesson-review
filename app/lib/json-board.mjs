import "./naga-board-state.js";
import "./theory-board-renderer.js";

// Only the tile-code/asset boundary differs from the shared min-kiru renderer.
// This app's local ji5 is green and ji6 is white; canonical NAGA is the reverse.
export const canonicalToLessonTile = tile => ({ ji5: "6z", ji6: "5z" })[tile] ??
  (/^aka[123]$/.test(tile ?? "") ? "0" + "mps"[Number(tile[3]) - 1] :
    String(tile).replace(/^(man|pin|sou|ji)([1-9])$/, (_, suit, n) => n + ({ man: "m", pin: "p", sou: "s", ji: "z" })[suit]));
const state = globalThis.NagaBoardStateV248;
const renderer = globalThis.NagaBoardV248;
const equalTiles = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

export function normalizeJsonBoard(scene, options, draw, naga) {
  if (!state.validate(scene).valid || !Array.isArray(options)) return null;
  if (!scene.players.every(p => p.name === "新人" && p.rank === "初級" && p.rating === null)) return null;
  const tiles = scene.hand.tiles.filter(Boolean).map(canonicalToLessonTile);
  const sceneDraw = scene.hand.draw ? canonicalToLessonTile(scene.hand.draw) : undefined;
  if (sceneDraw !== draw || !equalTiles([...tiles, ...(sceneDraw ? [sceneDraw] : [])], options)) return null;
  if (naga && ["reportId", "tw", "ts", "tv"].some(k => scene.source[k] !== naga[k])) return null;
  // Clone whitelisted, validated visible data. Other players' tile identities
  // cannot enter hiddenSlots (the shared validator only allows booleans).
  return JSON.parse(JSON.stringify(scene));
}

export function jsonBoardLayout(question) {
  const scene = question.boardScene;
  const options = [...question.hand, ...(question.draw ? [question.draw] : [])];
  if (!normalizeJsonBoard(scene, options, question.draw, question.naga)) return null;
  const positions = renderer.handPositions(scene), used = new Set();
  const regions = options.map((tile, i) => {
    const draw = !!question.draw && i === options.length - 1;
    const position = positions.find(p => !used.has(p.index) && p.draw === draw && canonicalToLessonTile(p.tile) === tile);
    if (!position) return null;
    used.add(position.index);
    return { x: position.x, y: position.y, width: renderer.geometry.tileWidth, height: renderer.geometry.tileHeight };
  });
  if (regions.some(p => !p)) return null;
  return { width: renderer.geometry.width, height: renderer.geometry.height, regions: regions.filter(p => p !== null) };
}

// The shared generator is never shipped with the full private report. Rendering
// uses only the verified visible scene, and only approved local tile images.
export function jsonBoardMarkup(scene, basePath = "") {
  if (!state.validate(scene).valid) return '<p role="alert">盤面データを確認できません。</p>';
  const gradientId = `lesson-dora-${scene.source.reportId}-${scene.source.tw}-${scene.source.ts}-${scene.source.tv}`;
  return renderer.markup(scene).replace(/dora-sheen-v333-\d+/g, gradientId).replace(/href="tiles\/(ji[56]|[a-z]+[1-9])-66-90-l\.png"/g, (_, tile) => {
    const local = ({ ji5: "ji6", ji6: "ji5" })[tile] ?? tile;
    return `href="${basePath}/tiles/${local}-66-90-l.png"`;
  });
}

export function jsonBoardAssetUrls(scene, basePath = "") {
  return [...new Set([...jsonBoardMarkup(scene, basePath).matchAll(/href="([^"]+\.png)"/g)].map(m => m[1]))];
}
