"use client";

import { ArrowRight, Check, ExternalLink, GitBranch, LoaderCircle, Sparkles } from "lucide-react";
import { Button, Card } from "@/components/ui/primitives";
import type { RepositoryWorkspace } from "./use-repository-workspace";
import styles from "./repository-analysis-panel.module.css";

export function RepositoryAnalysisPanel({ workspace }: { workspace: RepositoryWorkspace }) {
  const { selectedRepository, goal, setGoal, analysisState, analysisError, analyzeRepository, cancelAnalysis } = workspace;
  const analyzing = analysisState === "loading";
  const openingResult = analysisState === "done";

  return <div id="analysis" className={styles.panelAnchor}>
    <Card className={styles.panel}>
      <span className={styles.icon}><Sparkles size={21} aria-hidden="true" /></span>
      <p className={styles.eyebrow}>YOUR NEXT STEP</p>
      <h2>저장소 분석하기</h2>
      {selectedRepository ? <>
        <p className={styles.description}>선택한 코드베이스에서 다음 개발 방향을 찾아보세요.</p>
        <div className={styles.repository}>
          <span className={styles.selectedLabel}><Check size={13} aria-hidden="true" /> 선택한 저장소</span>
          <strong>{selectedRepository.fullName}</strong>
          <span className={styles.branch}><GitBranch size={13} aria-hidden="true" /> {selectedRepository.defaultBranch || "기본 브랜치 없음"}</span>
          <a href={selectedRepository.htmlUrl} target="_blank" rel="noopener noreferrer">GitHub에서 보기 <ExternalLink size={12} aria-hidden="true" /></a>
        </div>
        <div className={styles.goalField}>
          <label htmlFor="dashboard-analysis-goal">개발 목표 <small>선택 사항</small></label>
          <textarea id="dashboard-analysis-goal" value={goal} onChange={(event) => setGoal(event.target.value)} rows={4} maxLength={2000} disabled={analyzing || openingResult} aria-describedby="dashboard-goal-help" placeholder="예: 로그인 흐름의 오류 처리를 개선하고 싶어요." />
          <div className={styles.goalHelp} id="dashboard-goal-help"><span>비워 두면 저장소 전반의 개선 항목을 제안합니다.</span><span>{goal.length.toLocaleString("ko-KR")} / 2,000</span></div>
        </div>
        <p className={styles.consent}>분석을 시작하면 선택한 저장소의 README와 일부 소스 코드가 Meta 모델에 전달됩니다.</p>
        <Button className={styles.analyzeButton} disabled={analyzing || openingResult} onClick={() => void analyzeRepository()}>{analyzing || openingResult ? <LoaderCircle size={16} className={styles.spin} aria-hidden="true" /> : <Sparkles size={16} aria-hidden="true" />}{analyzing ? "저장소 분석 중…" : openingResult ? "분석 결과 여는 중…" : "선택한 저장소 분석하기"}{!analyzing && !openingResult && <ArrowRight size={15} aria-hidden="true" />}</Button>
        {analyzing && <div className={styles.progress}><p role="status">문서와 코드를 확인하고 있어요.<br />최대 2분 정도 걸릴 수 있습니다.</p><Button variant="quiet" onClick={cancelAnalysis}>분석 취소</Button></div>}
        {analysisError && <p className={styles.error} role="alert">{analysisError}</p>}
      </> : <>
        <p className={styles.description}>분석할 저장소를 선택하면<br />개발 목표를 입력하고 바로 시작할 수 있어요.</p>
        <div className={styles.empty}><span className={styles.emptyIcon}><GitBranch size={25} aria-hidden="true" /></span><strong>먼저 저장소를 선택해 주세요</strong><p>저장소 목록에서 분석할 프로젝트를 골라주세요.</p></div>
        <div className={styles.controlNote}><Check size={14} aria-hidden="true" /> 분석은 직접 시작할 때만 실행됩니다.</div>
      </>}
    </Card>
  </div>;
}
