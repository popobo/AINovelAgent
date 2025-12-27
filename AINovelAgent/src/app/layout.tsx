import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "墨韵 AI - 智能小说续写与同人创作",
  description: "利用AI技术进行长篇小说续写和同人小说创作的智能平台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;500;600;700&family=ZCOOL+XiaoWei&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}

