import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Project Autopilot",
  description: "GitHub 저장소의 문서와 코드를 분석하고, 코드 근거와 함께 다음 개발 방향을 정리하세요.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
