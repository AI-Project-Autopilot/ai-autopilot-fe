"use client";

import { useSyncExternalStore } from "react";
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
  GITHUB_ANALYSIS_STORAGE_KEY,
  parseGithubRepositoryAnalysis,
  type GithubRepositoryAnalysis,
} from "@/lib/api/github-connect-api";
import styles from "../page.module.css";

type ResultState = "loading" | "ready" | "missing" | "invalid";
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

function GithubAnalysisResult() {
  const { user } = useGithubSession();
  const { t, locale } = useLanguage();
  const priorityLabels: Record<RecommendationPriority, string> = {
    high: t("높음", "High"),
    medium: t("보통", "Medium"),
    low: t("낮음", "Low"),
  };
  const stored = useSyncExternalStore(
    subscribeToAnalysisStorage,
    getStoredAnalysis,
    getServerAnalysisSnapshot,
  );
  const { state, analysis } = parseStoredAnalysis(stored, getGithubAccountKey(user));

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
          {state === "missing" && <div className={styles.alert} role="alert">{t("이 브라우저 세션에서 분석 결과를 찾을 수 없습니다. 저장소 목록에서 대상을 선택해 다시 분석해 주세요.", "No analysis result was found in this browser session. Choose a repository and run an analysis again.")}</div>}
          {state === "invalid" && <div className={styles.alert} role="alert">{t("분석 결과를 표시할 수 없습니다. 저장소 목록에서 대상을 선택해 다시 분석해 주세요.", "This analysis result cannot be displayed. Choose a repository and run an analysis again.")}</div>}

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
        <footer className={styles.footer}><ShieldCheck size={16} /> {t("이 화면의 분석 결과는 현재 브라우저 탭에 보관됩니다.", "This result view is stored in the current browser tab.")} <Link href="/dashboard">{t("대시보드로 이동", "Open dashboard")}</Link></footer>
      </div>
    </main>
  );
}

export default function GithubAnalysisPage() {
  return <GithubSessionProvider><GithubSessionGate><GithubAnalysisResult /></GithubSessionGate></GithubSessionProvider>;
}
