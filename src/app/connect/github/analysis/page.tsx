"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
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

const priorityLabels: Record<RecommendationPriority, string> = {
  high: "높음",
  medium: "보통",
  low: "낮음",
};

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

function parseStoredAnalysis(stored: string | null): {
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
    return {
      state: "ready",
      analysis: parseGithubRepositoryAnalysis(record.analysis, record.repositoryId as string),
    };
  } catch {
    return { state: "invalid", analysis: null };
  }
}

export default function GithubAnalysisPage() {
  const stored = useSyncExternalStore(
    subscribeToAnalysisStorage,
    getStoredAnalysis,
    getServerAnalysisSnapshot,
  );
  const { state, analysis } = parseStoredAnalysis(stored);

  return (
    <main className={styles.screen}>
      <div className={styles.container}>
        <header className={styles.header}>
          <Link href="/dashboard" className={styles.brand}>autopilot<span>.</span></Link>
          <span className={styles.topLabel}>분석 결과</span>
        </header>
        <div className={styles.card}>
          <div className={styles.iconBox}><GitBranch size={30} aria-hidden="true" /></div>
          <p className={styles.eyebrow}>REPOSITORY ANALYSIS</p>
          <h1>저장소 분석 결과</h1>

          {state === "loading" && <div className={styles.loading} role="status"><LoaderCircle className={styles.spin} size={18} /> 분석 결과를 불러오고 있어요…</div>}
          {state === "missing" && <div className={styles.alert} role="alert">이 브라우저 세션에서 분석 결과를 찾을 수 없습니다. 저장소 화면에서 다시 분석해 주세요.</div>}
          {state === "invalid" && <div className={styles.alert} role="alert">분석 결과를 표시할 수 없습니다. 저장소 화면에서 다시 분석해 주세요.</div>}

          {analysis && state === "ready" && <section className={styles.analysisResults} aria-labelledby="analysis-results-heading">
            <div className={styles.resultHeading}>
              <h2 id="analysis-results-heading">{analysis.repository.fullName}</h2>
              <a className={styles.inlineLink} href={`${analysis.repository.htmlUrl}/tree/${encodeURIComponent(analysis.repository.commitSha)}`} target="_blank" rel="noopener noreferrer">분석 기준 커밋 {analysis.repository.commitSha.slice(0, 7)} <ExternalLink size={13} /></a>
            </div>
            <p className={styles.analysisSummary}>{analysis.summary}</p>
            <div className={styles.resultMeta}><span>{new Date(analysis.generatedAt).toLocaleString("ko-KR")}</span><span>분석 모델: {analysis.model}</span></div>
            <h3>추천 개발 항목</h3>
            <ol className={styles.recommendationList}>{analysis.recommendations.map((recommendation) => <li className={styles.recommendation} key={recommendation.id}>
              <div className={styles.recommendationHeading}><h4>{recommendation.title}</h4><span className={`${styles.priority} ${priorityStyles[recommendation.priority]}`}>우선순위 {priorityLabels[recommendation.priority]}</span></div>
              <p className={styles.rationale}>{recommendation.rationale}</p>
              <h5>구현 단계</h5>
              <ol className={styles.resultSteps}>{recommendation.implementationSteps.map((step, index) => <li key={index}>{step}</li>)}</ol>
              <h5>완료 기준</h5>
              <ul className={styles.resultSteps}>{recommendation.acceptanceCriteria.map((criterion, index) => <li key={index}>{criterion}</li>)}</ul>
              {recommendation.evidence.length > 0 && <><h5>코드 근거</h5>{recommendation.evidence.map((evidence, index) => <details className={styles.evidence} key={index}>
                <summary>{evidence.path}:{evidence.startLine}–{evidence.endLine}</summary>
                <a className={styles.inlineLink} href={evidence.url} target="_blank" rel="noopener noreferrer">해당 커밋의 파일에서 확인 <ExternalLink size={13} /></a>
                <pre><code>{evidence.excerpt}</code></pre>
              </details>)}</>}
            </li>)}</ol>
            <details className={styles.contextDetails}>
              <summary>분석에 사용한 파일 {analysis.context.filesRead.length}개 확인</summary>
              <p>조회된 파일 {analysis.context.totalFiles.toLocaleString()}개 중 {analysis.context.skippedFiles.toLocaleString()}개는 이번 분석에서 제외되었습니다.</p>
              <ul>{analysis.context.filesRead.map((file) => <li key={file.path}><strong>{file.path}</strong><span>{file.bytes.toLocaleString()}바이트 · {file.lineCount.toLocaleString()}줄{file.truncated ? " · 일부 내용만 읽음" : ""}</span></li>)}</ul>
            </details>
            {(analysis.context.treeTruncated || analysis.context.warnings.length > 0) && <div className={styles.contextWarnings} role="note">
              <strong>분석 범위 안내</strong>
              {analysis.context.treeTruncated && <p>파일 목록 일부만 조회되어 저장소 전체를 확인하지 못했습니다.</p>}
              {analysis.context.warnings.length > 0 && <ul>{analysis.context.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul>}
            </div>}
          </section>}

          <Link className={styles.secondaryButton} href="/connect/github"><ArrowLeft size={16} /> 저장소 화면으로</Link>
        </div>
        <footer className={styles.footer}><ShieldCheck size={16} /> 분석 결과는 현재 브라우저 탭에만 보관됩니다. <Link href="/dashboard">대시보드로 이동</Link></footer>
      </div>
    </main>
  );
}