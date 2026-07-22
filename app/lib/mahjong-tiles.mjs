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

const TILE_PATTERN = /([1-9]+)\s*([mps])|([1-7]+)\s*(z)|([東南西北白發発中]{2,})|(?<![\p{L}\p{N}])([東南西北白發発中])(?![\p{L}\p{N}])/giu;

export function tokenizeMahjongText(value) {
  const tokens = [];
  let cursor = 0;
  let match;

  TILE_PATTERN.lastIndex = 0;
  while ((match = TILE_PATTERN.exec(value))) {
    if (match.index > cursor) tokens.push({ type: "text", value: value.slice(cursor, match.index) });

    const honorCharacters = match[5] ?? match[6];
    const suit = honorCharacters ? "ji" : (match[4] ? "ji" : match[2].toLowerCase());
    const digits = honorCharacters
      ? [...honorCharacters].map(honorTileNumber)
      : [...(match[3] ?? match[1])];

    tokens.push({ type: "tiles", suit, digits, source: match[0] });
    cursor = TILE_PATTERN.lastIndex;
  }

  if (cursor < value.length) tokens.push({ type: "text", value: value.slice(cursor) });
  return tokens;
}
