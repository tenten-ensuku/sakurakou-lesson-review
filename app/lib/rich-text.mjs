const URL_PATTERN = /https?:\/\/[^\s<>"']+/giu;
const IMAGE_PATTERN = /!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/giu;
const TRAILING_PUNCTUATION = /[.,!?;:。、，．！？；：）)\]】}」』〉》]+$/u;

/** @typedef {{ label: string, kind: "youtube" | "external" }} LinkMetadata */
/** @typedef {{ type: "text", value: string } | ({ type: "link", url: string } & LinkMetadata) | { type: "image", url: string, alt: string }} RichTextToken */

/** @returns {LinkMetadata} */
export function linkLabel(url) {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace(/^www\./u, "");

    if (hostname === "youtu.be" || hostname === "youtube.com" || hostname.endsWith(".youtube.com")) {
      return { label: "YouTubeで見る", kind: "youtube" };
    }
    if (hostname === "docs.google.com") {
      if (parsed.pathname.startsWith("/document/")) return { label: "Googleドキュメントを開く", kind: "external" };
      if (parsed.pathname.startsWith("/spreadsheets/")) return { label: "Googleスプレッドシートを開く", kind: "external" };
      if (parsed.pathname.startsWith("/presentation/")) return { label: "Googleスライドを開く", kind: "external" };
    }
    return { label: `${hostname}を開く`, kind: "external" };
  } catch {
    return { label: "参考リンクを開く", kind: "external" };
  }
}

/** @returns {RichTextToken[]} */
export function tokenizeRichText(text) {
  /** @type {RichTextToken[]} */
  const tokens = [];
  let cursor = 0;
  const pattern = new RegExp(`${IMAGE_PATTERN.source}|${URL_PATTERN.source}`, "giu");
  let match;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > cursor) {
      tokens.push({ type: "text", value: text.slice(cursor, match.index) });
    }

    if (match[2]) {
      tokens.push({ type: "image", alt: match[1], url: match[2] });
      cursor = pattern.lastIndex;
      continue;
    }

    const trailing = match[0].match(TRAILING_PUNCTUATION)?.[0] ?? "";
    const url = trailing ? match[0].slice(0, -trailing.length) : match[0];
    const metadata = linkLabel(url);
    tokens.push({ type: "link", url, ...metadata });
    if (trailing) tokens.push({ type: "text", value: trailing });
    cursor = pattern.lastIndex;
  }

  if (cursor < text.length) tokens.push({ type: "text", value: text.slice(cursor) });
  return tokens.length ? tokens : [{ type: "text", value: text }];
}
