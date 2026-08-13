import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "yagura-defense — やぐらディフェンス",
  description:
    "矢倉を建てて本丸を守る和風タワーディフェンス。タップ / クリックだけで遊べます。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // ダブルタップズームで誤操作しないよう固定(F-09)
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
