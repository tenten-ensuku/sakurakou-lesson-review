const CODE = /^(?:[0-9][mps]|[1-7]z)$/;
const SUITS = { m: "man", p: "pin", s: "sou", z: "ji" };
const RED = { m: "aka1", p: "aka2", s: "aka3" };
// This project's approved honor files use 5z=発, 6z=白, 7z=中.
const HONORS = ["", "東", "南", "西", "北", "発", "白", "中"];
export function tileName(code) {
  if (!CODE.test(code ?? "")) return "不明な牌";
  const [n, s] = code;
  return s === "z" ? HONORS[Number(n)] : (n === "0" ? "赤5" : n) + { m: "萬", p: "筒", s: "索" }[s];
}
export function tileFile(code) {
  if (!CODE.test(code ?? "")) return null;
  const [n, s] = code;
  return (n === "0" ? RED[s] : SUITS[s] + n) + "-66-90-l.png";
}
export const tileOptions = (q) => [...q.hand, ...(q.draw ? [q.draw] : [])];
export function normalizeTileQuestion(value) {
  if (!value || typeof value !== "object" || !Array.isArray(value.hand) || !Array.isArray(value.correctTiles)) return null;
  const { hand, draw, correctTiles } = value;
  if (!hand.length || hand.length > 14 || !hand.every((c) => typeof c === "string" && CODE.test(c)) || (draw !== undefined && (typeof draw !== "string" || !CODE.test(draw)))) return null;
  const options = [...hand, ...(draw ? [draw] : [])];
  if (options.length > 14 || !correctTiles.length || correctTiles.length > 14 || !correctTiles.every((c) => options.includes(c))) return null;
  const counts = new Map();
  for (const code of options) {
    const c = code.replace(/^0/, "5");
    counts.set(c, (counts.get(c) ?? 0) + 1);
    if (counts.get(c) > 4) return null;
  }
  return { hand: [...hand], ...(draw ? { draw } : {}), correctTiles: [...new Set(correctTiles)], ...(value.label === "候補牌" ? { label: "候補牌" } : {}) };
}
export function tileAnswer(q, index) {
  const tiles = tileOptions(q);
  if (!Number.isInteger(index) || index < 0 || index >= tiles.length) return null;
  return { tile: tiles[index], correct: q.correctTiles.includes(tiles[index]) };
}
export function parseTileCodes(text) {
  const source = String(text).replace(/\s/g, "");
  const matches = [...source.matchAll(/([0-9]+)([mpsz])/g)];
  if (!source || matches.map((m) => m[0]).join("") !== source) return null;
  const tiles = matches.flatMap((m) => [...m[1]].map((n) => n + m[2]));
  return tiles.every((c) => CODE.test(c)) ? tiles : null;
}
export const tileCodesText = (codes) => codes?.join(" ") ?? "";
