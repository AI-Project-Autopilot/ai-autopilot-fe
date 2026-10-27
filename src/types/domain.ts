// Proposed frontend contract only; confirm field names and status values with the NestJS API.
export type Repository = {
  id: string;
  owner: string;
  name: string;
  fullName: string;
  description: string;
  defaultBranch: string;
  isPrivate: boolean;
  updatedAt: string;
  openIssueCount: number;
};

export type AnalysisRun = { id: string; repositoryId: string; status: "queued" | "running" | "completed" | "failed"; createdAt: string; summary?: string };
export type PlannedTask = { id: string; title: string; description: string; priority: "high" | "medium" | "low"; dependsOn: string[]; acceptanceCriteria: string[]; status: "proposed" | "approved" | "created" | "done" };
export type DevelopmentPlan = { id: string; repositoryId: string; analysisRunId: string; title: string; goal: string; status: "draft" | "ready_for_review" | "approved" | "executing" | "complete"; createdAt: string; tasks: PlannedTask[] };
export type ExecutionRecord = { id: string; planId: string; status: "queued" | "running" | "completed" | "failed"; issueUrls: string[]; createdAt: string; completedAt?: string };