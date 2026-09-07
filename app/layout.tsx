import type { Metadata, Viewport } from "next";
import { APP_VERSION } from "./lib/lesson.mjs";
import "./globals.css";

const title = "エンスク授業ノート | 桜紅さん";
const description =
  "授業と問題を探し、迷った内容を解き直す。セオリー図鑑で知識を確認できる桜紅さんの麻雀授業ノート。";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  "https://sakurakou-lesson-review.kobotenmitsu.chatgpt.site/";
const siteOrigin = new URL(siteUrl).origin;

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title,
  description,
  manifest: `${basePath}/manifest.webmanifest?v=${APP_VERSION}`,
  icons: {
    icon: [
      { url: `${basePath}/icons/sakura-32.png`, type: "image/png", sizes: "32x32" },
      { url: `${basePath}/icons/sakura-192.png`, type: "image/png", sizes: "192x192" },
    ],
    shortcut: `${basePath}/icons/sakura-32.png`,
    apple: `${basePath}/icons/sakura-180.png`,
  },
  openGraph: {
    title,
    description,
    type: "website",
    locale: "ja_JP",
    images: [
      {
        url: `${basePath}/og.png`,
        width: 1200,
        height: 630,
        alt: title,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [`${basePath}/og.png`],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#fffdf4",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
