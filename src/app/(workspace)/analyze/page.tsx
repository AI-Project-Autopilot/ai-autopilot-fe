import { AnalyzeView } from "@/features/analysis/analyze-view";
import { mockAutopilotApi } from "@/lib/mock/autopilot-api";

export default async function AnalyzePage() {
  return <AnalyzeView repositories={await mockAutopilotApi.listRepositories()} />;
}