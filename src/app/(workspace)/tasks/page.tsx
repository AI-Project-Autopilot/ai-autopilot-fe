import { TasksView } from "@/features/tasks/tasks-view";

export default async function TasksPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const repositoryId = typeof params.repositoryId === "string" ? params.repositoryId : undefined;
  const analysisId = typeof params.analysisId === "string" ? params.analysisId : undefined;
  return <TasksView repositoryId={repositoryId} analysisId={analysisId} />;
}
