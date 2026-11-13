"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ExternalLink, ListChecks, LoaderCircle, RefreshCw } from "lucide-react";
import { getGithubAccountKey, useGithubSession } from "@/components/auth/github-session";
import { useLanguage } from "@/components/i18n/language-provider";
import { Button, Card, StatusBadge } from "@/components/ui/primitives";
import { ApiError } from "@/lib/api/github-connect-api";
import { listTrackedTasks, type TrackedTask } from "@/lib/api/tracked-task-api";
import { taskErrorMessage, taskStatusLabel } from "./task-messages";
import styles from "./tasks.module.css";

type TaskListProps = { repositoryId?: string; analysisId?: string; compact?: boolean };
export function TaskList(props: TaskListProps) {
  const { user, status, loggingOut } = useGithubSession();
  const accountKey = getGithubAccountKey(user);
  if (status !== "authenticated" || !accountKey || loggingOut) return null;
  return <AccountTaskList key={`${accountKey}:${props.repositoryId ?? "all"}:${props.analysisId ?? "all"}`} {...props} />;
}
function AccountTaskList({ repositoryId, analysisId, compact = false }: TaskListProps) {
  const { t, locale } = useLanguage();
  const { markUnauthenticated } = useGithubSession();
  const [items, setItems] = useState<TrackedTask[]>([]);
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  useEffect(() => {
    const controller = new AbortController();
    void listTrackedTasks({ repositoryId, analysisId, page }, controller.signal).then((result) => {
      if (controller.signal.aborted) return;
      setItems(previous => page === 1 ? result.items : [...new Map([...previous, ...result.items].map(item => [item.id, item])).values()]);
      setHasNextPage(result.hasNextPage);
      setLoading(false);
      setError(null);
    }).catch((failure: unknown) => {
      if (controller.signal.aborted) return;
      if (failure instanceof ApiError && failure.status === 401) { markUnauthenticated(); return; }
      setError(failure); setLoading(false);
    });
    return () => controller.abort();
  }, [repositoryId, analysisId, page, revision, markUnauthenticated]);
  function refresh() { setItems([]); setPage(1); setHasNextPage(false); setError(null); setLoading(true); setRevision(current => current + 1); }
  function retry() { setError(null); setLoading(true); setRevision(current => current + 1); }
  const filter = new URLSearchParams();
  if (repositoryId) filter.set("repositoryId", repositoryId);
  if (analysisId) filter.set("analysisId", analysisId);
  const allTasksUrl = `/tasks${filter.size ? `?${filter}` : ""}`;
  return <Card className={styles.listCard}>
    <div className={styles.sectionHeading}><div><span className={styles.eyebrow}><ListChecks size={14} aria-hidden="true" /> {t("선택한 작업", "SELECTED TASKS")}</span><h2>{repositoryId ? t("이 저장소에서 선택한 작업", "Selected tasks for this repository") : t("저장한 작업 내역", "Saved tasks")}</h2><p>{repositoryId ? t("이 저장소의 AI 추천 중 직접 선택해 저장한 작업과 이슈를 표시합니다.", "Shows the tasks and issues you selected from AI recommendations for this repository.") : t("AI 추천에서 고른 작업과 진행 상태를 이어서 확인하세요.", "Reopen the work you selected from AI recommendations and track its progress.")}</p></div><div className={styles.actions}>{compact && <Button href={allTasksUrl} variant="quiet">{t("전체 보기", "View all")} <ArrowRight size={14} /></Button>}<Button variant="quiet" disabled={loading} onClick={refresh}><RefreshCw size={14} /> {t("새로고침", "Refresh")}</Button></div></div>
    {items.length > 0 && <ol className={styles.taskList}>{(compact ? items.slice(0, 5) : items).map(task => <li className={styles.taskRow} key={task.id}>
      <div className={styles.taskRowHeading}><Link className={styles.taskTitle} href={`/tasks/${task.id}`} lang={task.language}>{task.title}</Link><StatusBadge tone={task.status === "completed" ? "success" : task.status === "in_progress" ? "info" : "neutral"}>{taskStatusLabel(task.status, t)}</StatusBadge></div>
      <div className={styles.taskRowMeta}><span>{task.fullName}</span><time dateTime={task.updatedAt}>{new Date(task.updatedAt).toLocaleString(locale)}</time>{task.issueUrl && <a href={task.issueUrl} target="_blank" rel="noopener noreferrer">GitHub #{task.issueNumber} · {task.issueState === "closed" ? t("닫힘", "Closed") : t("열림", "Open")} <ExternalLink size={12} /></a>}{!task.issueUrl && task.issueCreationState !== "none" && <span>{t("이슈 등록 결과 확인 필요", "Issue creation needs confirmation")}</span>}</div>
      <Link className={styles.inlineLink} href={`/tasks/${task.id}`}>{t("작업 검토 및 진행 관리", "Review and track task")} <ArrowRight size={13} /></Link>
    </li>)}</ol>}
    {loading && <p className={styles.feedback} role="status"><LoaderCircle className={styles.spin} size={17} /> {t("작업을 불러오고 있어요…", "Loading tasks…")}</p>}
    {!loading && error !== null && <div className={styles.feedback}><p role="alert">{taskErrorMessage(error, t)}</p><Button variant="secondary" onClick={retry}>{t("다시 시도", "Try again")}</Button></div>}
    {!loading && error === null && items.length === 0 && <div className={styles.feedback}><p>{repositoryId ? t("이 저장소에서 아직 선택한 작업이 없습니다. 분석 결과에서 원하는 작업을 선택해 주세요.", "No tasks selected for this repository yet. Choose a recommendation from its analysis results.") : t("아직 선택한 작업이 없습니다. 분석 결과에서 원하는 작업을 선택해 주세요.", "No tasks selected yet. Choose a recommendation from an analysis result.")}</p><Button href={repositoryId ? `/analyze?repositoryId=${encodeURIComponent(repositoryId)}` : "/dashboard"} variant="secondary">{repositoryId ? t("이 저장소 분석하기", "Analyze this repository") : t("분석 기록 보기", "View analyses")}</Button></div>}
    {!compact && !loading && error === null && hasNextPage && <div className={styles.more}><Button variant="secondary" onClick={() => { setLoading(true); setPage(current => current + 1); }}>{t("작업 더 보기", "Load more tasks")}</Button></div>}
  </Card>;
}
