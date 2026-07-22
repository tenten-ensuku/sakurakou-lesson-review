import test from "node:test";
import assert from "node:assert/strict";
import { honorTileNumber } from "../app/lib/mahjong-tiles.mjs";

test("maps every honor character to the approved Ensuku tile image number", () => {
  assert.deepEqual(
    [..."東南西北發発白中"].map(honorTileNumber),
    ["1", "2", "3", "4", "5", "5", "6", "7"],
  );
});
