import { notFound } from "next/navigation";
import { ExecutionView } from "@/features/execution/execution-view";
import { mockAutopilotApi } from "@/lib/mock/autopilot-api";

export default async function PlanExecutionPage({ params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;
  const [plan, executions] = await Promise.all([
    mockAutopilotApi.getPlan(planId),
    mockAutopilotApi.listExecutionRecords(planId),
  ]);
  if (!plan) notFound();
  return <ExecutionView plan={plan} executions={executions} />;
}