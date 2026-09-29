// Current origin returned by Sites for the same project on 2026-09-29.
export const SITE_ORIGIN = "https://sakurakou-lesson-review.tentensuku.chatgpt.site";
export const LEGACY_SITE_ORIGIN = "https://sakurakou-lesson-review.kobotenmitsu.chatgpt.site";

// Display/request boundary only: never change stored editor content or resource IDs.
export function resolveSiteUrl(value) {
  if (typeof value !== "string" || !value) return value;
  try {
    const url = new URL(value);
    if (url.origin !== LEGACY_SITE_ORIGIN || url.username || url.password) return value;
    return SITE_ORIGIN + url.pathname + url.search + url.hash;
  } catch { return value; }
}
