import { ArrowUpRight, CheckCircle2, Clock3, ExternalLink } from "lucide-react";
import { Button, Card, PageHeading, StatusBadge } from "@/components/ui/primitives";
import type { DevelopmentPlan, ExecutionRecord } from "@/types/domain";
import styles from "../workspace-views.module.css";

export function ExecutionView({ plan, executions }: { plan: DevelopmentPlan; executions: ExecutionRecord[] }) {
  return <>
    <PageHeading eyebrow="Execution" title="Issue creation activity" description={`Approved work for "${plan.title}" will appear here with its GitHub issue links.`} actions={<StatusBadge tone="warning">Not started</StatusBadge>} />
    <Card className={styles.statusCard}><div className={styles.statusIcon}><Clock3 size={19} /></div><div className={styles.statusText}><strong>Waiting for plan approval</strong><span>Review the proposed tasks before any issues can be created.</span></div><Button href={`/plans/${plan.id}`} variant="secondary">Review plan <ArrowUpRight size={14} /></Button></Card>
    <div className={styles.sectionHeading}><div><span>ACTIVITY LOG</span><h2>Recent execution records</h2></div><span>{executions.length} records</span></div>
    {executions.length ? executions.map((execution) => <Card className={styles.record} key={execution.id}><CheckCircle2 size={17} className={styles.recordIcon} /><div><strong>Issue creation run</strong><span>Created in demo mode · {new Date(execution.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}</span></div><StatusBadge>Queued</StatusBadge>{execution.issueUrls.length ? <a href={execution.issueUrls[0]} aria-label="Open created GitHub issue"><ExternalLink size={14} /></a> : null}</Card>) : <Card className={styles.empty}><span>No execution records yet</span><p>After approving a plan, its GitHub issue links and run status will be shown here.</p></Card>}
  </>;
}