import test from "node:test";
import assert from "node:assert/strict";
import { honorTileNumber, tokenizeMahjongText } from "../app/lib/mahjong-tiles.mjs";

test("maps every honor character to the approved Ensuku tile image number", () => {
  assert.deepEqual(
    [..."東南西北發発白中"].map(honorTileNumber),
    ["1", "2", "3", "4", "5", "5", "6", "7"],
  );
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
