import { CircleHelp, Search } from "lucide-react";
import styles from "./app-header.module.css";

export function AppHeader() {
  return <header className={styles.header}>
    <div className={styles.breadcrumb}><span>Workspace</span><span className={styles.separator}>/</span><strong>Project intelligence</strong></div>
    <div className={styles.headerActions}>
      <span className={styles.demoBadge}><span />Demo mode</span>
      <button className={styles.iconButton} type="button" aria-label="Search is not available in demo mode" disabled><Search size={17} /></button>
      <button className={styles.iconButton} type="button" aria-label="Help is not available in demo mode" disabled><CircleHelp size={17} /></button>
    </div>
  </header>;
}