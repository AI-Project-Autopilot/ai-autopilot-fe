import { ApiError } from "@/lib/api/github-connect-api";
import type { TrackedTaskStatus } from "@/lib/api/tracked-task-api";

type Translate = (ko: string, en: string) => string;
export function taskStatusLabel(status: TrackedTaskStatus, t: Translate) {
  const labels = {
    selected: ["선택됨", "Selected"], in_progress: ["진행 중", "In progress"],
    completed: ["완료", "Completed"], cancelled: ["취소됨", "Cancelled"],
  } as const;
  return t(labels[status][0], labels[status][1]);
}
export function taskErrorMessage(error: unknown, t: Translate): string {
  if (error instanceof ApiError) {
    if (error.status === 400) return t("입력한 제목, 본문 또는 이슈 번호를 확인해 주세요.", "Check the title, body, or issue number.");
    if (error.status === 403) return t("이 저장소의 작업 또는 이슈에 접근할 권한이 없습니다. GitHub 권한을 확인해 주세요.", "You do not have access to this repository or its issues. Check your GitHub permissions.");
    if (error.status === 404) return t("작업 또는 이슈를 찾을 수 없거나 접근 권한이 없습니다.", "The task or issue was not found or is not accessible.");
    if (error.status === 409) return t("작업 상태가 변경되었거나 이슈 등록 결과를 확인 중입니다. 현재 상태를 확인한 뒤 다시 시도해 주세요.", "The task has changed or issue creation is being checked. Review its current state and try again.");
    if (error.status === 410 || error.status === 422) return t("이 저장소에서 이슈를 사용할 수 없거나 요청한 이슈를 연결할 수 없습니다.", "Issues may be disabled for this repository, or this issue cannot be linked.");
    if (error.status === 429) return t("GitHub 요청 한도에 도달했습니다. 잠시 후 다시 시도해 주세요.", "The GitHub rate limit has been reached. Try again shortly.");
    if (error.status === 502 || error.status === 504) return t("GitHub 응답을 확인하지 못했습니다. 아래 등록 상태를 확인한 뒤 다시 시도해 주세요.", "The GitHub response could not be confirmed. Check the issue creation state below before retrying.");
  }
  return t("요청을 완료하지 못했습니다. 입력 내용은 유지됩니다. 연결 상태를 확인한 뒤 다시 시도해 주세요.", "The request could not be completed. Your draft is preserved. Check your connection and try again.");
}
