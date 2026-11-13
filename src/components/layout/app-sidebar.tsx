"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, CirclePlus, Command, GitBranch, LayoutDashboard } from "lucide-react";
import { useGithubSession } from "@/components/auth/github-session";
import { useLanguage } from "@/components/i18n/language-provider";
import styles from "./app-sidebar.module.css";

const navigation = [
  { href: "/dashboard", ko: "대시보드", en: "Overview", icon: LayoutDashboard },
  { href: "/repositories", ko: "저장소", en: "Repositories", icon: GitBranch },
  { href: "/analyze", ko: "새 분석", en: "New analysis", icon: CirclePlus },
  { href: "/connect/github", ko: "GitHub 연결", en: "GitHub connection", icon: GitBranch },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { status, user } = useGithubSession();
  const displayName = user?.name || user?.login || t("GitHub 사용자", "GitHub user");

  return <aside className={styles.sidebar} aria-label={t("주요 메뉴", "Main navigation")}>
    <Link className={styles.brand} href="/" aria-label={t("AI Project Autopilot 서비스 소개", "About AI Project Autopilot")}>
      <span className={styles.brandMark}><Command size={19} aria-hidden="true" /></span>
      <span className={styles.brandName}>autopilot<span>.</span></span>
    </Link>
    <nav className={styles.nav}>
      <div className={styles.navLabel}>{t("워크스페이스", "WORKSPACE")}</div>
      {navigation.map(({ href, ko, en, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return <Link key={href} href={href} className={`${styles.navLink}${active ? ` ${styles.active}` : ""}`} aria-current={active ? "page" : undefined}>
          <Icon size={17} strokeWidth={1.8} aria-hidden="true" /><span>{t(ko, en)}</span>
        </Link>;
      })}
      <Link className={`${styles.navLink} ${styles.aboutLink}`} href="/"><ArrowUpRight size={17} aria-hidden="true" /><span>{t("서비스 소개", "About Autopilot")}</span></Link>
    </nav>
    <div className={styles.sidebarFooter}>
      {status === "authenticated" && user ? <>
        <div className={styles.avatar}>{displayName.charAt(0).toUpperCase()}</div>
        <div className={styles.profileText}><strong>{displayName}</strong><span>{user.login ? `@${user.login}` : t("GitHub 로그인됨", "Signed in to GitHub")}</span></div>
        <span className={styles.onlineDot} aria-label={t("GitHub 로그인됨", "Signed in to GitHub")} />
      </> : <Link className={styles.loginLink} href="/connect/github"><GitBranch size={18} aria-hidden="true" /><span>{status === "loading" ? t("로그인 확인 중…", "Checking session…") : status === "error" ? t("GitHub 연결 확인 필요", "Check GitHub connection") : t("GitHub로 시작하기", "Get started with GitHub")}</span></Link>}
    </div>
  </aside>;
}
