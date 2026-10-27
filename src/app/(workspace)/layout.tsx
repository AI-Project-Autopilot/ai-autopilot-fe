import type { ReactNode } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import styles from "@/components/layout/workspace-layout.module.css";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.workspace}>
      <AppSidebar />
      <div className={styles.contentColumn}>
        <AppHeader />
        <main className={styles.main} id="main-content">{children}</main>
      </div>
    </div>
  );
}