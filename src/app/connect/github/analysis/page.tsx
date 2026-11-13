"use client";

import { Suspense, useEffect, useState, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getGithubAccountKey, GithubSessionGate, GithubSessionProvider, useGithubSession } from "@/components/auth/github-session";
import { useLanguage } from "@/components/i18n/language-provider";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import {
  ArrowLeft,
  ExternalLink,
  GitBranch,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";
import {
  ApiError,
  fetchGithubAnalysis,
  GITHUB_ANALYSIS_STORAGE_KEY,
  parseGithubRepositoryAnalysis,
  type GithubRepositoryAnalysis,
} from "@/lib/api/github-connect-api";
import styles from "../page.module.css";

type ResultState = "loading" | "ready" | "missing" | "invalid" | "notFound" | "error" | "running" | "failed" | "cancelled";
type AnalysisResult = {
  state: ResultState;
  analysis: GithubRepositoryAnalysis | null;
  goal?: string;
  repositoryId?: string;
};
type RecommendationPriority = GithubRepositoryAnalysis["recommendations"][number]["priority"];

const priorityStyles: Record<RecommendationPriority, string> = {
  high: styles.priorityHigh,
  medium: styles.priorityMedium,
  low: styles.priorityLow,
};

function subscribeToAnalysisStorage(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getStoredAnalysis(): string | null {
  try {
    return window.sessionStorage.getItem(GITHUB_ANALYSIS_STORAGE_KEY) ?? "";
  } catch {
    return "!storage-unavailable!";
  }
}

function getServerAnalysisSnapshot(): null {
  return null;
}

function parseStoredAnalysis(stored: string | null, accountKey: string | null): {
  state: ResultState;
  analysis: GithubRepositoryAnalysis | null;
} {
  if (stored === null) return { state: "loading", analysis: null };
  if (!stored) return { state: "missing", analysis: null };

  try {
    const payload: unknown = JSON.parse(stored);
    if (
      typeof payload !== "object" ||
      payload === null ||
      Array.isArray(payload) ||
      typeof (payload as Record<string, unknown>).repositoryId !== "string"
    ) {
      return { state: "invalid", analysis: null };
    }

    const record = payload as Record<string, unknown>;
    if (!accountKey || record.accountKey !== accountKey) {
      return { state: "invalid", analysis: null };
    }
    return {
      state: "ready",
      analysis: parseGithubRepositoryAnalysis(record.analysis, record.repositoryId as string),
    };
  } catch {
    return { state: "invalid", analysis: null };
  }
}

function LegacyAnalysisResult() {
  const { user } = useGithubSession();
  const stored = useSyncExternalStore(
    subscribeToAnalysisStorage,
    getStoredAnalysis,
    getServerAnalysisSnapshot,
  );
  const result = parseStoredAnalysis(stored, getGithubAccountKey(user));
  return <AnalysisResultView {...result} saved={false} />;
}

function SavedAnalysisResult({ analysisId }: { analysisId: string }) {
  const { markUnauthenticated } = useGithubSession();
  const [result, setResult] = useState<AnalysisResult>({ state: "loading", analysis: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    void fetchGithubAnalysis(analysisId, controller.signal).then((record) => {
      if (controller.signal.aborted) return;
      setResult({
        state: record.status === "succeeded" ? (record.result ? "ready" : "invalid") : record.status,
        analysis: record.status === "succeeded" ? record.result : null,
        goal: record.goal,
        repositoryId: record.repositoryId,
      });
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return;
      if (error instanceof ApiError && error.status === 401) {
        markUnauthenticated();
        return;
      }
      setResult({
        state: error instanceof ApiError && error.status === 404 ? "notFound" : "error",
        analysis: null,
      });
    });
    return () => controller.abort();
  }, [analysisId, attempt, markUnauthenticated]);

  function retry() {
    setResult({ state: "loading", analysis: null });
    setAttempt((current) => current + 1);
  }

  return <AnalysisResultView {...result} saved onRetry={retry} />;
}

function GithubAnalysisResult() {
  const searchParams = useSearchParams();
  const { user } = useGithubSession();
  const analysisIds = searchParams.getAll("analysisId");
  if (analysisIds.length === 0) return <LegacyAnalysisResult />;
  if (analysisIds.length !== 1 || !/^c[a-z0-9]{24}$/.test(analysisIds[0])) {
    return <AnalysisResultView state="invalid" analysis={null} saved />;
  }
  return <SavedAnalysisResult key={`${getGithubAccountKey(user)}:${analysisIds[0]}`} analysisId={analysisIds[0]} />;
}

function AnalysisResultView({ state, analysis, goal, repositoryId, saved, onRetry }: AnalysisResult & {
  saved: boolean;
  onRetry?: () => void;
}) {
  const { t, locale } = useLanguage();
  const priorityLabels: Record<RecommendationPriority, string> = {
    high: t("높음", "High"),
    medium: t("보통", "Medium"),
    low: t("낮음", "Low"),
  };
  return (
    <main className={styles.screen}>
      <div className={styles.container}>
        <header className={styles.header}>
          <Link href="/dashboard" className={styles.brand}>autopilot<span>.</span></Link>
          <div className={styles.headerControls}><span className={styles.topLabel}>{t("분석 결과", "Analysis results")}</span><LanguageSwitcher /></div>
        </header>
        <div className={styles.card}>
          <div className={styles.iconBox}><GitBranch size={30} aria-hidden="true" /></div>
          <p className={styles.eyebrow}>{t("저장소 분석", "REPOSITORY ANALYSIS")}</p>
          <h1>{t("저장소 분석 결과", "Repository analysis results")}</h1>

          {state === "loading" && <div className={styles.loading} role="status"><LoaderCircle className={styles.spin} size={18} /> {t("분석 결과를 불러오고 있어요…", "Loading your analysis results…")}</div>}
          {state === "missing" && <div className={styles.alert} role="alert">{t("이 탭에 보관된 분석 결과가 없습니다. 대시보드에서 저장된 분석 기록을 확인해 주세요.", "No analysis result is cached in this tab. Open the dashboard to view your saved analysis history.")}</div>}
          {state === "invalid" && <div className={styles.alert} role="alert">{t("분석 결과 주소 또는 데이터가 올바르지 않습니다. 대시보드의 분석 기록에서 다시 열어 주세요.", "The analysis address or data is invalid. Open the result again from your dashboard history.")}</div>}

          {state === "notFound" && <div className={styles.alert} role="alert">{t("이 분석 기록을 찾을 수 없거나 접근 권한이 없습니다.", "This analysis was not found or is not accessible to your account.")}</div>}
          {state === "error" && <div className={styles.alert} role="alert">{t("저장된 분석 결과를 불러오지 못했습니다. 다시 시도해 주세요.", "Could not load the saved analysis. Please try again.")}</div>}
          {state === "running" && <div className={styles.loading} role="status">{t("아직 분석이 진행 중입니다. 잠시 후 다시 확인해 주세요.", "This analysis is still running. Check again shortly.")}</div>}
          {state === "failed" && <div className={styles.alert} role="alert">{t("이 분석은 실패하여 결과가 생성되지 않았습니다. 새 분석을 시작해 주세요.", "This analysis failed and has no result. Start a new analysis to try again.")}</div>}
          {state === "cancelled" && <div className={styles.alert} role="status">{t("이 분석은 취소되었습니다. 필요하면 새 분석을 시작해 주세요.", "This analysis was cancelled. Start a new analysis when you are ready.")}</div>}
          {onRetry && (state === "error" || state === "running") && <button className={styles.secondaryButton} type="button" onClick={onRetry}>{t("다시 확인", "Try again")}</button>}
          {goal !== undefined && <div className={styles.contextDetails}><strong>{t("분석 요청 목표", "Requested development goal")}</strong><p>{goal || t("목표 없이 저장소 전반을 분석했습니다.", "The analysis covered the repository without a specific goal.")}</p></div>}
          {(state === "failed" || state === "cancelled") && repositoryId && <Link className={styles.secondaryButton} href={`/analyze?repositoryId=${encodeURIComponent(repositoryId)}`}>{t("이 저장소 다시 분석하기", "Analyze this repository again")}</Link>}

          {analysis && state === "ready" && <section className={styles.analysisResults} aria-labelledby="analysis-results-heading">
            <div className={styles.resultHeading}>
              <h2 id="analysis-results-heading">{analysis.repository.fullName}</h2>
              <a className={styles.inlineLink} href={`${analysis.repository.htmlUrl}/tree/${encodeURIComponent(analysis.repository.commitSha)}`} target="_blank" rel="noopener noreferrer">{t("분석 기준 커밋", "Analyzed commit")} {analysis.repository.commitSha.slice(0, 7)} <ExternalLink size={13} /></a>
            </div>
            <p className={styles.analysisSummary} lang={analysis.language}>{analysis.summary}</p>
            <div className={styles.resultMeta}><span>{new Date(analysis.generatedAt).toLocaleString(locale)}</span><span>{t("분석 모델", "Model")}: {analysis.model}</span><span data-analysis-language={analysis.language}>{t("분석 결과 언어", "Result language")}: {analysis.language === "ko" ? "한국어" : "English"}</span></div>
            <h3>{t("추천 개발 항목", "Recommended improvements")}</h3>
            <ol className={styles.recommendationList}>{analysis.recommendations.map((recommendation) => <li className={styles.recommendation} key={recommendation.id}>
              <div className={styles.recommendationHeading}><h4 lang={analysis.language}>{recommendation.title}</h4><span className={`${styles.priority} ${priorityStyles[recommendation.priority]}`}>{t("우선순위", "Priority")} {priorityLabels[recommendation.priority]}</span></div>
              <p className={styles.rationale} lang={analysis.language}>{recommendation.rationale}</p>
              <h5>{t("구현 단계", "Implementation steps")}</h5>
              <ol className={styles.resultSteps} lang={analysis.language}>{recommendation.implementationSteps.map((step, index) => <li key={index}>{step}</li>)}</ol>
              <h5>{t("완료 기준", "Acceptance criteria")}</h5>
              <ul className={styles.resultSteps} lang={analysis.language}>{recommendation.acceptanceCriteria.map((criterion, index) => <li key={index}>{criterion}</li>)}</ul>
              {recommendation.evidence.length > 0 && <><h5>{t("코드 근거", "Code evidence")}</h5>{recommendation.evidence.map((evidence, index) => <details className={styles.evidence} key={index}>
                <summary>{evidence.path}:{evidence.startLine}–{evidence.endLine}</summary>
                <a className={styles.inlineLink} href={evidence.url} target="_blank" rel="noopener noreferrer">{t("해당 커밋의 파일에서 확인", "View the file at this commit")} <ExternalLink size={13} /></a>
                <pre><code>{evidence.excerpt}</code></pre>
              </details>)}</>}
            </li>)}</ol>
            <details className={styles.contextDetails}>
              <summary>{t(`분석에 사용한 파일 ${analysis.context.filesRead.length.toLocaleString(locale)}개 확인`, `View ${analysis.context.filesRead.length.toLocaleString(locale)} files used in this analysis`)}</summary>
              <p>{t(`조회된 파일 ${analysis.context.totalFiles.toLocaleString(locale)}개 중 ${analysis.context.skippedFiles.toLocaleString(locale)}개는 이번 분석에서 제외되었습니다.`, `${analysis.context.skippedFiles.toLocaleString(locale)} of ${analysis.context.totalFiles.toLocaleString(locale)} discovered files were excluded from this analysis.`)}</p>
              <ul>{analysis.context.filesRead.map((file) => <li key={file.path}><strong>{file.path}</strong><span>{t(`${file.bytes.toLocaleString(locale)}바이트 · ${file.lineCount.toLocaleString(locale)}줄`, `${file.bytes.toLocaleString(locale)} bytes · ${file.lineCount.toLocaleString(locale)} lines`)}{file.truncated ? t(" · 일부 내용만 읽음", " · partially read") : ""}</span></li>)}</ul>
            </details>
            {(analysis.context.treeTruncated || analysis.context.warnings.length > 0) && <div className={styles.contextWarnings} role="note">
              <strong>{t("분석 범위 안내", "Analysis scope")}</strong>
              {analysis.context.treeTruncated && <p>{t("파일 목록 일부만 조회되어 저장소 전체를 확인하지 못했습니다.", "Only part of the file tree was retrieved, so this analysis does not cover the whole repository.")}</p>}
              {analysis.context.warnings.length > 0 && <ul>{analysis.context.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul>}
            </div>}
          </section>}

          <Link className={styles.secondaryButton} href="/repositories"><ArrowLeft size={16} /> {t("저장소 목록으로 돌아가기", "Back to repositories")}</Link>
        </div>
        <footer className={styles.footer}><ShieldCheck size={16} /> {saved ? t("분석 결과는 계정에 저장되어 다시 열 수 있습니다.", "Saved analyses stay with your account and can be reopened.") : t("이전 분석 결과를 현재 탭의 보관본에서 표시하고 있습니다.", "This older result is shown from the copy cached in this tab.")} <Link href="/dashboard">{t("대시보드로 이동", "Open dashboard")}</Link></footer>
      </div>
    </main>
  );
}

export default function GithubAnalysisPage() {
  return <GithubSessionProvider><GithubSessionGate><Suspense fallback={<AnalysisResultView state="loading" analysis={null} saved />}><GithubAnalysisResult /></Suspense></GithubSessionGate></GithubSessionProvider>;
}
