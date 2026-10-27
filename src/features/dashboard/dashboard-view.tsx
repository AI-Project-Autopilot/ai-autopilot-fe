import { ArrowRight, Bot, GitPullRequest, Plus, Sparkles } from "lucide-react";
import { Button, Card, PageHeading, StatusBadge } from "@/components/ui/primitives";
import type { DevelopmentPlan, Repository } from "@/types/domain";
import styles from "../workspace-views.module.css";

export function DashboardView({ repositories, plans }: { repositories: Repository[]; plans: DevelopmentPlan[] }) {
  const plan = plans[0];
  const repository = repositories.find((item) => item.id === plan?.repositoryId);

  return <>
    <PageHeading eyebrow="Tuesday, October 27" title="Good morning, builder." description="A clear view of your repositories, analysis, and next steps." actions={<Button href="/analyze"><Plus size={15} /> Start an analysis</Button>} />
    <section className={styles.metrics} aria-label="Workspace summary">
      <Card className={styles.metricCard}><div className={styles.metricTop}><span>Repositories</span><GitPullRequest size={16} /></div><strong>{repositories.length.toString().padStart(2, "0")}</strong><span className={styles.metricHint}>connected to this workspace</span></Card>
      <Card className={styles.metricCard}><div className={styles.metricTop}><span>Plans to review</span><Sparkles size={16} /></div><strong>{plans.filter((item) => item.status === "ready_for_review").length.toString().padStart(2, "0")}</strong><span className={styles.metricHint}>AI-generated, awaiting your call</span></Card>
      <Card className={`${styles.metricCard} ${styles.metricAccent}`}><div className={styles.metricTop}><span>Issues created</span><Bot size={16} /></div><strong>00</strong><span className={styles.metricHint}>nothing runs without your approval</span></Card>
    </section>
    <section className={styles.contentGrid}>
      <Card className={styles.planCard}>
        <div className={styles.sectionHeader}><div><span className={styles.sectionEyebrow}>NEXT UP</span><h2>Plan ready for your review</h2></div><StatusBadge tone="warning">Needs review</StatusBadge></div>
        {plan ? <>
          <div className={styles.planSummary}><span className={styles.repoGlyph}>A</span><div><strong>{repository?.fullName ?? "Repository"}</strong><span>{plan.title}</span></div></div>
          <p className={styles.goal}>{plan.goal}</p>
          <div className={styles.planMeta}><span><b>{plan.tasks.length}</b> proposed tasks</span><span className={styles.metaDivider} /><span>Priority and dependencies included</span></div>
          <div className={styles.cardFooter}><span className={styles.approvalNote}><span /> You stay in control</span><Button href={`/plans/${plan.id}`} variant="secondary">Review plan <ArrowRight size={14} /></Button></div>
        </> : <div className={styles.emptyState}>Your first analysis will create a plan to review here.</div>}
      </Card>
      <Card className={styles.workflowCard}>
        <div className={styles.sectionHeader}><div><span className={styles.sectionEyebrow}>WORKFLOW</span><h2>From context to issues</h2></div><span className={styles.workflowIcon}><Sparkles size={16} /></span></div>
        <ol className={styles.steps}>
          <li><span className={styles.stepNumber}>01</span><div><strong>Choose a repository</strong><span>Start with the codebase you know.</span></div><span className={styles.stepDot} /></li>
          <li><span className={styles.stepNumber}>02</span><div><strong>Set the direction</strong><span>Describe the outcome you want.</span></div><span className={styles.stepDot} /></li>
          <li><span className={styles.stepNumber}>03</span><div><strong>Review the plan</strong><span>Approve only the work that fits.</span></div><span className={styles.stepDot} /></li>
        </ol>
        <Button href="/repositories" variant="quiet" className={styles.workflowLink}>Explore repositories <ArrowRight size={14} /></Button>
      </Card>
    </section>
  </>;
}