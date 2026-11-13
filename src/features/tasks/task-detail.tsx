"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink, GitBranch, GitPullRequest, LoaderCircle, RefreshCw, Save } from "lucide-react";
import { getGithubAccountKey, useGithubSession } from "@/components/auth/github-session";
import { useLanguage } from "@/components/i18n/language-provider";
import { Button, Card, PageHeading, StatusBadge } from "@/components/ui/primitives";
import { ApiError } from "@/lib/api/github-connect-api";
import { createTrackedTaskIssue, fetchTrackedTask, linkTrackedTaskIssue, syncTrackedTaskIssue, updateTrackedTask, type TrackedTask, type TrackedTaskStatus } from "@/lib/api/tracked-task-api";
import { taskErrorMessage, taskStatusLabel } from "./task-messages";
import styles from "./tasks.module.css";

type Draft = { title: string; body: string; status: TrackedTaskStatus };
type Action = "save" | "create" | "sync" | "link";
const statuses: TrackedTaskStatus[] = ["selected", "in_progress", "completed", "cancelled"];

export function TaskDetail({ taskId }: { taskId: string }) {
  const { user, status, loggingOut } = useGithubSession();
  const accountKey = getGithubAccountKey(user);
  if (status !== "authenticated" || !accountKey || loggingOut) return null;
  return <AccountTaskDetail key={`${accountKey}:${taskId}`} taskId={taskId} />;
}
function AccountTaskDetail({ taskId }: { taskId: string }) {
  const { t, locale } = useLanguage();
  const { markUnauthenticated } = useGithubSession();
  const [task, setTask] = useState<TrackedTask | null>(null);
  const [draft, setDraft] = useState<Draft>({ title: "", body: "", status: "selected" });
  const [error, setError] = useState<unknown>(null);
  const [loaded, setLoaded] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState<Action | null>(null);
  const [notice, setNotice] = useState<"saved" | "created" | "synced" | "linked" | null>(null);
  const [issueNumber, setIssueNumber] = useState("");
  const mutation = useRef<AbortController | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    void fetchTrackedTask(taskId, controller.signal).then((result) => {
      if (controller.signal.aborted) return;
      setTask(result); setDraft({ title: result.title, body: result.body, status: result.status });
      setLoaded(true); setError(null);
    }).catch((failure: unknown) => {
      if (controller.signal.aborted) return;
      if (failure instanceof ApiError && failure.status === 401) { markUnauthenticated(); return; }
      setError(failure); setLoaded(true);
    });
    return () => controller.abort();
  }, [taskId, attempt, markUnauthenticated]);
  useEffect(() => () => mutation.current?.abort(), []);

  const locked = task !== null && (task.issueUrl !== null || task.issueCreationState !== "none");
  const invalidDraft = !draft.title.trim() || draft.title.length > 200 || draft.body.length > 30000;
  const dirty = task !== null && (draft.title !== task.title || draft.body !== task.body || draft.status !== task.status);

  async function run(action: Action, operation: (signal: AbortSignal) => Promise<TrackedTask>) {
    if (mutation.current || !task) return;
    const controller = new AbortController(); mutation.current = controller;
    setBusy(action); setError(null); setNotice(null);
    try {
      const result = await operation(controller.signal);
      if (controller.signal.aborted) return;
      setTask(result);
      setDraft({ title: result.title, body: result.body, status: result.status });
      setNotice(action === "save" ? "saved" : action === "create" ? "created" : action === "sync" ? "synced" : "linked");
    } catch (failure: unknown) {
      if (controller.signal.aborted) return;
      if (failure instanceof ApiError && failure.status === 401) { markUnauthenticated(); return; }
      setError(failure);
      // A write or GitHub request can commit before its response is lost. Reload
      // server state while preserving an editable draft for recovery. Once issue
      // creation starts, show the persisted content associated with that issue.
      try {
        const current = await fetchTrackedTask(taskId, controller.signal);
        if (!controller.signal.aborted) {
          setTask(current);
          if (current.issueUrl !== null || current.issueCreationState !== "none") {
            setDraft({ title: current.title, body: current.body, status: current.status });
          }
        }
      } catch (refreshFailure) {
        if (!controller.signal.aborted && refreshFailure instanceof ApiError && refreshFailure.status === 401) markUnauthenticated();
      }
    } finally {
      if (!controller.signal.aborted) setBusy(null);
      if (mutation.current === controller) mutation.current = null;
    }
  }
  function save() {
    void run("save", signal => updateTrackedTask(taskId, locked ? { status: draft.status } : { title: draft.title.trim(), body: draft.body, status: draft.status }, signal));
  }
  function createIssue() {
    if (!task) return;
    const creationState = task.issueCreationState;
    void run("create", async (signal) => {
      if (creationState === "none") await updateTrackedTask(taskId, { title: draft.title.trim(), body: draft.body, status: draft.status }, signal);
      return createTrackedTaskIssue(taskId, signal);
    });
  }
  if (!loaded) return <Card className={styles.feedback}><LoaderCircle className={styles.spin} size={20} /><p role="status">{t("저장한 작업을 불러오고 있어요…", "Loading your saved task…")}</p></Card>;
  if (!task) return <><PageHeading eyebrow={t("선택한 작업", "SELECTED TASK")} title={t("작업을 불러올 수 없습니다", "Could not load this task")} description={error instanceof ApiError && error.status === 404 ? t("이 작업이 없거나 현재 계정에 접근 권한이 없습니다.", "This task was not found or is not accessible to your account.") : taskErrorMessage(error, t)} /><div className={styles.actions}><Button href="/tasks" variant="secondary">{t("작업 목록", "Task list")}</Button><Button onClick={() => { setLoaded(false); setError(null); setAttempt(current => current + 1); }}>{t("다시 시도", "Try again")}</Button></div></>;
  const issuePending = !task.issueUrl && (task.issueCreationState === "creating" || task.issueCreationState === "uncertain");
  const priorityLabels = { high: t("높음", "High"), medium: t("보통", "Medium"), low: t("낮음", "Low") };
  const previewTitle = locked ? task.title : draft.title.trim();
  const previewBody = locked ? task.body : draft.body;
  return <>
    <Link className={styles.inlineLink} href="/tasks"><ArrowLeft size={14} /> {t("선택한 작업 목록", "Selected tasks")}</Link>
    <PageHeading eyebrow={t("작업 검토 및 진행 관리", "TASK REVIEW & TRACKING")} title={task.title} description={task.issueUrl ? t("연결된 GitHub 이슈를 확인하고 작업의 진행 상태를 관리하세요.", "Open the linked GitHub issue and track the progress of this task.") : t("저장된 작업과 이슈 등록 상태를 확인하고, 필요한 내용을 수정해 다시 시도하세요.", "Review the saved task and issue creation state, or edit the draft before retrying.")} actions={<StatusBadge tone={task.status === "completed" ? "success" : task.status === "in_progress" ? "info" : "neutral"}>{taskStatusLabel(task.status, t)}</StatusBadge>} />
    <Card className={styles.metadata}><span><GitBranch size={16} /> <strong>{task.fullName}</strong></span><span>{t("우선순위", "Priority")}: {priorityLabels[task.priority]}</span><Link className={styles.inlineLink} href={`/connect/github/analysis?analysisId=${task.analysisId}`}>{t("원본 AI 분석 보기", "View source analysis")} <ExternalLink size={13} /></Link><time dateTime={task.updatedAt}>{t("마지막 저장", "Last saved")}: {new Date(task.updatedAt).toLocaleString(locale)}</time></Card>
    {error !== null && <div className={styles.error} role="alert">{taskErrorMessage(error, t)}</div>}
    {notice && <p className={styles.success} role="status">{notice === "saved" ? t("작업을 저장했습니다.", "Task saved.") : notice === "created" ? task.issueUrl ? t("GitHub 이슈가 연결되었습니다.", "GitHub issue connected.") : t("현재 등록 상태를 확인했습니다. 아래 안내를 확인해 주세요.", "The current creation state was checked. Review the details below.") : notice === "synced" ? t("GitHub 이슈 상태를 갱신했습니다.", "GitHub issue status refreshed.") : t("기존 GitHub 이슈를 연결했습니다.", "Existing GitHub issue linked.")}</p>}
    <div className={styles.detailGrid}>
      <Card className={styles.editor}>
        <div className={styles.sectionHeading}><div><span className={styles.eyebrow}>{t("검토할 내용", "REVIEW DRAFT")}</span><h2>{t("제목과 본문", "Title and body")}</h2></div>{dirty && <span className={styles.note}>{t("저장되지 않은 변경 사항", "Unsaved changes")}</span>}</div>
        <label htmlFor="task-title">{t("작업 제목", "Task title")}</label>
        <input id="task-title" value={locked ? task.title : draft.title} maxLength={200} disabled={busy !== null || locked} onChange={event => setDraft(current => ({ ...current, title: event.target.value }))} />
        <label htmlFor="task-body">{t("GitHub 이슈 본문", "GitHub issue body")}</label>
        <textarea id="task-body" value={locked ? task.body : draft.body} rows={18} maxLength={30000} disabled={busy !== null || locked} onChange={event => setDraft(current => ({ ...current, body: event.target.value }))} />
        <p className={styles.note}>{locked ? t("이슈가 등록되었거나 등록 결과를 확인 중이므로 제목과 본문은 잠겨 있습니다. GitHub의 내용은 연결된 이슈에서 수정하세요.", "The title and body are locked after issue creation starts. Edit GitHub content in the linked issue.") : t("AI 초안을 검토하고 필요한 내용을 수정하세요. 본문은 GitHub에 Markdown으로 전달됩니다.", "Review and edit the AI draft. The body will be sent to GitHub as Markdown.")}</p>
        <label htmlFor="task-status">{t("작업 진행 상태", "Task progress")}</label>
        <select id="task-status" value={draft.status} disabled={busy !== null} onChange={event => setDraft(current => ({ ...current, status: event.target.value as TrackedTaskStatus }))}>{statuses.map(status => <option key={status} value={status}>{taskStatusLabel(status, t)}</option>)}</select>
        <p className={styles.note}>{t("진행 상태를 직접 변경할 수 있으며, 이슈 상태를 새로고침하면 GitHub의 닫힘·다시 열림에 맞춰 갱신됩니다. 작업 상태를 변경해도 GitHub 이슈가 닫히거나 열리지는 않으며, 코드 변경이나 테스트 완료를 검증하지 않습니다.", "You can update task progress manually. Refreshing the issue state also updates progress when the GitHub issue is closed or reopened. Changing task progress does not close or reopen the GitHub issue, or verify code changes or completed tests.")}</p>
        <div className={styles.actions}><Button disabled={busy !== null || (!locked && invalidDraft)} onClick={save}>{busy === "save" ? <LoaderCircle className={styles.spin} size={15} /> : <Save size={15} />}{t("변경 사항 저장", "Save changes")}</Button></div>
      </Card>
      <div className={styles.sideColumn}>
        <Card className={styles.review}>
          <span className={styles.eyebrow}>{locked ? t("저장된 작업 내용", "SAVED TASK CONTENT") : t("등록 전 최종 검토", "FINAL ISSUE REVIEW")}</span><h2>{locked ? t("작업 내용", "Task content") : t("GitHub에 등록할 내용", "Content to publish on GitHub")}</h2>
          <p className={styles.repositoryTarget}>{t("대상 저장소", "Target repository")}: <strong>{task.fullName}</strong></p>
          <div className={styles.preview} aria-label={t("이슈 내용 미리보기", "Issue content preview")}><strong lang={task.language}>{previewTitle || t("제목을 입력해 주세요", "Enter a title")}</strong><pre lang={task.language}>{previewBody || t("본문이 비어 있습니다.", "The issue body is empty.")}</pre></div>
          {locked && <p className={styles.note}>{t("앱에 저장된 작업 본문입니다. 최신 GitHub 이슈 내용은 연결된 이슈에서 확인하세요.", "This is the task content saved in the app. Open the linked issue for the latest GitHub content.")}</p>}
          {!task.issueUrl && !issuePending && <><p className={styles.note}>{t("아래 버튼을 누르면 검토한 내용을 저장한 뒤, 위 저장소에 제목과 본문이 같은 이슈 1개를 생성합니다.", "The button below saves your reviewed draft and creates one issue in the repository above with this title and body.")}</p><Button className={styles.fullButton} disabled={busy !== null || invalidDraft} onClick={createIssue}>{busy === "create" ? <LoaderCircle className={styles.spin} size={16} /> : <GitPullRequest size={16} />}{t("GitHub 이슈 생성", "Create GitHub issue")}</Button></>}
          {issuePending && <div className={styles.pending}><strong>{t("이슈 등록 결과 확인이 필요합니다", "Issue creation needs confirmation")}</strong><p>{t("GitHub 요청의 결과가 아직 확정되지 않았습니다. 등록 결과 확인은 기존 요청을 조회하며 새 이슈를 중복 생성하지 않습니다.", "The outcome of the GitHub request is not yet confirmed. Checking the result reconciles the existing request without creating another issue.")}</p><Button disabled={busy !== null} onClick={createIssue}>{busy === "create" && <LoaderCircle className={styles.spin} size={15} />}{t("등록 결과 확인", "Check creation result")}</Button></div>}
        </Card>
        <Card className={styles.issue}>
          <span className={styles.eyebrow}>GITHUB ISSUE</span><h2>{t("연결된 이슈", "Linked issue")}</h2>
          {task.issueUrl ? <><a className={styles.issueLink} href={task.issueUrl} target="_blank" rel="noopener noreferrer">{task.fullName} #{task.issueNumber} <ExternalLink size={15} /></a><div className={styles.issueMeta}><StatusBadge tone={task.issueState === "closed" ? "neutral" : "success"}>{task.issueState === "closed" ? t("GitHub에서 닫힘", "Closed on GitHub") : t("GitHub에서 열림", "Open on GitHub")}</StatusBadge><span>{t("최근 확인", "Last checked")}: {task.issueSyncedAt ? new Date(task.issueSyncedAt).toLocaleString(locale) : t("아직 확인하지 않음", "Not checked yet")}</span></div><p className={styles.note}>{t("이슈 상태를 새로고침하면 GitHub에서 완료로 닫은 이슈는 작업 완료, 계획 없음으로 닫은 이슈는 취소, 다시 연 이슈는 진행 중으로 반영됩니다.", "Refreshing reflects GitHub changes in task progress: closed as completed becomes Completed, closed as not planned becomes Cancelled, and reopened becomes In progress.")}</p><Button variant="secondary" disabled={busy !== null} onClick={() => void run("sync", signal => syncTrackedTaskIssue(taskId, signal))}><RefreshCw size={15} className={busy === "sync" ? styles.spin : undefined} />{t("이슈 상태 새로고침", "Refresh issue status")}</Button></> : <p className={styles.note}>{t("아직 연결된 GitHub 이슈가 없습니다.", "No GitHub issue is linked yet.")}</p>}
          {!task.issueUrl && <div className={styles.linkRecovery}><h3>{t("이미 등록된 이슈 연결", "Link an existing issue")}</h3><p className={styles.note}>{t("이미 등록된 이슈가 있다면 위 저장소의 이슈 번호를 입력하세요. 새 이슈를 생성하지 않고 기존 이슈를 연결합니다.", "If this work already has an issue, enter its number in the repository above. This links the existing issue without creating a new one.")}</p><label htmlFor="issue-number">{t("GitHub 이슈 번호", "GitHub issue number")}</label><input id="issue-number" type="text" inputMode="numeric" value={issueNumber} disabled={busy !== null} onChange={event => setIssueNumber(event.target.value)} placeholder="123" /><Button variant="secondary" disabled={busy !== null || !/^[1-9][0-9]*$/.test(issueNumber) || !Number.isSafeInteger(Number(issueNumber)) || Number(issueNumber) > 2147483647} onClick={() => void run("link", signal => linkTrackedTaskIssue(taskId, Number(issueNumber), signal))}>{t("기존 이슈 연결", "Link existing issue")}</Button></div>}
        </Card>
      </div>
    </div>
  </>;
}
