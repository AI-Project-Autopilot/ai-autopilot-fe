"use client";

import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, GitBranch, GitPullRequest, LoaderCircle, LockKeyhole, RefreshCw } from "lucide-react";
import { useGithubSession } from "@/components/auth/github-session";
import { Button, Card, PageHeading } from "@/components/ui/primitives";
import { getGithubLoginUrl } from "@/lib/api/github-connect-api";
import { RepositoryAnalysisPanel } from "./repository-analysis-panel";
import { useRepositoryWorkspace } from "./use-repository-workspace";
import styles from "./dashboard-view.module.css";

function DashboardContent() {
  const { user } = useGithubSession();
  const workspace = useRepositoryWorkspace();
  const { repositories, repositoryState, repositoryError, hasNextPage, privateRepositoriesIncluded, loadingMore, selectedId, selectedRepository, selectRepository, refreshRepositories, loadMoreRepositories } = workspace;
  const [today, setToday] = useState(() => new Date());

  useEffect(() => {
    const interval = window.setInterval(() => setToday(new Date()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const name = user?.name || user?.login || "GitHub 사용자";
  const loaded = repositoryState === "ready" || repositories.length > 0;

  return <>
    <PageHeading
      eyebrow={new Intl.DateTimeFormat("ko-KR", { dateStyle: "full" }).format(today)}
      title={`${name}님, 안녕하세요.`}
      description="분석할 GitHub 저장소를 선택하고, 다음 개발 방향을 찾아보세요."
      actions={<Button href={selectedRepository ? "#analysis" : "#repositories"}><GitBranch size={15} /> {selectedRepository ? "선택한 저장소 분석하기" : "저장소 선택하기"}</Button>}
    />

    {repositoryState === "loading" && <Card className={styles.feedback}>
      <LoaderCircle size={22} className={styles.spin} aria-hidden="true" />
      <p role="status">GitHub 저장소를 불러오고 있어요…</p>
    </Card>}

    {repositoryState === "error" && repositories.length === 0 && <Card className={styles.feedback}>
      <GitBranch size={26} aria-hidden="true" />
      <h2>저장소를 확인할 수 없어요</h2>
      <p role="alert">{repositoryError}</p>
      <div className={styles.actions}><Button onClick={() => void refreshRepositories()} variant="secondary"><RefreshCw size={15} /> 다시 불러오기</Button><a href={getGithubLoginUrl()} className={styles.inlineLink}>GitHub 권한 다시 승인 <ArrowRight size={14} /></a></div>
    </Card>}

    {loaded && <>
      <section className={styles.metrics} aria-label="불러온 저장소 요약">
        <Card className={styles.metric}><span><GitBranch size={16} /> 불러온 저장소</span><strong>{repositories.length.toLocaleString("ko-KR")}</strong><small>{hasNextPage ? "목록 아래에서 더 불러올 수 있어요" : "현재 계정으로 조회한 저장소"}</small></Card>
        <Card className={styles.metric}><span><GitPullRequest size={16} /> 열린 이슈</span><strong>{repositories.reduce((total, repository) => total + repository.openIssueCount, 0).toLocaleString("ko-KR")}</strong><small>불러온 저장소의 열린 이슈 합계</small></Card>
        <Card className={styles.metric}><span><LockKeyhole size={16} /> 비공개 저장소</span><strong>{repositories.filter((repository) => repository.isPrivate).length.toLocaleString("ko-KR")}</strong><small>불러온 목록에서 접근 가능한 저장소</small></Card>
      </section>

      {privateRepositoriesIncluded === false && <p className={styles.notice}>현재 연결은 비공개 저장소를 포함하지 않습니다. <a href={getGithubLoginUrl()} className={styles.inlineLink}>GitHub 권한 다시 승인 <ArrowRight size={13} /></a></p>}

      <div className={styles.contentGrid}>
        <Card className={styles.repositorySection}>
          <div id="repositories" className={styles.sectionHeader}><div><span className={styles.eyebrow}>YOUR REPOSITORIES</span><h2>내 GitHub 저장소</h2></div><Button variant="quiet" onClick={() => void refreshRepositories()}><RefreshCw size={14} /> 새로고침</Button></div>
          <p className={styles.selectionHint}>분석할 저장소를 선택해 주세요.</p>
          {repositories.length > 0 ? <>
            <fieldset className={styles.repositoryFieldset}>
              <legend className={styles.srOnly}>분석할 GitHub 저장소 선택</legend>
              <ul className={styles.repositoryList}>{repositories.map((repository) => <li key={repository.id}>
                <label className={`${styles.repositoryOption}${selectedId === repository.id ? ` ${styles.repositorySelected}` : ""}`}>
                  <input type="radio" name="dashboard-repository" value={repository.id} checked={selectedId === repository.id} onChange={() => selectRepository(repository.id)} />
                  <span className={styles.repositoryDetails}>
                    <strong>{repository.fullName}</strong>
                    <span className={styles.repositoryMeta}>{repository.isPrivate ? "비공개" : "공개"}{repository.archived ? " · 보관됨" : ""}{repository.language ? ` · ${repository.language}` : ""} · 기본 브랜치 {repository.defaultBranch || "없음"}</span>
                    {repository.description && <span className={styles.repositoryDescription}>{repository.description}</span>}
                    <span className={styles.updatedAt}>업데이트 <time dateTime={repository.updatedAt}>{new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric" }).format(new Date(repository.updatedAt))}</time></span>
                  </span>
                  {selectedId === repository.id && <CheckCircle2 className={styles.selectedIcon} size={18} aria-hidden="true" />}
                </label>
              </li>)}</ul>
            </fieldset>
            {repositoryError && <p className={styles.repositoryError} role="alert">{repositoryError}</p>}
            <div className={styles.listFooter}><span>{repositories.length}개 저장소 불러옴{hasNextPage ? " · 더 불러올 수 있어요" : ""}</span>{hasNextPage && <Button onClick={() => void loadMoreRepositories()} variant="secondary" disabled={loadingMore}>{loadingMore ? <LoaderCircle className={styles.spin} size={14} /> : <ArrowRight size={14} />} {loadingMore ? "불러오는 중…" : repositoryError ? "추가 저장소 다시 불러오기" : "저장소 더 불러오기"}</Button>}</div>
          </> : <div className={styles.emptyState}>
            <span className={styles.emptyIcon}><GitBranch size={25} aria-hidden="true" /></span>
            <h3>조회 가능한 저장소가 없어요</h3>
            <p>GitHub 계정과 저장소 접근 권한을 확인해 주세요.</p>
            <a className={styles.inlineLink} href={getGithubLoginUrl()}>GitHub 권한 다시 승인 <ArrowRight size={14} /></a>
          </div>}
        </Card>

        <RepositoryAnalysisPanel workspace={workspace} />
      </div>
    </>}
  </>;
}

export function DashboardView() {
  const { status, user } = useGithubSession();
  if (status !== "authenticated" || !user) return null;
  return <DashboardContent key={`${user.id ?? ""}:${user.login ?? ""}`} />;
}
