import type { Metadata, Viewport } from "next";
import "./globals.css";

const title = "桜紅さんの授業復習";
const description = "7/21 てんてん先生『蒼嵐戦 牌譜検討』を、23問のフラッシュカードと講義メモで復習できるアプリ。";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  ?? "https://sakurakou-lesson-review.kobotenmitsu.chatgpt.site/";
const siteOrigin = new URL(siteUrl).origin;

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title,
  description,
  manifest: `${basePath}/manifest.webmanifest`,
  icons: {
    icon: `${basePath}/icons/ensuku-192.png`,
    shortcut: `${basePath}/icons/ensuku-192.png`,
    apple: `${basePath}/icons/ensuku-180.png`,
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
  themeColor: "#48d6b0",
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
