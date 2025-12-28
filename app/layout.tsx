import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "@/components/auth/SessionProvider";
import { Navigation } from "@/components/Navigation";

export const metadata: Metadata = {
  title: "AI小说创作系统",
  description: "基于AI的智能小说创作系统，支持大纲规划和基于大纲创作",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        <SessionProvider>
          <Navigation />
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
