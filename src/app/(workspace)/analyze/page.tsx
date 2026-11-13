import { AnalyzeView } from "@/features/analysis/analyze-view";

export default async function AnalyzePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const repositoryId = typeof params.repositoryId === "string" ? params.repositoryId : params.repositoryId === undefined ? null : "";
  return <AnalyzeView repositoryId={repositoryId} />;
}
