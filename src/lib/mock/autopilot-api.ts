import type { AutopilotApi } from "@/lib/api/autopilot-api";
import type { DevelopmentPlan, ExecutionRecord, Repository } from "@/types/domain";

const repositories: Repository[] = [
  { id: "repo-atlas", owner: "northstar-labs", name: "atlas-console", fullName: "northstar-labs/atlas-console", description: "An operations dashboard for distributed product teams.", defaultBranch: "main", isPrivate: true, updatedAt: "2026-10-25T14:20:00.000Z", openIssueCount: 12 },
  { id: "repo-beacon", owner: "northstar-labs", name: "beacon-api", fullName: "northstar-labs/beacon-api", description: "A typed service layer for notifications and event delivery.", defaultBranch: "main", isPrivate: false, updatedAt: "2026-10-22T09:10:00.000Z", openIssueCount: 7 },
];

const plans: DevelopmentPlan[] = [{
  id: "demo-plan", repositoryId: "repo-atlas", analysisRunId: "analysis-demo", title: "Make project onboarding predictable",
  goal: "Reduce setup friction by documenting prerequisites and validating the local environment.", status: "ready_for_review", createdAt: "2026-10-27T09:30:00.000Z",
  tasks: [
    { id: "task-1", title: "Document the local development prerequisites", description: "Capture runtime versions, required environment variables, and first-run steps in the repository guide.", priority: "high", dependsOn: [], acceptanceCriteria: ["A new contributor can identify the supported Node.js version.", "Required environment variables are documented without exposing secrets."], status: "proposed" },
    { id: "task-2", title: "Add a setup health check", description: "Provide a repeatable command that catches missing configuration before the application starts.", priority: "medium", dependsOn: ["task-1"], acceptanceCriteria: ["The check exits successfully for a valid local setup.", "Missing required configuration produces an actionable message."], status: "proposed" },
    { id: "task-3", title: "Clarify the first-run troubleshooting path", description: "Link common local setup errors to concise recovery steps.", priority: "low", dependsOn: ["task-1"], acceptanceCriteria: ["The onboarding guide includes at least three common setup issues."], status: "proposed" },
  ],
}];

const executions: ExecutionRecord[] = [{ id: "execution-demo", planId: "demo-plan", status: "queued", issueUrls: [], createdAt: "2026-10-27T09:31:00.000Z" }];

export const mockAutopilotApi: AutopilotApi = {
  async listRepositories() { return repositories; },
  async listPlans() { return plans; },
  async getPlan(planId) { return plans.find((plan) => plan.id === planId) ?? null; },
  async listExecutionRecords(planId) { return executions.filter((execution) => execution.planId === planId); },
};