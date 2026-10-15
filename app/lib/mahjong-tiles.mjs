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

// A trailing suit also applies to numbers joined by a range or list marker.
// Ranges keep their endpoints (2～7s => 2s～7s), never expand to six tiles.
const TILE_PATTERN = /([1-9１-９]+(?:[ \t　]*[～〜~・･-][ \t　]*[1-9１-９]+)*)\s*([mpsｍｐｓ])|([1-7１-７]+(?:[ \t　]*[～〜~・･-][ \t　]*[1-7１-７]+)*)\s*([zｚ])|([東南西北白發発中]{2,})|(?<![\p{L}\p{N}])([東南西北白發発中])(?![\p{L}\p{N}])/giu;

export function tokenizeMahjongText(value) {
  const tokens = [];
  let cursor = 0;
  let match;

  TILE_PATTERN.lastIndex = 0;
  while ((match = TILE_PATTERN.exec(value))) {
    if (match.index > cursor) tokens.push({ type: "text", value: value.slice(cursor, match.index) });

    const honorCharacters = match[5] ?? match[6];
    // Normalize only tile captures, preserving the original editor text and offsets.
    const suit = honorCharacters ? "ji" : (match[4] ? "ji" : match[2].normalize("NFKC").toLowerCase());
    const numbers = match[3] ?? match[1];
    const groups = numbers ? [...numbers.matchAll(/[1-9１-９]+/gu)] : [];
    if (groups.length > 1) {
      let groupEnd = 0;
      for (const [index, group] of groups.entries()) {
        if (group.index > groupEnd) tokens.push({ type: "text", value: numbers.slice(groupEnd, group.index) });
        const digits = [...group[0].normalize("NFKC")];
        // Keep each original substring recoverable; add the inherited suit to alt text.
        const suffix = index === groups.length - 1 ? match[0].slice(numbers.length) : "";
        tokens.push({ type: "tiles", suit, digits, source: group[0] + suffix, label: digits.join("") + (suit === "ji" ? "z" : suit) });
        groupEnd = group.index + group[0].length;
      }
    } else {
      const digits = honorCharacters ? [...honorCharacters].map(honorTileNumber) : [...numbers.normalize("NFKC")];
      tokens.push({ type: "tiles", suit, digits, source: match[0] });
    }
    cursor = TILE_PATTERN.lastIndex;
  }

  if (cursor < value.length) tokens.push({ type: "text", value: value.slice(cursor) });
  return tokens;
}
