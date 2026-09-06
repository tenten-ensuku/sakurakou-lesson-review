export function materialDetails(resource) {
  let url;
  try {
    url = new URL(resource.url);
  } catch {
    return null;
  }
  if (!["https:", "http:"].includes(url.protocol)) return null;
  const host = url.hostname.replace(/^www\./, "");
  const image = resource.kind === "image";
  const youtube =
    host === "youtu.be" ||
    host === "youtube.com" ||
    host.endsWith(".youtube.com");
  let service = host;
  if (image) service = "画像資料";
  else if (youtube) service = "YouTube";
  else if (host === "docs.google.com") {
    service = url.pathname.startsWith("/document/")
      ? "Googleドキュメント"
      : url.pathname.startsWith("/spreadsheets/")
        ? "Googleスプレッドシート"
        : url.pathname.startsWith("/presentation/")
          ? "Googleスライド"
          : "Google資料";
  } else if (host === "drive.google.com") service = "Googleドライブ";
  return {
    title: resource.label?.trim() || service,
    service,
    action: image ? "画像を見る" : youtube ? "動画を見る" : "読む",
    image,
  };
}
