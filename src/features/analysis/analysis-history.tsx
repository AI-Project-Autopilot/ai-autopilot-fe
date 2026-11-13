"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { ArrowRight, History, LoaderCircle, RefreshCw } from "lucide-react";
import { getGithubAccountKey, useGithubSession } from "@/components/auth/github-session";
import { useLanguage } from "@/components/i18n/language-provider";
import { Button, Card, StatusBadge } from "@/components/ui/primitives";
import { ApiError, fetchGithubAnalyses, type GithubAnalysisSummary } from "@/lib/api/github-connect-api";
import styles from "./analysis-history.module.css";

export function AnalysisHistory({ repositoryId }: { repositoryId?: string }) {
  const { status, user, loggingOut } = useGithubSession();
  const accountKey = getGithubAccountKey(user);
  if (status !== "authenticated" || !accountKey || loggingOut) return null;
  return <AccountAnalysisHistory key={`${accountKey}:${repositoryId ?? "all"}`} repositoryId={repositoryId} />;
}

function AccountAnalysisHistory({ repositoryId }: { repositoryId?: string }) {
  const { t, locale } = useLanguage();
  const { markUnauthenticated } = useGithubSession();
  const headingId = useId();
  const [items, setItems] = useState<GithubAnalysisSummary[]>([]);
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void fetchGithubAnalyses(repositoryId, page, controller.signal).then((result) => {
      if (controller.signal.aborted) return;
      setItems((previous) => page === 1 ? result.items : [...new Map(
        [...previous, ...result.items].map((item) => [item.id, item]),
      ).values()]);
      setHasNextPage(result.hasNextPage);
      setLoading(false);
      setFailed(false);
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return;
      if (error instanceof ApiError && error.status === 401) {
        markUnauthenticated();
        return;
      }
      setLoading(false);
      setFailed(true);
    });
    return () => controller.abort();
  }, [repositoryId, page, revision, markUnauthenticated]);

  function refresh() {
    setItems([]);
    setPage(1);
    setHasNextPage(false);
    setFailed(false);
    setLoading(true);
    setRevision((current) => current + 1);
  }

  function retry() {
    setFailed(false);
    setLoading(true);
    setRevision((current) => current + 1);
  }

  function loadMore() {
    setFailed(false);
    setLoading(true);
    setPage((current) => current + 1);
  }

  const labels: Record<GithubAnalysisSummary["status"], string> = {
    running: t("분석 중", "Running"),
    succeeded: t("완료", "Completed"),
    failed: t("실패", "Failed"),
    cancelled: t("취소됨", "Cancelled"),
  };

  return <section className={styles.history} aria-labelledby={headingId}>
    <Card className={styles.card}>
      <div className={styles.heading}>
        <div><span className={styles.eyebrow}><History size={14} aria-hidden="true" /> {t("저장된 분석", "SAVED ANALYSES")}</span><h2 id={headingId}>{repositoryId ? t("이 저장소의 분석 기록", "Analysis history for this repository") : t("최근 분석 기록", "Recent analysis history")}</h2><p>{t("입력한 목표와 분석 결과를 다시 확인할 수 있어요.", "Reopen your development goals and analysis results.")}</p></div>
        <Button variant="quiet" onClick={refresh} disabled={loading}><RefreshCw size={14} aria-hidden="true" /> {t("새로고침", "Refresh")}</Button>
      </div>
      {items.length > 0 && <ol className={styles.list}>{items.map((item) => <li className={styles.item} key={item.id}>
        <div className={styles.itemHeading}><strong>{item.fullName || t(`저장소 #${item.repositoryId}`, `Repository #${item.repositoryId}`)}</strong><StatusBadge tone={item.status === "succeeded" ? "success" : item.status === "failed" ? "warning" : "neutral"}>{labels[item.status]}</StatusBadge></div>
        <p className={styles.goal}><span>{t("개발 목표", "Development goal")}</span>{item.goal || t("목표 없이 저장소 전반 분석", "Repository analysis without a specific goal")}</p>
        {item.summary && <p className={styles.summary}>{item.summary}</p>}
        <div className={styles.itemFooter}><time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString(locale)}</time>{item.status === "succeeded" && <Link className={styles.resultLink} href={`/connect/github/analysis?analysisId=${encodeURIComponent(item.id)}`}>{t("분석 결과 보기", "View analysis")} <ArrowRight size={13} aria-hidden="true" /></Link>}</div>
      </li>)}</ol>}
      {loading && <p className={styles.feedback} role="status"><LoaderCircle className={styles.spin} size={17} aria-hidden="true" /> {t("분석 기록을 불러오고 있어요…", "Loading analysis history…")}</p>}
      {!loading && failed && <div className={styles.feedback}><p role="alert">{t("분석 기록을 불러오지 못했습니다. 다시 시도해 주세요.", "Could not load analysis history. Please try again.")}</p><Button variant="secondary" onClick={retry}>{t("다시 시도", "Try again")}</Button></div>}
      {!loading && !failed && items.length === 0 && <p className={styles.feedback}>{t("아직 저장된 분석이 없습니다. 새 분석을 시작하면 목표와 결과가 여기에 표시됩니다.", "No saved analyses yet. Start an analysis to see your goals and results here.")}</p>}
      {!loading && !failed && hasNextPage && <div className={styles.more}><Button variant="secondary" onClick={loadMore}>{t("분석 기록 더 보기", "Load more analyses")}</Button></div>}
    </Card>
  </section>;
}
