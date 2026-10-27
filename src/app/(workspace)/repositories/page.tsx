import { RepositoriesView } from "@/features/repositories/repositories-view";
import { mockAutopilotApi } from "@/lib/mock/autopilot-api";

export default async function RepositoriesPage() {
  return <RepositoriesView repositories={await mockAutopilotApi.listRepositories()} />;
}