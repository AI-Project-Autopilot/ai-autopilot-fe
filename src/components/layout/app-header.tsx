"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GitBranch, LoaderCircle, LogOut } from "lucide-react";
import { useGithubSession } from "@/components/auth/github-session";
import styles from "./app-header.module.css";

export function AppHeader() {
  const pathname = usePathname();
  const { status, user, logout, loggingOut, logoutError } = useGithubSession();
  const pageLabel = pathname === "/dashboard" ? "대시보드"
    : pathname === "/repositories" ? "저장소"
    : pathname === "/analyze" ? "새 분석" : "프로젝트";

  return <header className={styles.header}>
    <div className={styles.breadcrumb}><span>워크스페이스</span><span className={styles.separator}>/</span><strong>{pageLabel}</strong></div>
    <div className={styles.headerActions}>
      {logoutError && <span className={styles.error} role="alert">{logoutError}</span>}
      {status === "authenticated" && user ? <>
        <Link className={styles.account} href="/connect/github"><GitBranch size={15} aria-hidden="true" /><span>{user.login || user.name || "GitHub 계정"}</span></Link>
        <button className={styles.logoutButton} type="button" disabled={loggingOut} onClick={() => void logout()} aria-label="GitHub 로그아웃">{loggingOut ? <LoaderCircle className={styles.spin} size={16} aria-hidden="true" /> : <LogOut size={16} aria-hidden="true" />}<span>로그아웃</span></button>
      </> : <Link className={styles.account} href="/connect/github"><GitBranch size={15} aria-hidden="true" /> GitHub 로그인</Link>}
    </div>
  </header>;
}
