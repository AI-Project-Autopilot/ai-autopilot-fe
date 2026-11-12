"use client";

import { useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, GitBranch, LoaderCircle, RefreshCw, ShieldCheck } from "lucide-react";
import { GithubSessionProvider, useGithubSession } from "@/components/auth/github-session";
import { getGithubLoginUrl } from "@/lib/api/github-connect-api";
import styles from "./page.module.css";

const oauthErrors: Record<string, string> = {
  github_login_cancelled: "GitHub 로그인이 취소되었습니다. 다시 시도할 수 있습니다.",
  github_auth_failed: "GitHub 인증에 실패했습니다. 잠시 후 다시 시도해 주세요.",
  github_access_denied: "GitHub 권한 승인이 거절되었습니다.",
  access_denied: "GitHub 권한 승인이 취소되었습니다.",
};

function subscribeToLocation(callback: () => void) {
  window.addEventListener("popstate", callback);
  return () => window.removeEventListener("popstate", callback);
}

function getOAuthError() {
  return new URLSearchParams(window.location.search).get("error");
}

function GithubConnectContent() {
  const router = useRouter();
  const { status, user, checkSession } = useGithubSession();
  const oauthError = useSyncExternalStore(subscribeToLocation, getOAuthError, () => null);
  const oauthNotice = oauthError
    ? oauthErrors[oauthError] ?? "GitHub 인증을 완료하지 못했습니다. 다시 시도해 주세요."
    : null;

  useEffect(() => {
    if (status === "authenticated" && user) router.replace("/dashboard");
  }, [router, status, user]);

  return <main className={styles.screen}>
    <div className={styles.container}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}>autopilot<span>.</span></Link>
        <span className={styles.topLabel}>GitHub 연결</span>
      </header>
      <div className={styles.card}>
        <div className={styles.iconBox}><GitBranch size={30} aria-hidden="true" /></div>
        <p className={styles.eyebrow}>CONNECT YOUR ACCOUNT</p>
        <h1>GitHub 계정 연결</h1>
        <p className={styles.description}>GitHub에 로그인하면 대시보드에서 내 저장소를 선택하고 분석을 시작할 수 있어요.</p>

        {oauthNotice && <div className={styles.alert} role="alert">{oauthNotice}</div>}
        {status === "loading" && <div className={styles.loading} role="status"><LoaderCircle className={styles.spin} size={18} aria-hidden="true" /> 로그인 상태를 확인하고 있어요…</div>}
        {(status === "unauthenticated" || status === "error") && <div className={styles.stack}>
          {status === "error" && <>
            <div className={styles.alert} role="alert">로그인 상태를 확인할 수 없습니다. 연결 상태를 확인하고 다시 시도해 주세요.</div>
            <button type="button" className={styles.secondaryButton} onClick={() => void checkSession()}><RefreshCw size={16} aria-hidden="true" /> 다시 확인하기</button>
          </>}
          <a className={styles.primaryButton} href={getGithubLoginUrl()}><GitBranch size={19} aria-hidden="true" /> GitHub로 로그인 <ArrowRight size={17} aria-hidden="true" /></a>
          <p className={styles.hint}>저장소 접근 권한은 GitHub의 승인 화면에서 확인할 수 있습니다.</p>
        </div>}
        {status === "authenticated" && user && <div className={styles.stack}>
          <div className={styles.loading} role="status"><CheckCircle2 size={18} aria-hidden="true" /> 로그인이 완료되었습니다. 대시보드로 이동하고 있어요…</div>
          <Link className={styles.primaryButton} href="/dashboard">대시보드에서 저장소 선택하기 <ArrowRight size={17} aria-hidden="true" /></Link>
        </div>}
      </div>
      <footer className={styles.footer}><ShieldCheck size={16} aria-hidden="true" /> 인증 정보는 서버에서 관리합니다. <Link href="/">서비스 소개</Link></footer>
    </div>
  </main>;
}

export default function GithubConnectPage() {
  return <GithubSessionProvider><GithubConnectContent /></GithubSessionProvider>;
}
