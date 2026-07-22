export const HONOR_TILE_NUMBERS = Object.freeze({
  東: "1",
  南: "2",
  西: "3",
  北: "4",
  發: "5",
  発: "5",
  白: "6",
  中: "7",
});

export function honorTileNumber(character) {
  return HONOR_TILE_NUMBERS[character] ?? null;
}
