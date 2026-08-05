import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "麦芽谷 · AI 农场",
  description: "温暖、真实、会呼吸的 3D 智慧农场。",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
