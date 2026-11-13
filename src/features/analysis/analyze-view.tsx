"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, FileCode2, FileText, GitBranch, ListChecks, LoaderCircle, RefreshCw, ShieldCheck } from "lucide-react";
import { Button, Card, PageHeading } from "@/components/ui/primitives";
import { useRepositoryWorkspaceContext } from "@/features/workspace/repository-workspace-context";
import { RepositoryAnalysisPanel } from "./repository-analysis-panel";
import { AnalysisHistory } from "./analysis-history";
import styles from "./analyze-view.module.css";

export function AnalyzeView({ repositoryId }: { repositoryId: string | null }) {
  const router = useRouter();
  const workspace = useRepositoryWorkspaceContext();
  const { repositories, repositoryState, repositoryError, loadingMore, hasNextPage, selectedId, selectedRepository, selectRepository, ensureRepositorySelected, selectionState, selectionError, analysisState, refreshRepositories, loadMoreRepositories } = workspace;
  const hasRequestedRepository = repositoryId !== null;
  const requestedRepositorySelected = !hasRequestedRepository || selectedId === repositoryId;
  const resolving = hasRequestedRepository && !requestedRepositorySelected && selectionState !== "error";
  const canAnalyzeSelection = selectedRepository && requestedRepositorySelected && !resolving;
  const busy = analysisState === "loading" || analysisState === "done";

  useEffect(() => {
    if (repositoryId !== null) void ensureRepositorySelected(repositoryId);
  }, [repositoryId, ensureRepositorySelected]);

  function chooseRepository(id: string) {
    if (!id) return;
    selectRepository(id);
    router.replace(`/analyze?repositoryId=${encodeURIComponent(id)}`, { scroll: false });
  }

  return <>
    <PageHeading eyebrow="NEW ANALYSIS" title="새 분석" description="저장소와 개발 목표를 정하고, 분석 결과를 검토하세요." actions={<Button href="/repositories" variant="secondary"><GitBranch size={15} /> 저장소 목록</Button>} />
    <div className={styles.analysisGrid}>
      <div className={styles.formColumn}>
        <Card className={styles.selector}>
          <div className={styles.stepLabel}>01 · 분석 대상</div>
          <h2>어떤 저장소를 분석할까요?</h2>
          <label htmlFor="analysis-repository">GitHub 저장소</label>
          <select id="analysis-repository" value={requestedRepositorySelected ? selectedId ?? "" : ""} disabled={repositoryState === "loading" || busy} onChange={(event) => chooseRepository(event.target.value)} aria-describedby="repository-selection-help">
            <option value="" disabled>분석할 저장소를 선택하세요</option>
            {repositories.map((repository) => <option key={repository.id} value={repository.id}>{repository.fullName}</option>)}
          </select>
          <p className={styles.help} id="repository-selection-help">저장소 화면에서 고른 프로젝트가 자동으로 이어집니다.</p>
          {(repositoryState === "loading" || resolving) && <p className={styles.status} role="status"><LoaderCircle size={15} className={styles.spin} /> {resolving ? "선택한 저장소를 확인하고 있어요…" : "저장소를 불러오고 있어요…"}</p>}
          {hasRequestedRepository && !requestedRepositorySelected && selectionState === "error" && <p className={styles.error} role="alert">{selectionError || "선택한 저장소를 확인할 수 없습니다. 저장소 목록에서 다시 선택해 주세요."}</p>}
          {repositoryError && <div className={styles.error} role="alert">{repositoryError}<Button variant="quiet" disabled={busy} onClick={() => { void refreshRepositories().then(() => { if (repositoryId !== null) void ensureRepositorySelected(repositoryId); }); }}><RefreshCw size={13} /> 다시 불러오기</Button></div>}
          {repositoryState === "ready" && repositories.length === 0 && !resolving && <p className={styles.help}>조회 가능한 저장소가 없습니다. 저장소 목록에서 접근 권한을 확인해 주세요.</p>}
          <div className={styles.selectorActions}><Button href="/repositories" variant="quiet">저장소 목록에서 선택 <ArrowRight size={13} /></Button>{hasNextPage && <Button variant="secondary" disabled={loadingMore || busy || selectionState === "loading"} onClick={() => void loadMoreRepositories()}>{loadingMore ? "불러오는 중…" : "저장소 더 불러오기"}</Button>}</div>
        </Card>
        {canAnalyzeSelection && <RepositoryAnalysisPanel workspace={workspace} />}
      </div>

      <Card className={styles.context}>
        <span className={styles.stepLabel}>분석 안내</span>
        <h2>코드에서 개발 방향으로</h2>
        <p>목표를 구체적으로 적으면 해결하려는 문제에 맞춰 개선 항목을 제안합니다.</p>
        <ul>
          <li><FileText size={19} aria-hidden="true" /><div><strong>프로젝트 문서</strong><span>README에서 목적과 사용 맥락을 확인합니다.</span></div></li>
          <li><FileCode2 size={19} aria-hidden="true" /><div><strong>선택된 소스 코드</strong><span>일부 파일을 읽고 파일·줄 번호로 근거를 연결합니다.</span></div></li>
          <li><ListChecks size={19} aria-hidden="true" /><div><strong>검토할 수 있는 제안</strong><span>우선순위, 구현 단계, 완료 기준을 정리합니다.</span></div></li>
        </ul>
        <p className={styles.control}><ShieldCheck size={16} aria-hidden="true" /> 분석은 시작 버튼을 누를 때만 실행됩니다.</p>
      </Card>
    </div>
    {canAnalyzeSelection && <AnalysisHistory key={selectedId} repositoryId={selectedId ?? undefined} />}
  </>;
}
