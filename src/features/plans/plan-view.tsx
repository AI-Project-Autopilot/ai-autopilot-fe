import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Circle, GitBranch } from "lucide-react";
import { Button, Card, PageHeading, StatusBadge } from "@/components/ui/primitives";
import type { DevelopmentPlan } from "@/types/domain";
import styles from "../workspace-views.module.css";

export function PlanView({ plan }: { plan: DevelopmentPlan }) {
  return <>
    <Link className={styles.backLink} href="/dashboard"><ArrowLeft size={14} /> Back to overview</Link>
    <PageHeading eyebrow="AI development plan" title={plan.title} description={plan.goal} actions={<StatusBadge tone="warning">Review required</StatusBadge>} />
    <Card className={styles.summaryCard}><div className={styles.summaryItem}><span>REPOSITORY</span><strong><GitBranch size={14} /> northstar-labs/atlas-console</strong></div><div className={styles.summaryItem}><span>PROPOSED TASKS</span><strong>{plan.tasks.length} tasks</strong></div><div className={styles.summaryItem}><span>STATUS</span><strong><StatusBadge tone="info">Not approved</StatusBadge></strong></div></Card>
    <div className={styles.tasksHeader}><div><span>PLAN BREAKDOWN</span><h2>Review each proposed task</h2></div><span>{plan.tasks.length} items</span></div>
    <div className={styles.taskList}>{plan.tasks.map((task, index) => <Card className={styles.taskCard} key={task.id}>
      <span className={styles.taskIndex}>{String(index + 1).padStart(2, "0")}</span><div className={styles.taskBody}>
        <div className={styles.taskTitleRow}><h3>{task.title}</h3><StatusBadge tone={task.priority === "high" ? "warning" : "neutral"}>{task.priority} priority</StatusBadge></div>
        <p>{task.description}</p><div className={styles.criteriaLabel}>DONE WHEN</div>
        <ul className={styles.criteria}>{task.acceptanceCriteria.map((criterion) => <li key={criterion}><Check size={13} />{criterion}</li>)}</ul>
        <div className={styles.dependency}>{task.dependsOn.length ? <><GitBranch size={13} /> Depends on {task.dependsOn.join(", ")}</> : <><Circle size={12} /> No dependencies</>}</div>
      </div>
    </Card>)}</div>
    <div className={styles.reviewFooter}><span>Approval and issue creation are simulated in this demo.</span><Button href={`/plans/${plan.id}/execution`} variant="secondary">View execution <ArrowRight size={14} /></Button></div>
  </>;
}