import type { ReactNode } from "react";
import { GithubSessionGate, GithubSessionProvider } from "@/components/auth/github-session";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { RepositoryWorkspaceProvider } from "@/features/workspace/repository-workspace-context";
import styles from "@/components/layout/workspace-layout.module.css";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <GithubSessionProvider><div className={styles.workspace}>
      <AppSidebar />
      <div className={styles.contentColumn}>
        <AppHeader />
        <main className={styles.main} id="main-content"><GithubSessionGate><RepositoryWorkspaceProvider>{children}</RepositoryWorkspaceProvider></GithubSessionGate></main>
      </div>
    </div></GithubSessionProvider>
  );
}
