"use client";

import { useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, GitBranch, LoaderCircle, RefreshCw, ShieldCheck } from "lucide-react";
import { GithubSessionProvider, useGithubSession } from "@/components/auth/github-session";
import { useLanguage } from "@/components/i18n/language-provider";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { getGithubLoginUrl } from "@/lib/api/github-connect-api";
import styles from "./page.module.css";

const oauthErrors: Record<string, [string, string]> = {
  github_login_cancelled: ["GitHub 로그인이 취소되었습니다. 다시 시도할 수 있습니다.", "GitHub sign-in was canceled. You can try again."],
  github_auth_failed: ["GitHub 인증에 실패했습니다. 잠시 후 다시 시도해 주세요.", "GitHub authentication failed. Please try again shortly."],
  github_access_denied: ["GitHub 권한 승인이 거절되었습니다.", "GitHub access was denied."],
  access_denied: ["GitHub 권한 승인이 취소되었습니다.", "GitHub authorization was canceled."],
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
  const { t } = useLanguage();
  const oauthError = useSyncExternalStore(subscribeToLocation, getOAuthError, () => null);
  const oauthNotice = oauthError
    ? t(...(oauthErrors[oauthError] ?? ["GitHub 인증을 완료하지 못했습니다. 다시 시도해 주세요.", "GitHub authentication could not be completed. Please try again."]))
    : null;

  useEffect(() => {
    if (status === "authenticated" && user) router.replace("/dashboard");
  }, [router, status, user]);

  return <main className={styles.screen}>
    <div className={styles.container}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}>autopilot<span>.</span></Link>
        <div className={styles.headerControls}><span className={styles.topLabel}>{t("GitHub 연결", "Connect GitHub")}</span><LanguageSwitcher /></div>
      </header>
      <div className={styles.card}>
        <div className={styles.iconBox}><GitBranch size={30} aria-hidden="true" /></div>
        <p className={styles.eyebrow}>{t("계정 연결", "CONNECT YOUR ACCOUNT")}</p>
        <h1>{t("GitHub 계정 연결", "Connect your GitHub account")}</h1>
        <p className={styles.description}>{t("GitHub에 로그인하고 저장소를 선택해 분석을 시작하세요.", "Sign in with GitHub, choose a repository, and start an analysis.")}</p>

        {oauthNotice && <div className={styles.alert} role="alert">{oauthNotice}</div>}
        {status === "loading" && <div className={styles.loading} role="status"><LoaderCircle className={styles.spin} size={18} aria-hidden="true" /> {t("로그인 상태를 확인하고 있어요…", "Checking your sign-in status…")}</div>}
        {(status === "unauthenticated" || status === "error") && <div className={styles.stack}>
          {status === "error" && <>
            <div className={styles.alert} role="alert">{t("로그인 상태를 확인할 수 없습니다. 연결 상태를 확인하고 다시 시도해 주세요.", "We could not check your sign-in status. Check your connection and try again.")}</div>
            <button type="button" className={styles.secondaryButton} onClick={() => void checkSession()}><RefreshCw size={16} aria-hidden="true" /> {t("다시 확인하기", "Check again")}</button>
          </>}
          <a className={styles.primaryButton} href={getGithubLoginUrl()}><GitBranch size={19} aria-hidden="true" /> {t("GitHub로 로그인", "Sign in with GitHub")} <ArrowRight size={17} aria-hidden="true" /></a>
          <p className={styles.hint}>{t("저장소 접근 권한은 GitHub의 승인 화면에서 확인할 수 있습니다.", "Review repository access on GitHub's authorization screen.")}</p>
        </div>}
        {status === "authenticated" && user && <div className={styles.stack}>
          <div className={styles.loading} role="status"><CheckCircle2 size={18} aria-hidden="true" /> {t("로그인이 완료되었습니다. 대시보드로 이동하고 있어요…", "You're signed in. Opening your dashboard…")}</div>
          <Link className={styles.primaryButton} href="/dashboard">{t("대시보드로 이동", "Open dashboard")} <ArrowRight size={17} aria-hidden="true" /></Link>
        </div>}
      </div>
      <footer className={styles.footer}><ShieldCheck size={16} aria-hidden="true" /> {t("인증 정보는 서버에서 관리합니다.", "Your credentials are managed on the server.")} <Link href="/">{t("서비스 소개", "About Autopilot")}</Link></footer>
    </div>
  </main>;
}

export default function GithubConnectPage() {
  return <GithubSessionProvider><GithubConnectContent /></GithubSessionProvider>;
}
