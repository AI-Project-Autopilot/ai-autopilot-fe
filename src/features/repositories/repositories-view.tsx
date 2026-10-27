import { ArrowUpRight, GitBranch, LockKeyhole, Plus } from "lucide-react";
import { Button, Card, PageHeading, StatusBadge } from "@/components/ui/primitives";
import type { Repository } from "@/types/domain";
import styles from "../workspace-views.module.css";

export function RepositoriesView({ repositories }: { repositories: Repository[] }) {
  return <>
    <PageHeading eyebrow="Your codebase context" title="Repositories" description="Choose a repository as the starting point for an AI-assisted development plan." actions={<Button href="/analyze"><Plus size={15} /> Analyze repository</Button>} />
    <div className={styles.toolbar}><span>{repositories.length} repositories in this workspace</span><StatusBadge tone="info">Demo data</StatusBadge></div>
    <div className={styles.repositoryList}>{repositories.map((repository) => <Card className={styles.repositoryCard} key={repository.id}>
      <span className={styles.repositoryIcon}><GitBranch size={18} /></span>
      <div className={styles.repositoryDetails}><div className={styles.repositoryName}>{repository.fullName}{repository.isPrivate ? <LockKeyhole size={12} /> : null}</div><p>{repository.description}</p><div className={styles.repositoryMeta}><span>Default branch <b>{repository.defaultBranch}</b></span><span>{repository.openIssueCount} open issues</span></div></div>
      <div className={styles.repositoryActions}><StatusBadge tone="success">Available</StatusBadge><Button href="/analyze" variant="secondary">Analyze <ArrowUpRight size={13} /></Button></div>
    </Card>)}</div>
    <p className={styles.note}>Repository selection is simulated in this demo. GitHub authorization and live repository data are not connected.</p>
  </>;
}