"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  GitBranch,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  ApiError,
  analyzeGithubRepository,
  fetchCurrentUser,
  fetchGithubRepositories,
  GITHUB_ANALYSIS_STORAGE_KEY,
  getGithubLoginUrl,
  logoutGithub,
  type GithubRepository,
  type GithubUser,
} from "@/lib/api/github-connect-api";
import styles from "./page.module.css";

type SessionState = "loading" | "guest" | "authenticated" | "error";
type RepositoryState = "idle" | "loading" | "done" | "error";
type AnalysisState = "idle" | "loading" | "done" | "error";

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

function apiErrorMessage(error: unknown, action: string): string {
  if (error instanceof ApiError) {
    if (error.status === 400) return action === "저장소 조회" ? "저장소 페이지 번호가 올바르지 않습니다. 목록을 새로고침해 주세요." : `${action} 요청이 올바르지 않습니다.`;
    if (error.status === 401) return "GitHub에 다시 로그인해 주세요. 연결이 만료되었거나 해제되었습니다.";
    if (error.status === 403) return "저장소 접근 권한이 없습니다. GitHub에서 권한을 다시 승인하거나 조직의 접근 정책을 확인해 주세요.";
    if (error.status === 429) return "GitHub 요청 한도에 도달했습니다. 잠시 후 다시 시도해 주세요.";
    if (error.status === 502) return "GitHub에서 저장소를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";
  }
  return `${action}에 실패했습니다. 잠시 후 다시 시도해 주세요.`;
}

function analysisErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const messages: Record<number, string> = {
      400: "분석 요청이 올바르지 않습니다. 목표를 2,000자 이내로 입력해 주세요.",
      401: "GitHub 연결이 만료되었습니다. 다시 로그인해 주세요.",
      403: "선택한 저장소를 읽을 권한이 없습니다. GitHub 권한을 다시 확인해 주세요.",
      404: "저장소를 찾을 수 없습니다. 목록을 새로고침해 주세요.",
      409: "이미 분석이 진행 중입니다. 잠시 후 다시 시도해 주세요.",
      422: "분석할 수 있는 문서나 코드가 없습니다. 다른 저장소를 선택해 주세요.",
      429: "요청이 많습니다. 잠시 후 다시 분석해 주세요.",
      502: "분석 결과를 받지 못했습니다. 잠시 후 다시 시도해 주세요.",
      503: "현재 분석 서비스를 사용할 수 없습니다. 잠시 후 다시 시도해 주세요.",
      504: "분석 시간이 초과되었습니다. 목표를 좁혀 다시 시도해 주세요.",
    };
    return messages[error.status] ?? "저장소 분석에 실패했습니다. 잠시 후 다시 시도해 주세요.";
  }
  if (error instanceof Error && error.name === "TimeoutError") {
    return "분석 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.";
  }
  return "분석을 완료하지 못했습니다. 연결 상태를 확인하고 다시 시도해 주세요.";
}

