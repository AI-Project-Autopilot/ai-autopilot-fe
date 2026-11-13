"use client";

import { useLanguage } from "@/components/i18n/language-provider";
import { Button, PageHeading } from "@/components/ui/primitives";
import { TaskList } from "./task-list";

export function TasksView({ repositoryId, analysisId }: { repositoryId?: string; analysisId?: string }) {
  const { t } = useLanguage();
  return <><PageHeading eyebrow={t("작업 내역", "TASK TRACKING")} title={t("선택한 작업", "Selected tasks")} description={t("선택한 작업을 검토하고 진행 상태와 GitHub 이슈를 관리하세요.", "Review selected tasks and manage their progress and GitHub issues.")} actions={<Button href="/dashboard" variant="secondary">{t("분석 기록 보기", "View analyses")}</Button>} /><TaskList repositoryId={repositoryId} analysisId={analysisId} /></>;
}
