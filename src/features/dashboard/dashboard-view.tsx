"use client";

import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, GitBranch, GitPullRequest, LoaderCircle, LockKeyhole, RefreshCw, Sparkles } from "lucide-react";
import { useGithubSession } from "@/components/auth/github-session";
import { useLanguage } from "@/components/i18n/language-provider";
import { Button, Card, PageHeading } from "@/components/ui/primitives";
import { useRepositoryWorkspaceContext } from "@/features/workspace/repository-workspace-context";
import { getGithubLoginUrl } from "@/lib/api/github-connect-api";
import { AnalysisHistory } from "@/features/analysis/analysis-history";
import { TaskList } from "@/features/tasks/task-list";
import styles from "./dashboard-view.module.css";

export function DashboardView() {
  const { user } = useGithubSession();
  const { t, locale } = useLanguage();
  const { repositories, repositoryState, repositoryError, hasNextPage, privateRepositoriesIncluded, refreshRepositories } = useRepositoryWorkspaceContext();
  const [today, setToday] = useState(() => new Date());

  useEffect(() => {
    const interval = window.setInterval(() => setToday(new Date()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const loaded = repositoryState === "ready" || repositories.length > 0;
  const name = user?.name || user?.login || t("GitHub 사용자", "GitHub user");

  return <>
    <PageHeading eyebrow={new Intl.DateTimeFormat(locale, { dateStyle: "full" }).format(today)} title={t(`${name}님, 안녕하세요.`, `Hello, ${name}.`)} description={t("GitHub 연결 상태와 프로젝트 현황을 확인하세요.", "Check your GitHub connection and project overview.")} actions={<Button href="/repositories"><GitBranch size={15} /> {t("저장소 둘러보기", "Browse repositories")}</Button>} />
    <Card className={styles.connection}>
      <span className={styles.connectionIcon}><CheckCircle2 size={22} aria-hidden="true" /></span>
      <div><strong>{t("GitHub 계정이 연결되어 있어요", "Your GitHub account is connected")}</strong><span>{user?.login ? `@${user.login}` : name}</span></div>
      <span className={styles.connected}>{t("연결됨", "Connected")}</span>
    </Card>
    {repositoryState === "loading" && <Card className={styles.feedback}><LoaderCircle size={21} className={styles.spin} aria-hidden="true" /><p role="status">{t("저장소 현황을 확인하고 있어요…", "Checking your repositories…")}</p></Card>}
    {repositoryState === "error" && !loaded && <Card className={styles.feedback}><h2>{t("저장소 현황을 확인할 수 없어요", "Could not check your repositories")}</h2><p role="alert">{repositoryError}</p><Button variant="secondary" onClick={() => void refreshRepositories()}><RefreshCw size={14} /> {t("다시 불러오기", "Try again")}</Button></Card>}
    {loaded && <>
      <section className={styles.metrics} aria-label={t("불러온 저장소 요약", "Loaded repository summary")}>
        <Card className={styles.metric}><span><GitBranch size={16} /> {t("불러온 저장소", "Loaded repositories")}</span><strong>{repositories.length.toLocaleString(locale)}</strong><small>{hasNextPage ? t("추가 저장소는 저장소 화면에서 불러오세요", "Load more on the Repositories screen") : t("현재 계정으로 조회한 저장소", "Repositories accessible to this account")}</small></Card>
        <Card className={styles.metric}><span><GitPullRequest size={16} /> {t("열린 이슈", "Open issues")}</span><strong>{repositories.reduce((total, repository) => total + repository.openIssueCount, 0).toLocaleString(locale)}</strong><small>{t("불러온 저장소의 열린 이슈 합계", "Total open issues in loaded repositories")}</small></Card>
        <Card className={styles.metric}><span><LockKeyhole size={16} /> {t("비공개 저장소", "Private repositories")}</span><strong>{repositories.filter((repository) => repository.isPrivate).length.toLocaleString(locale)}</strong><small>{t("불러온 목록에서 접근 가능한 저장소", "Accessible private repositories in this list")}</small></Card>
      </section>
      {privateRepositoriesIncluded === false && <p className={styles.notice}>{t("현재 연결에는 비공개 저장소가 포함되지 않습니다.", "This connection does not include private repositories.")} <a href={getGithubLoginUrl()}>{t("GitHub 권한 다시 승인", "Reauthorize GitHub access")} <ArrowRight size={13} /></a></p>}
    </>}
    <div className={styles.nextSteps}>
      <Card className={styles.nextStep}><span className={styles.stepIcon}><GitBranch size={21} aria-hidden="true" /></span><h2>{t("분석할 저장소 찾기", "Find a repository to analyze")}</h2><p>{t("접근 가능한 저장소를 살펴보고 분석할 프로젝트를 선택하세요.", "Browse accessible repositories and choose a project to analyze.")}</p><Button href="/repositories" variant="secondary">{t("저장소로 이동", "Go to repositories")} <ArrowRight size={14} /></Button></Card>
      <Card className={styles.nextStep}><span className={`${styles.stepIcon} ${styles.analysisIcon}`}><Sparkles size={21} aria-hidden="true" /></span><h2>{t("새 분석 시작하기", "Start a new analysis")}</h2><p>{t("저장소와 개발 목표를 정하고 코드에 근거한 개선 방향을 확인하세요.", "Choose a repository and development goal to explore improvements grounded in code.")}</p><Button href="/analyze" variant="secondary">{t("새 분석으로 이동", "Go to new analysis")} <ArrowRight size={14} /></Button></Card>
    </div>
    <TaskList compact />
    <AnalysisHistory />
  </>;
}
