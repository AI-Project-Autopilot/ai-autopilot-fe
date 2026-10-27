import { ArrowRight, FileCode2, GitPullRequest, MessageSquareText, Sparkles } from "lucide-react";
import { Button, Card, PageHeading, StatusBadge } from "@/components/ui/primitives";
import type { Repository } from "@/types/domain";
import styles from "../workspace-views.module.css";

export function AnalyzeView({ repositories }: { repositories: Repository[] }) {
  return <>
    <PageHeading eyebrow="Start with a goal" title="Analyze a repository" description="Give the planner a clear outcome. It will use repository context to draft work for your review." />
    <div className={styles.analysisGrid}>
      <Card className={styles.formCard}>
        <div className={styles.field}><label htmlFor="repository">Repository</label><select id="repository" defaultValue={repositories[0]?.id ?? ""}>{repositories.map((repository) => <option value={repository.id} key={repository.id}>{repository.fullName}</option>)}</select><span className={styles.fieldHint}>Choose the codebase to use as planning context.</span></div>
        <div className={styles.field}><label htmlFor="goal">Development goal</label><textarea id="goal" rows={5} placeholder="For example: make first-time setup easier for new contributors..." /><span className={styles.fieldHint}>A specific outcome leads to more actionable tasks.</span></div>
        <div className={styles.submitRow}><StatusBadge>Demo mode · analysis is disabled</StatusBadge><Button disabled><Sparkles size={15} /> Generate plan</Button></div>
      </Card>
      <Card className={styles.contextCard}>
        <span className={styles.contextEyebrow}>PLANNING CONTEXT</span><h2>What the analysis will consider</h2><p>Once connected, the service can review repository signals to ground suggested work in the project you selected.</p>
        <ul>
          <li><span><FileCode2 size={15} /></span><div><strong>README and key code</strong><small>Project purpose, structure, and conventions</small></div></li>
          <li><span><MessageSquareText size={15} /></span><div><strong>Open issues</strong><small>Existing requests and known problems</small></div></li>
          <li><span><GitPullRequest size={15} /></span><div><strong>Pull requests</strong><small>Recent work and review context</small></div></li>
        </ul>
        <div className={styles.approvalCallout}><span>01</span><p>Nothing is sent to GitHub until you review and approve the proposed tasks.</p><ArrowRight size={14} /></div>
      </Card>
    </div>
  </>;
}