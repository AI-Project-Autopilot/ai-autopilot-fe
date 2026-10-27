import type { DevelopmentPlan, ExecutionRecord, Repository } from "@/types/domain";

// Implement this contract with server-side HTTP calls when the NestJS API is ready.
export interface AutopilotApi {
  listRepositories(): Promise<Repository[]>;
  listPlans(): Promise<DevelopmentPlan[]>;
  getPlan(planId: string): Promise<DevelopmentPlan | null>;
  listExecutionRecords(planId: string): Promise<ExecutionRecord[]>;
}