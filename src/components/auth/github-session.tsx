"use client";

import Link from "next/link";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ArrowRight, GitBranch, LoaderCircle, RefreshCw, ShieldCheck } from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";
import {
  ApiError,
  fetchCurrentUser,
  GITHUB_ANALYSIS_STORAGE_KEY,
  logoutGithub,
  type GithubUser,
} from "@/lib/api/github-connect-api";
import styles from "./github-session.module.css";

type SessionStatus = "loading" | "authenticated" | "unauthenticated" | "error";

type GithubSession = {
  status: SessionStatus;
  user: GithubUser | null;
  checkSession: () => Promise<void>;
  markUnauthenticated: () => void;
  logout: () => Promise<void>;
  loggingOut: boolean;
  logoutError: string | null;
};

const GithubSessionContext = createContext<GithubSession | null>(null);

export function getGithubAccountKey(user: GithubUser | null): string | null {
  if (!user) return null;
  if (user.id !== undefined && user.id !== "") return `id:${String(user.id)}`;
  return user.login ? `login:${user.login}` : null;
}

function clearStoredAnalysis() {
  try {
    window.sessionStorage.removeItem(GITHUB_ANALYSIS_STORAGE_KEY);
  } catch {
    // Session state must still clear when browser storage is unavailable.
  }
}

export function GithubSessionProvider({ children }: { children: ReactNode }) {
  const { t } = useLanguage();
  const [status, setStatus] = useState<SessionStatus>("loading");
  const [user, setUser] = useState<GithubUser | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutFailed, setLogoutFailed] = useState(false);
  const logoutError = logoutFailed ? t("로그아웃하지 못했습니다. 다시 시도해 주세요.", "Could not sign out. Please try again.") : null;
  const sessionRequest = useRef<AbortController | null>(null);
  const logoutRequest = useRef<AbortController | null>(null);

  const markUnauthenticated = useCallback(() => {
    sessionRequest.current?.abort();
    logoutRequest.current?.abort();
    clearStoredAnalysis();
    setUser(null);
    setStatus("unauthenticated");
    setLoggingOut(false);
    setLogoutFailed(false);
  }, []);

  const loadSession = useCallback(() => {
    if (logoutRequest.current && !logoutRequest.current.signal.aborted) return Promise.resolve();
    sessionRequest.current?.abort();
    const controller = new AbortController();
    sessionRequest.current = controller;
    return fetchCurrentUser(controller.signal).then((currentUser) => {
      if (controller.signal.aborted) return;
      if (!currentUser) {
        markUnauthenticated();
        return;
      }
      setUser(currentUser);
      setStatus("authenticated");
    }).catch(() => {
      if (controller.signal.aborted) return;
      setUser(null);
      setStatus("error");
    });
  }, [markUnauthenticated]);

  const checkSession = useCallback(async () => {
    if (logoutRequest.current && !logoutRequest.current.signal.aborted) return;
    setUser(null);
    setStatus("loading");
    await loadSession();
  }, [loadSession]);

  useEffect(() => {
    const handleFocus = () => { void loadSession(); };
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) void loadSession();
    };
    window.addEventListener("focus", handleFocus);
    window.addEventListener("pageshow", handlePageShow);
    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [loadSession]);

  useEffect(() => {
    void loadSession();
    return () => {
      sessionRequest.current?.abort();
      logoutRequest.current?.abort();
    };
  }, [loadSession]);

  const logout = useCallback(async () => {
    if (logoutRequest.current && !logoutRequest.current.signal.aborted) return;
    sessionRequest.current?.abort();
    const controller = new AbortController();
    logoutRequest.current = controller;
    setLoggingOut(true);
    setLogoutFailed(false);
    try {
      await logoutGithub(controller.signal);
      if (!controller.signal.aborted) markUnauthenticated();
    } catch (error) {
      if (controller.signal.aborted) return;
      if (error instanceof ApiError && error.status === 401) {
        markUnauthenticated();
      } else {
        setLogoutFailed(true);
      }
    } finally {
      if (logoutRequest.current === controller) {
        logoutRequest.current = null;
        if (!controller.signal.aborted) setLoggingOut(false);
      }
    }
  }, [markUnauthenticated]);

  return <GithubSessionContext.Provider value={{ status, user, checkSession, markUnauthenticated, logout, loggingOut, logoutError }}>
    {children}
  </GithubSessionContext.Provider>;
}

export function useGithubSession(): GithubSession {
  const session = useContext(GithubSessionContext);
  if (!session) throw new Error("useGithubSession requires GithubSessionProvider");
  return session;
}

export function GithubSessionGate({ children }: { children: ReactNode }) {
  const { status, checkSession, loggingOut } = useGithubSession();
  const { t } = useLanguage();

  if (status === "authenticated" && !loggingOut) return children;

  if (status === "loading" || loggingOut) {
    return <section className={styles.loading} role="status" aria-live="polite">
      <LoaderCircle className={styles.spin} size={24} aria-hidden="true" />
      <p>{loggingOut ? t("로그아웃하고 있어요…", "Signing out…") : t("GitHub 로그인 상태를 확인하고 있어요…", "Checking your GitHub session…")}</p>
    </section>;
  }

  const failed = status === "error";
  return <section className={styles.gate} aria-labelledby="session-heading">
    <span className={styles.eyebrow}>{t("내 워크스페이스", "YOUR WORKSPACE")}</span>
    <div className={styles.icon}><GitBranch size={32} aria-hidden="true" /></div>
    <h1 id="session-heading">{failed ? t("로그인 상태를 확인할 수 없어요", "We could not check your session") : t("프로젝트의 다음 단계를, 함께.", "Find your project's next step.")}</h1>
    <p>{failed
      ? t("서버에 연결하지 못했습니다. 연결 상태를 확인하고 다시 시도해 주세요.", "Could not connect to the server. Check your connection and try again.")
      : t("GitHub에 로그인하면 내 저장소를 불러오고, 코드에 근거한 개선 방향을 확인할 수 있어요.", "Sign in with GitHub to see your repositories and explore improvements grounded in your code.")}</p>
    <div className={styles.actions}>
      {failed && <button className={styles.primaryButton} type="button" onClick={() => void checkSession()}><RefreshCw size={16} aria-hidden="true" /> {t("다시 확인하기", "Try again")}</button>}
      <Link className={failed ? styles.secondaryButton : styles.primaryButton} href="/connect/github"><GitBranch size={17} aria-hidden="true" /> {t("GitHub로 시작하기", "Get started with GitHub")} <ArrowRight size={16} aria-hidden="true" /></Link>
    </div>
    <span className={styles.note}><ShieldCheck size={15} aria-hidden="true" /> {t("로그인 전에는 저장소나 분석 결과가 표시되지 않습니다.", "Your repositories and analysis appear only after you sign in.")}</span>
    <Link className={styles.aboutLink} href="/">{t("서비스 알아보기", "Explore Autopilot")} <ArrowRight size={14} aria-hidden="true" /></Link>
  </section>;
}