export default function GithubConnectPage() {
  const router = useRouter();
  const [session, setSession] = useState<SessionState>("loading");
  const [user, setUser] = useState<GithubUser | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [repositories, setRepositories] = useState<GithubRepository[]>([]);
  const [repositoryState, setRepositoryState] = useState<RepositoryState>("idle");
  const [repositoryError, setRepositoryError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [privateRepositoriesIncluded, setPrivateRepositoriesIncluded] = useState<boolean | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [goal, setGoal] = useState("");
  const [analysisState, setAnalysisState] = useState<AnalysisState>("idle");
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const analysisRequest = useRef<AbortController | null>(null);
  const analysisVersion = useRef(0);
  const sessionRequest = useRef<AbortController | null>(null);
  const repositoryRequest = useRef<AbortController | null>(null);
  const logoutRequest = useRef<AbortController | null>(null);
  const accountVersion = useRef(0);
  const oauthError = useSyncExternalStore(subscribeToLocation, getOAuthError, () => null);
  const oauthNotice = oauthError
    ? oauthErrors[oauthError] ?? "GitHub 인증을 완료하지 못했습니다. 다시 시도해 주세요."
    : null;
  const selectedRepository = repositories.find((repository) => repository.id === selectedId);

  const clearAnalysis = useCallback(() => {
    analysisVersion.current++;
    analysisRequest.current?.abort();
    setAnalysisError(null);
    setAnalysisState("idle");
  }, []);

  const clearRepositories = useCallback(() => {
    clearAnalysis();
    setGoal("");
    setRepositories([]);
    setRepositoryState("idle");
    setRepositoryError(null);
    setPage(0);
    setHasNextPage(false);
    setPrivateRepositoriesIncluded(null);
    setSelectedId(null);
  }, [clearAnalysis]);

  const refreshRepositories = useCallback(async (nextPage = 1) => {
    repositoryRequest.current?.abort();
    const controller = new AbortController();
    repositoryRequest.current = controller;
    const version = accountVersion.current;
    setRepositoryState("loading");
    setRepositoryError(null);
    if (nextPage === 1) {
      clearAnalysis();
      setRepositories([]);
      setSelectedId(null);
      setPage(0);
      setHasNextPage(false);
      setPrivateRepositoriesIncluded(null);
    }
    try {
      const data = await fetchGithubRepositories(nextPage, controller.signal);
      if (controller.signal.aborted || version !== accountVersion.current) return;
      setRepositories((previous) => {
        const combined = nextPage === 1 ? data.items : [...previous, ...data.items];
        return [...new Map(combined.map((item) => [item.id, item])).values()];
      });
      setPage(data.page);
      setHasNextPage(data.hasNextPage);
      setPrivateRepositoriesIncluded(data.privateRepositoriesIncluded);
      setRepositoryState("done");
    } catch (error) {
      if (controller.signal.aborted || version !== accountVersion.current) return;
      if (error instanceof ApiError && error.status === 401) {
        accountVersion.current++;
        sessionRequest.current?.abort();
        setUser(null);
        setSession("guest");
        clearRepositories();
        setNotice(apiErrorMessage(error, "저장소 조회"));
        return;
      }
      setRepositoryState("error");
      setRepositoryError(apiErrorMessage(error, "저장소 조회"));
    }
  }, [clearAnalysis, clearRepositories]);

  const refreshSession = useCallback(async () => {
    clearAnalysis();
    sessionRequest.current?.abort();
    repositoryRequest.current?.abort();
    const controller = new AbortController();
    sessionRequest.current = controller;
    const version = ++accountVersion.current;
    try {
      const currentUser = await fetchCurrentUser(controller.signal);
      if (controller.signal.aborted || version !== accountVersion.current) return;
      setNotice(null);
      setUser(currentUser);
      setSession(currentUser ? "authenticated" : "guest");
      if (currentUser) await refreshRepositories();
      else clearRepositories();
    } catch (error) {
      if (controller.signal.aborted || version !== accountVersion.current) return;
      setUser(null);
      clearRepositories();
      setSession("error");
      setNotice(apiErrorMessage(error, "로그인 상태 확인"));
    }
  }, [clearAnalysis, clearRepositories, refreshRepositories]);

  useEffect(() => {
    const controller = new AbortController();
    sessionRequest.current = controller;
    const version = ++accountVersion.current;
    void fetchCurrentUser(controller.signal).then(async (currentUser) => {
      if (controller.signal.aborted || version !== accountVersion.current) return;
      setUser(currentUser);
      setSession(currentUser ? "authenticated" : "guest");
      if (currentUser) await refreshRepositories();
      else clearRepositories();
    }).catch((error: unknown) => {
      if (controller.signal.aborted || version !== accountVersion.current) return;
      setUser(null);
      clearRepositories();
      setSession("error");
      setNotice(apiErrorMessage(error, "로그인 상태 확인"));
    });
    return () => {
      controller.abort();
      repositoryRequest.current?.abort();
      logoutRequest.current?.abort();
      analysisRequest.current?.abort();
    };
  }, [clearRepositories, refreshRepositories]);

  function handleRepositorySelection(repositoryId: string) {
    if (repositoryId === selectedId) return;
    clearAnalysis();
    setGoal("");
    setSelectedId(repositoryId);
  }

  async function handleAnalysis() {
    if (!selectedRepository || loggingOut || analysisState === "loading") return;
    analysisRequest.current?.abort();
    const controller = new AbortController();
    analysisRequest.current = controller;
    const version = ++analysisVersion.current;
    const account = accountVersion.current;
    setAnalysisError(null);
    setAnalysisState("loading");
    try {
      const result = await analyzeGithubRepository(selectedRepository.id, goal, controller.signal);
      if (controller.signal.aborted || version !== analysisVersion.current || account !== accountVersion.current) return;
      window.sessionStorage.setItem(GITHUB_ANALYSIS_STORAGE_KEY, JSON.stringify({
        repositoryId: selectedRepository.id,
        analysis: result,
      }));
      setAnalysisState("done");
      router.push("/connect/github/analysis");
    } catch (error) {
      if (controller.signal.aborted || version !== analysisVersion.current || account !== accountVersion.current) return;
      if (error instanceof ApiError && error.status === 401) {
        accountVersion.current++;
        sessionRequest.current?.abort();
        repositoryRequest.current?.abort();
        setUser(null);
        clearRepositories();
        setSession("guest");
        setNotice(analysisErrorMessage(error));
        return;
      }
      setAnalysisError(analysisErrorMessage(error));
      setAnalysisState("error");
    }
  }

  async function handleLogout() {
    if (loggingOut) return;
    clearAnalysis();
    accountVersion.current++;
    sessionRequest.current?.abort();
    repositoryRequest.current?.abort();
    const controller = new AbortController();
    logoutRequest.current = controller;
    const version = accountVersion.current;
    setLoggingOut(true);
    setNotice(null);
    setRepositoryState("done");
    try {
      await logoutGithub(controller.signal);
      if (controller.signal.aborted || version !== accountVersion.current) return;
      window.sessionStorage.removeItem(GITHUB_ANALYSIS_STORAGE_KEY);
      setUser(null);
      clearRepositories();
      setSession("guest");
    } catch (error) {
      if (controller.signal.aborted || version !== accountVersion.current) return;
      setNotice(apiErrorMessage(error, "로그아웃"));
    } finally {
      if (!controller.signal.aborted && version === accountVersion.current) setLoggingOut(false);
    }
  }

  return (
    <main className={styles.screen}>
      <div className={styles.container}>
        <header className={styles.header}>
          <Link href="/dashboard" className={styles.brand}>autopilot<span>.</span></Link>
          <span className={styles.topLabel}>GitHub 연결</span>
        </header>
        <div className={styles.card}>
          <div className={styles.iconBox}><GitBranch size={30} aria-hidden="true" /></div>
          <p className={styles.eyebrow}>CONNECT YOUR ACCOUNT</p>
          <h1>GitHub 계정 연결</h1>
          <p className={styles.description}>GitHub에 로그인하고 작업할 저장소를 선택하세요. 연결한 계정으로 접근할 수 있는 저장소를 불러옵니다.</p>

          {oauthNotice || notice ? <div className={styles.alert} role="alert">{oauthNotice || notice}</div> : null}
          {session === "loading" && <div className={styles.loading} role="status"><LoaderCircle className={styles.spin} size={18} /> 로그인 상태를 확인하고 있어요…</div>}
          {session === "error" && <button type="button" className={styles.secondaryButton} onClick={() => { setSession("loading"); void refreshSession(); }}><RefreshCw size={16} /> 다시 확인</button>}
          {(session === "guest" || session === "error") && <div className={styles.stack}>
            <a className={styles.primaryButton} href={getGithubLoginUrl()}><GitBranch size={19} /> GitHub로 로그인 <ArrowRight size={17} /></a>
            <p className={styles.hint}>저장소 접근 권한은 GitHub의 승인 화면에서 확인할 수 있습니다.</p>
          </div>}

          {session === "authenticated" && user && <div className={styles.stack}>
            <div className={styles.userCard}>
              <div className={styles.avatar}>{(user.name || user.login || "G").charAt(0).toUpperCase()}</div>
              <div className={styles.userInfo}><strong>{user.name || user.login || "GitHub 사용자"}</strong><span>{user.login ? `@${user.login}` : user.email || "GitHub 로그인 완료"}</span></div>
              <span className={styles.connected}><CheckCircle2 size={15} /> 연결됨</span>
            </div>
            <div className={styles.sectionHeading}><h2>저장소 선택</h2><p>본인 소유, 공동 작업, 조직 멤버십으로 접근할 수 있는 저장소입니다.</p></div>

            {privateRepositoriesIncluded === false && <div className={styles.alert} role="status">현재 연결에는 비공개 저장소 접근 권한이 없습니다. 비공개 저장소도 보려면 권한을 다시 승인하세요.<a className={styles.inlineLink} href={getGithubLoginUrl()}>GitHub 권한 다시 승인 <ArrowRight size={14} /></a></div>}
            {repositoryError && <div className={styles.alert} role="alert">{repositoryError}</div>}
            {repositories.length > 0 && <>
              <p className={styles.repositoryCount}>{repositories.length}개 저장소 불러옴{hasNextPage ? " · 더 불러올 수 있습니다" : ""}</p>
              <fieldset className={styles.repositoryFieldset} disabled={loggingOut}>
                <legend className={styles.srOnly}>작업할 GitHub 저장소 선택</legend>
                <ul className={styles.repositoryList}>{repositories.map((repository) => <li key={repository.id}>
                  <label className={`${styles.repositoryOption} ${selectedId === repository.id ? styles.repositorySelected : ""}`}>
                    <input type="radio" name="github-repository" value={repository.id} checked={selectedId === repository.id} onChange={() => handleRepositorySelection(repository.id)} />
                    <span className={styles.repositoryDetails}>
                      <span className={styles.repositoryTitle}><strong>{repository.fullName}</strong><small className={styles.visibility}>{repository.isPrivate ? <><LockKeyhole size={11} /> 비공개</> : "공개"}</small>{repository.archived && <small className={styles.visibility}>보관됨</small>}</span>
                      {repository.description && <span className={styles.repositoryDescription}>{repository.description}</span>}
                      <span className={styles.repositoryMeta}>{repository.language ? `${repository.language} · ` : ""}기본 브랜치 {repository.defaultBranch || "없음"}</span>
                    </span>
                  </label>
                </li>)}</ul>
              </fieldset>
            </>}
            {repositoryState === "loading" && <div className={styles.loading} role="status"><LoaderCircle className={styles.spin} size={16} /> 저장소를 불러오고 있어요…</div>}
            {repositoryState === "done" && repositories.length === 0 && <p className={styles.empty}>조회 가능한 저장소가 없습니다. GitHub 계정과 저장소 접근 권한을 확인해 주세요.</p>}

            {selectedRepository && <section className={styles.selection} aria-labelledby="selected-repository-heading">
              <span className={styles.selectionLabel} id="selected-repository-heading"><CheckCircle2 size={16} /> 선택한 저장소</span>
              <strong>{selectedRepository.fullName}</strong>
              <span>기본 브랜치: {selectedRepository.defaultBranch || "없음"}</span>
              <a className={styles.inlineLink} href={selectedRepository.htmlUrl} target="_blank" rel="noopener noreferrer">GitHub에서 보기 <ExternalLink size={14} /></a>
              <div className={styles.goalField}>
                <label htmlFor="analysis-goal">개발 목표 <small>선택 사항</small></label>
                <textarea id="analysis-goal" rows={3} maxLength={2000} value={goal} disabled={analysisState === "loading" || loggingOut} aria-describedby="analysis-goal-help" placeholder="예: 로그인 흐름의 오류 처리를 개선하고 싶어요." onChange={(event) => { clearAnalysis(); setGoal(event.target.value); }} />
                <span id="analysis-goal-help">{goal.length.toLocaleString()} / 2,000자 · 비워 두면 저장소 전반의 개선 항목을 제안합니다.</span>
              </div>
              <p className={styles.analysisConsent}>분석을 시작하면 선택한 저장소의 README와 일부 소스 코드가 Meta 모델에 전달됩니다.</p>
              <button type="button" className={styles.primaryButton} disabled={analysisState === "loading" || loggingOut} onClick={() => void handleAnalysis()}>{analysisState === "loading" ? <LoaderCircle className={styles.spin} size={17} /> : <Sparkles size={17} />} {analysisState === "loading" ? "저장소 분석 중…" : "선택한 저장소 분석하기"}</button>
              {analysisState === "loading" && <><p className={styles.analysisProgress} role="status">문서와 코드를 확인해 개발 항목을 정리하고 있어요. 최대 2분 정도 걸릴 수 있습니다.</p><button type="button" className={styles.secondaryButton} onClick={clearAnalysis}>분석 취소</button></>}
              {analysisError && <div className={styles.alert} role="alert">{analysisError}</div>}
            </section>}

            <div className={styles.actions}>
              {hasNextPage && <button type="button" className={styles.primaryButton} onClick={() => void refreshRepositories(page + 1)} disabled={repositoryState === "loading" || analysisState === "loading" || loggingOut}>저장소 더 불러오기</button>}
              <button type="button" className={styles.secondaryButton} onClick={() => void refreshRepositories()} disabled={repositoryState === "loading" || analysisState === "loading" || loggingOut}><RefreshCw size={16} /> {repositoryState === "error" && repositories.length === 0 ? "저장소 조회 다시 시도" : "저장소 목록 새로고침"}</button>
            </div>
            <button type="button" className={styles.logoutButton} disabled={loggingOut} onClick={() => void handleLogout()}>{loggingOut ? <LoaderCircle className={styles.spin} size={16} /> : <LogOut size={16} />} 로그아웃</button>
          </div>}
        </div>
        <footer className={styles.footer}><ShieldCheck size={16} /> 인증 정보는 서버에서 관리합니다. <Link href="/dashboard">대시보드로 이동</Link></footer>
      </div>
    </main>
  );
}
