"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Check, GitBranch, GitPullRequest, LoaderCircle, LockKeyhole, RefreshCw, Sparkles } from "lucide-react";
import { useGithubSession } from "@/components/auth/github-session";
import { Button, Card, PageHeading } from "@/components/ui/primitives";
import { ApiError, fetchGithubRepositories, type GithubRepositoryPage } from "@/lib/api/github-connect-api";
import styles from "./dashboard-view.module.css";

type RepositoryState =
  | { status: "loading" }
  | { status: "ready"; data: GithubRepositoryPage }
  | { status: "error"; message: string };

function repositoryErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) return "저장소 접근 권한을 확인해 주세요. GitHub 연결 화면에서 권한을 다시 승인할 수 있습니다.";
    if (error.status === 429) return "GitHub 요청 한도에 도달했습니다. 잠시 후 다시 시도해 주세요.";
  }
  return "저장소를 불러오지 못했습니다. 연결 상태를 확인하고 다시 시도해 주세요.";
}

function DashboardContent() {
  const { user, markUnauthenticated } = useGithubSession();
  const [repositories, setRepositories] = useState<RepositoryState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [today, setToday] = useState(() => new Date());

  useEffect(() => {
    const interval = window.setInterval(() => setToday(new Date()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void fetchGithubRepositories(1, controller.signal).then((data) => {
      if (!controller.signal.aborted) setRepositories({ status: "ready", data });
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return;
      if (error instanceof ApiError && error.status === 401) {
        markUnauthenticated();
        return;
      }
      setRepositories({ status: "error", message: repositoryErrorMessage(error) });
    });
    return () => controller.abort();
  }, [attempt, markUnauthenticated]);

  function refresh() {
    setRepositories({ status: "loading" });
    setAttempt((previous) => previous + 1);
  }

  const name = user?.name || user?.login || "GitHub 사용자";
  const data = repositories.status === "ready" ? repositories.data : null;
  const visibleRepositories = data?.items.slice(0, 5) ?? [];

  return <>
    <PageHeading
      eyebrow={new Intl.DateTimeFormat("ko-KR", { dateStyle: "full" }).format(today)}
      title={`${name}님, 안녕하세요.`}
      description="연결한 GitHub 저장소를 확인하고, 다음 개발 방향을 찾아보세요."
      actions={<Button href="/connect/github"><Sparkles size={15} /> 저장소 분석하기</Button>}
    />

    {repositories.status === "loading" && <Card className={styles.feedback}>
      <LoaderCircle size={22} className={styles.spin} aria-hidden="true" />
      <p role="status">GitHub 저장소를 불러오고 있어요…</p>
    </Card>}

    {repositories.status === "error" && <Card className={styles.feedback}>
      <GitBranch size={26} aria-hidden="true" />
      <h2>저장소를 확인할 수 없어요</h2>
      <p role="alert">{repositories.message}</p>
      <div className={styles.actions}><Button onClick={refresh} variant="secondary"><RefreshCw size={15} /> 다시 불러오기</Button><Button href="/connect/github" variant="quiet">GitHub 연결 확인 <ArrowRight size={14} /></Button></div>
    </Card>}

    {data && <>
      <section className={styles.metrics} aria-label="불러온 저장소 요약">
        <Card className={styles.metric}><span><GitBranch size={16} /> 불러온 저장소</span><strong>{data.items.length.toLocaleString("ko-KR")}</strong><small>{data.hasNextPage ? "추가 저장소는 저장소 화면에서 확인하세요" : "현재 계정으로 조회한 저장소"}</small></Card>
        <Card className={styles.metric}><span><GitPullRequest size={16} /> 열린 이슈</span><strong>{data.items.reduce((total, repository) => total + repository.openIssueCount, 0).toLocaleString("ko-KR")}</strong><small>불러온 저장소의 열린 이슈 합계</small></Card>
        <Card className={styles.metric}><span><LockKeyhole size={16} /> 비공개 저장소</span><strong>{data.items.filter((repository) => repository.isPrivate).length.toLocaleString("ko-KR")}</strong><small>불러온 목록에서 접근 가능한 저장소</small></Card>
      </section>

      {data.privateRepositoriesIncluded === false && <p className={styles.notice}>현재 연결은 비공개 저장소를 포함하지 않습니다. <Button href="/connect/github" variant="quiet">접근 권한 확인 <ArrowRight size={13} /></Button></p>}

      <div className={styles.contentGrid}>
        <Card className={styles.repositorySection}>
          <div className={styles.sectionHeader}><div><span className={styles.eyebrow}>YOUR REPOSITORIES</span><h2>내 GitHub 저장소</h2></div><Button variant="quiet" onClick={refresh}><RefreshCw size={14} /> 새로고침</Button></div>
          {visibleRepositories.length > 0 ? <>
            <ul className={styles.repositoryList}>{visibleRepositories.map((repository) => <li key={repository.id}>
              <span className={styles.repositoryIcon}><GitBranch size={18} aria-hidden="true" /></span>
              <div className={styles.repositoryDetails}>
                <a href={repository.htmlUrl} target="_blank" rel="noopener noreferrer">{repository.fullName}</a>
                <span className={styles.repositoryMeta}>{repository.isPrivate ? "비공개" : "공개"}{repository.archived ? " · 보관됨" : ""}{repository.language ? ` · ${repository.language}` : ""}</span>
                {repository.description && <p>{repository.description}</p>}
                <span className={styles.updatedAt}>업데이트 <time dateTime={repository.updatedAt}>{new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric" }).format(new Date(repository.updatedAt))}</time></span>
              </div>
            </li>)}</ul>
            <div className={styles.listFooter}><span>불러온 {data.items.length}개 중 {visibleRepositories.length}개 표시</span><Button href="/connect/github" variant="secondary">저장소 선택 <ArrowRight size={14} /></Button></div>
          </> : <div className={styles.emptyState}>
            <span className={styles.emptyIcon}><GitBranch size={25} aria-hidden="true" /></span>
            <h3>조회 가능한 저장소가 없어요</h3>
            <p>GitHub 계정과 저장소 접근 권한을 확인해 주세요.</p>
            <Button href="/connect/github" variant="secondary">GitHub 연결 확인 <ArrowRight size={14} /></Button>
          </div>}
        </Card>

        <Card className={styles.workflow}>
          <span className={styles.workflowIcon}><Sparkles size={21} aria-hidden="true" /></span>
          <span className={styles.eyebrow}>YOUR NEXT STEP</span>
          <h2>코드에서 다음 할 일로</h2>
          <p>저장소와 개발 목표를 선택하면 AI가 코드 근거와 함께 개선 방향을 정리합니다.</p>
          <ol>
            <li><span>01</span><div><strong>저장소 선택</strong><small>분석할 코드베이스를 골라주세요.</small></div></li>
            <li><span>02</span><div><strong>개발 목표 입력</strong><small>해결하고 싶은 문제를 알려주세요.</small></div></li>
            <li><span>03</span><div><strong>분석 결과 검토</strong><small>우선순위와 구현 단계를 확인하세요.</small></div></li>
          </ol>
          <div className={styles.controlNote}><Check size={15} aria-hidden="true" /> 분석은 직접 시작할 때만 실행됩니다.</div>
          <Button href="/connect/github" variant="secondary">첫 단계 시작하기 <ArrowRight size={14} /></Button>
        </Card>
      </div>
    </>}
  </>;
}

export function DashboardView() {
  const { status, user } = useGithubSession();
  if (status !== "authenticated" || !user) return null;
  return <DashboardContent key={`${user.id ?? ""}:${user.login ?? ""}`} />;
}
