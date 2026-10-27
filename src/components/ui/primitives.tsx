import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./primitives.module.css";

type ButtonBaseProps = { children: ReactNode; variant?: "primary" | "secondary" | "quiet"; className?: string };
type ButtonProps = ButtonBaseProps & (| { href: string; disabled?: never; type?: never } | (Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children"> & { href?: never }));

export function Button(props: ButtonProps) {
  const { children, variant = "primary", className: extraClassName, href, ...buttonProps } = props;
  const className = `${styles.button} ${styles[variant]}${extraClassName ? ` ${extraClassName}` : ""}`;
  if (href) return <Link className={className} href={href}>{children}</Link>;
  return <button {...buttonProps} className={className} type={buttonProps.type ?? "button"}>{children}</button>;
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`${styles.card}${className ? ` ${className}` : ""}`}>{children}</section>;
}

export function StatusBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "success" | "warning" | "info" }) {
  return <span className={`${styles.badge} ${styles[tone]}`}>{children}</span>;
}

export function PageHeading({ eyebrow, title, description, actions }: { eyebrow: string; title: string; description: string; actions?: ReactNode }) {
  return <div className={styles.pageHeading}><div><div className={styles.eyebrow}>{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{actions ? <div className={styles.headingActions}>{actions}</div> : null}</div>;
}