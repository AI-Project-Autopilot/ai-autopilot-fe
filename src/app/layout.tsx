import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Project Autopilot",
  description: "Plan your next repository improvement with AI Project Autopilot.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}