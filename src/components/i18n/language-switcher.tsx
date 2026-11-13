"use client";

import { useLanguage } from "@/components/i18n/language-provider";
import { isLanguage } from "@/lib/i18n/language";
import styles from "./language-switcher.module.css";

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { language, setLanguage, t } = useLanguage();
  return <label className={`${styles.switcher}${className ? ` ${className}` : ""}`}>
    <span className={styles.srOnly}>{t("표시 언어", "Display language")}</span>
    <select name="language" value={language} onChange={(event) => {
      if (isLanguage(event.target.value)) setLanguage(event.target.value);
    }}>
      <option value="ko" lang="ko">한국어</option>
      <option value="en" lang="en">English</option>
    </select>
  </label>;
}
