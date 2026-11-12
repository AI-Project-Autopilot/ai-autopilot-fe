import type { Metadata } from "next";
import { LandingView } from "@/features/landing/landing-view";

export const metadata: Metadata = {
  title: "AI Project Autopilot | 코드에서 다음 할 일까지",
  description: "GitHub 저장소의 문서와 코드를 바탕으로, 근거 있는 개선 방향과 구체적인 개발 항목을 만나보세요.",
};

export default function HomePage() {
  return <LandingView />;
}
