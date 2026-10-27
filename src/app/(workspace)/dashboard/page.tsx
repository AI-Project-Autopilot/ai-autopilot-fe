import { DashboardView } from "@/features/dashboard/dashboard-view";
import { mockAutopilotApi } from "@/lib/mock/autopilot-api";

export default async function DashboardPage() {
  const [repositories, plans] = await Promise.all([
    mockAutopilotApi.listRepositories(),
    mockAutopilotApi.listPlans(),
  ]);
  return <DashboardView repositories={repositories} plans={plans} />;
}