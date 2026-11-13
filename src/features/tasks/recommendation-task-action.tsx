"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, GitPullRequest, LoaderCircle } from "lucide-react";
import { getGithubAccountKey, useGithubSession } from "@/components/auth/github-session";
import { useLanguage } from "@/components/i18n/language-provider";
import { Button } from "@/components/ui/primitives";
import { ApiError } from "@/lib/api/github-connect-api";
import { createTrackedTaskIssue, selectAnalysisTask } from "@/lib/api/tracked-task-api";
import { taskErrorMessage } from "./task-messages";
import styles from "./tasks.module.css";

export function RecommendationTaskAction({ analysisId, recommendationId }: { analysisId: string | null; recommendationId: string }) {
  const { user } = useGithubSession();
  const { t } = useLanguage();
  if (!analysisId) return <p className={styles.note}>{t("이전 탭 보관본에서는 이슈를 생성할 수 없습니다. 대시보드의 저장된 분석 기록에서 열어 주세요.", "Open this analysis from your saved dashboard history to create an issue for a task.")}</p>;
  return <AccountTaskAction key={`${getGithubAccountKey(user)}:${analysisId}:${recommendationId}`} analysisId={analysisId} recommendationId={recommendationId} />;
}
function AccountTaskAction({ analysisId, recommendationId }: { analysisId: string; recommendationId: string }) {
  const { t } = useLanguage();
  const { markUnauthenticated } = useGithubSession();
  const router = useRouter();
  const [busy, setBusy] = useState<"saving" | "publishing" | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [savedTaskId, setSavedTaskId] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  async function publish() {
    if (request.current) return;
    const controller = new AbortController(); request.current = controller;
    setBusy("saving"); setError(null);
    try {
      const task = await selectAnalysisTask(analysisId, recommendationId, controller.signal);
      if (controller.signal.aborted) return;
      setSavedTaskId(task.id);
      setBusy("publishing");
      const linkedTask = await createTrackedTaskIssue(task.id, controller.signal);
      if (controller.signal.aborted) return;
      router.push(`/tasks/${linkedTask.id}`);
    } catch (failure: unknown) {
      if (controller.signal.aborted) return;
      if (failure instanceof ApiError && failure.status === 401) { markUnauthenticated(); return; }
      setError(failure);
    } finally {
      if (!controller.signal.aborted) setBusy(null);
      if (request.current === controller) request.current = null;
    }
  }
  return <div className={styles.selectionAction}>
    <Button disabled={busy !== null} onClick={() => void publish()}>{busy ? <LoaderCircle className={styles.spin} size={15} /> : <GitPullRequest size={15} />}{busy === "saving" ? t("작업 저장 중…", "Saving task…") : busy === "publishing" ? t("GitHub 이슈 등록 중…", "Creating GitHub issue…") : t("이 작업으로 GitHub 이슈 생성", "Create GitHub issue for this task")}</Button>
    <span className={styles.note}>{t("추천 작업을 저장하고 분석한 저장소에 GitHub 이슈를 바로 생성합니다. 이미 저장한 작업은 저장된 내용을 사용하며, 등록된 이슈는 중복 생성하지 않습니다.", "Saves this recommendation and immediately creates its GitHub issue in the analyzed repository. Existing tasks use their saved content, and published issues are reused without duplication.")}</span>
    {error !== null && <div className={styles.error} role="alert"><p>{taskErrorMessage(error, t)}</p>{savedTaskId && <><p>{t("선택한 작업은 저장되어 있습니다. 작업 화면에서 등록 상태를 확인하거나 다시 시도할 수 있습니다.", "Your selected task is saved. Open it to check the creation state or retry.")}</p><Link className={styles.inlineLink} href={`/tasks/${savedTaskId}`}>{t("저장한 작업에서 등록 상태 확인", "Check the saved task")} <ArrowRight size={13} /></Link></>}</div>}
  </div>;
}
