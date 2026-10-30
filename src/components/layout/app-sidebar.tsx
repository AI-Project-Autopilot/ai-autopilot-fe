"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Boxes, CirclePlus, Command, GitBranch, LayoutDashboard, ListChecks } from "lucide-react";
import styles from "./app-sidebar.module.css";

const navigation = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/repositories", label: "Repositories", icon: GitBranch },
  { href: "/analyze", label: "New analysis", icon: CirclePlus },
  { href: "/plans/demo-plan", label: "Development plan", icon: ListChecks },
  { href: "/plans/demo-plan/execution", label: "Execution log", icon: Activity },
  { href: "/connect/github", label: "Connect GitHub", icon: GitBranch },
];

export function AppSidebar() {
  const pathname = usePathname();
  return (
    <aside className={styles.sidebar} aria-label="Main navigation">
      <Link className={styles.brand} href="/dashboard" aria-label="AI Project Autopilot overview">
        <span className={styles.brandMark}><Command size={19} /></span>
        <span className={styles.brandName}>autopilot<span>.</span></span>
      </Link>
      <div className={styles.workspaceLabel}>WORKSPACE</div>
      <div className={styles.workspacePicker}>
        <span className={styles.workspaceIcon}><Boxes size={16} /></span>
        <span className={styles.workspaceName}>Personal workspace</span>
        <span className={styles.workspaceMenu} aria-hidden="true">···</span>
      </div>
      <nav className={styles.nav}>
        <div className={styles.navLabel}>BUILD</div>
        {navigation.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
          return <Link key={href} href={href} className={`${styles.navLink}${active ? ` ${styles.active}` : ""}`} aria-current={active ? "page" : undefined}>
            <Icon size={17} strokeWidth={1.8} aria-hidden="true" /><span>{label}</span>
          </Link>;
        })}
      </nav>
      <div className={styles.sidebarFooter}>
        <div className={styles.avatar}>AP</div>
        <div className={styles.profileText}><strong>Autopilot demo</strong><span>Local preview</span></div>
        <span className={styles.onlineDot} aria-label="Demo mode active" />
      </div>
    </aside>
  );
}