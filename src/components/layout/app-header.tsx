"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GitBranch, LoaderCircle, LogOut } from "lucide-react";
import { useGithubSession } from "@/components/auth/github-session";
import { useLanguage } from "@/components/i18n/language-provider";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import styles from "./app-header.module.css";

export function AppHeader() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { status, user, logout, loggingOut, logoutError } = useGithubSession();
  const pageLabel = pathname === "/dashboard" ? t("대시보드", "Overview")
    : pathname === "/repositories" ? t("저장소", "Repositories")
    : pathname === "/analyze" ? t("새 분석", "New analysis") : t("프로젝트", "Project");

  return <header className={styles.header}>
    <div className={styles.breadcrumb}><span>{t("워크스페이스", "Workspace")}</span><span className={styles.separator}>/</span><strong>{pageLabel}</strong></div>
    <div className={styles.headerActions}>
      {logoutError && <span className={styles.error} role="alert">{logoutError}</span>}
      <LanguageSwitcher />
      {status === "authenticated" && user ? <>
        <Link className={styles.account} href="/connect/github"><GitBranch size={15} aria-hidden="true" /><span>{user.login || user.name || t("GitHub 계정", "GitHub account")}</span></Link>
        <button className={styles.logoutButton} type="button" disabled={loggingOut} onClick={() => void logout()} aria-label={t("GitHub 로그아웃", "Sign out of GitHub")}>{loggingOut ? <LoaderCircle className={styles.spin} size={16} aria-hidden="true" /> : <LogOut size={16} aria-hidden="true" />}<span>{t("로그아웃", "Sign out")}</span></button>
      </> : <Link className={styles.account} href="/connect/github"><GitBranch size={15} aria-hidden="true" /> {t("GitHub 로그인", "GitHub sign-in")}</Link>}
    </div>
  </header>;
}
