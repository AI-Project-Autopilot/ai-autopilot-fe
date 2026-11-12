"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, CirclePlus, Command, GitBranch, LayoutDashboard } from "lucide-react";
import { useGithubSession } from "@/components/auth/github-session";
import styles from "./app-sidebar.module.css";

const navigation = [
  { href: "/dashboard", label: "대시보드", icon: LayoutDashboard },
  { href: "/repositories", label: "저장소", icon: GitBranch },
  { href: "/analyze", label: "새 분석", icon: CirclePlus },
  { href: "/connect/github", label: "GitHub 연결", icon: GitBranch },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { status, user } = useGithubSession();
  const displayName = user?.name || user?.login || "GitHub 사용자";

  return <aside className={styles.sidebar} aria-label="주요 메뉴">
    <Link className={styles.brand} href="/" aria-label="AI Project Autopilot 서비스 소개">
      <span className={styles.brandMark}><Command size={19} aria-hidden="true" /></span>
      <span className={styles.brandName}>autopilot<span>.</span></span>
    </Link>
    <nav className={styles.nav}>
      <div className={styles.navLabel}>WORKSPACE</div>
      {navigation.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return <Link key={href} href={href} className={`${styles.navLink}${active ? ` ${styles.active}` : ""}`} aria-current={active ? "page" : undefined}>
          <Icon size={17} strokeWidth={1.8} aria-hidden="true" /><span>{label}</span>
        </Link>;
      })}
      <Link className={`${styles.navLink} ${styles.aboutLink}`} href="/"><ArrowUpRight size={17} aria-hidden="true" /><span>서비스 소개</span></Link>
    </nav>
    <div className={styles.sidebarFooter}>
      {status === "authenticated" && user ? <>
        <div className={styles.avatar}>{displayName.charAt(0).toUpperCase()}</div>
        <div className={styles.profileText}><strong>{displayName}</strong><span>{user.login ? `@${user.login}` : "GitHub 로그인됨"}</span></div>
        <span className={styles.onlineDot} aria-label="GitHub 로그인됨" />
      </> : <Link className={styles.loginLink} href="/connect/github"><GitBranch size={18} aria-hidden="true" /><span>{status === "loading" ? "로그인 확인 중…" : status === "error" ? "GitHub 연결 확인 필요" : "GitHub로 시작하기"}</span></Link>}
    </div>
  </aside>;
}
