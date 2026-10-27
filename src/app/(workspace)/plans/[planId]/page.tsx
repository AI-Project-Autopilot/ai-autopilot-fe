import { notFound } from "next/navigation";
import { PlanView } from "@/features/plans/plan-view";
import { mockAutopilotApi } from "@/lib/mock/autopilot-api";

export default async function PlanPage({ params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;
  const plan = await mockAutopilotApi.getPlan(planId);
  if (!plan) notFound();
  return <PlanView plan={plan} />;
}