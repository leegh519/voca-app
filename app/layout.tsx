import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "공무원 영어 단어장",
  description: "플래시카드와 양방향 4지선다로 공부하는 개인 영어 단어장",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  );
}
