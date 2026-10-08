import test from "node:test";
import assert from "node:assert/strict";
import { honorTileNumber, tokenizeMahjongText } from "../app/lib/mahjong-tiles.mjs";

test("maps every honor character to the approved Ensuku tile image number", () => {
  assert.deepEqual(
    [..."東南西北發発白中"].map(honorTileNumber),
    ["1", "2", "3", "4", "5", "5", "6", "7"],
  );
});

test("converts fullwidth and mixed-width tile notation while preserving source text", () => {
  const value = "4ｍ、6ｍ、１４m、4７ｍ、３６Ｍ、69ｍ、１２3ｐ、７Ｓ、５ｚ。中張牌と発展は文字のまま。";
  const tokens = tokenizeMahjongText(value);
  assert.deepEqual(tokens.filter((token) => token.type === "tiles").map(({ suit, digits, source }) => ({ suit, digits, source })), [
    { suit: "m", digits: ["4"], source: "4ｍ" },
    { suit: "m", digits: ["6"], source: "6ｍ" },
    { suit: "m", digits: ["1", "4"], source: "１４m" },
    { suit: "m", digits: ["4", "7"], source: "4７ｍ" },
    { suit: "m", digits: ["3", "6"], source: "３６Ｍ" },
    { suit: "m", digits: ["6", "9"], source: "69ｍ" },
    { suit: "p", digits: ["1", "2", "3"], source: "１２3ｐ" },
    { suit: "s", digits: ["7"], source: "７Ｓ" },
    { suit: "ji", digits: ["5"], source: "５ｚ" },
  ]);
  assert.equal(tokens.map((token) => token.type === "text" ? token.value : token.source).join(""), value);
  assert.ok(tokens.at(-1).value.includes("中張牌と発展"));
});

test("converts every suited tile with uppercase, fullwidth and whitespace variants", () => {
  for (const [notation, suit] of [["ｍ", "m"], ["Ｐ", "p"], ["ｓ", "s"], ["M", "m"], ["p", "p"], ["S", "s"]]) {
    assert.deepEqual(tokenizeMahjongText(`１２３４５６７８９　${notation}`), [
      { type: "tiles", suit, digits: [..."123456789"], source: `１２３４５６７８９　${notation}` },
    ]);
  }
  assert.deepEqual(tokenizeMahjongText("１２３４５６７Ｚ")[0].digits, [..."1234567"]);
});

test("edited Q14 fullwidth notation renders as tile runs on repeated calls", () => {
  const value = "晒している4ｍと6ｍに注目。\nこれを含む筋14ｍ、47ｍ、36ｍ、69ｍの両面待ちは、食い伸ばしにしか当たらない。";
  for (let i = 0; i < 2; i++) {
    assert.deepEqual(tokenizeMahjongText(value).filter((token) => token.type === "tiles").map((token) => token.digits.join("")), ["4", "6", "14", "47", "36", "69"]);
  }
});

test("converts suited and explicit honor notation without replacing ordinary Japanese words", () => {
  const tokens = tokenizeMahjongText("中張牌から123mを残し、発展を狙う。南3局。白発中と567p、123s、5z。");
  const tiles = tokens.filter((token) => token.type === "tiles");

  assert.deepEqual(tiles.map(({suit,digits}) => ({suit,digits})), [
    {suit:"m",digits:["1","2","3"]},
    {suit:"ji",digits:["6","5","7"]},
    {suit:"p",digits:["5","6","7"]},
    {suit:"s",digits:["1","2","3"]},
    {suit:"ji",digits:["5"]},
  ]);
  assert.equal(tokens.filter((token) => token.type === "text").map((token) => token.value).join(""), "中張牌からを残し、発展を狙う。南3局。と、、。");
});
