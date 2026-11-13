"use client";

import Link from "next/link";
import { ArrowDown, ArrowRight, Check, Code2, Command, FileCode2, FileText, GitBranch, ListChecks, ScanLine, ShieldCheck, Sparkles } from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import styles from "./landing-view.module.css";

export function LandingView() {
  const { t } = useLanguage();
  const steps = [
    { number: "01", icon: GitBranch, title: t("GitHub로 연결하세요", "Connect with GitHub"), description: t("GitHub에 로그인하고, 접근 가능한 저장소 중 분석할 프로젝트를 선택하세요.", "Sign in with GitHub and choose a repository you can access.") },
    { number: "02", icon: ScanLine, title: t("궁금한 방향을 알려주세요", "Set a direction"), description: t("개선하고 싶은 목표를 적거나, 목표 없이 저장소 전반의 분석을 시작하세요.", "Describe what you want to improve, or leave the goal open for a broader analysis.") },
    { number: "03", icon: ListChecks, title: t("다음 할 일을 확인하세요", "Review your next steps"), description: t("코드 근거와 우선순위, 구현 단계와 완료 기준을 살펴보고 개발 방향을 정하세요.", "Review code evidence, priorities, implementation steps, and acceptance criteria to decide what comes next.") },
  ];

  return (
    <div className={styles.page}>
      <a href="#main-content" className={styles.skipLink}>{t("본문으로 바로가기", "Skip to content")}</a>
      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label={t("AI Project Autopilot 홈", "AI Project Autopilot home")}><span className={styles.brandMark}><Command size={21} aria-hidden="true" /></span><span>autopilot<span className={styles.brandDot}>.</span></span></Link>
        <nav className={styles.navigation} aria-label={t("서비스 소개", "About the service")}><a href="#features">{t("주요 기능", "Features")}</a><a href="#how-it-works">{t("이용 방법", "How it works")}</a></nav>
        <div className={styles.headerActions}><LanguageSwitcher className={styles.languageSwitcher} /><Link href="/connect/github" className={styles.headerCta}><span className={styles.headerCtaText}>{t("GitHub로 시작", "Start with GitHub")}</span><span className={styles.headerCtaShort}>{t("GitHub 시작", "Get started")}</span> <ArrowRight size={15} aria-hidden="true" /></Link></div>
      </header>
      <main id="main-content">
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}><span /> {t("내 코드에서, 분명한 다음 단계로.", "YOUR CODE. A CLEARER NEXT STEP.")}</p>
            <h1 id="hero-title">{t("코드의 맥락을 읽고,", "Read your code.")}<br /><span>{t("다음 할 일을", "See your next")}</span><br />{t("선명하게.", "step clearly.")}</h1>
            <p className={styles.heroDescription}>{t("어디부터 개선해야 할지 막막할 때.", "Not sure where to improve your project?")}<br />{t("GitHub 저장소의 문서와 코드에서 출발해,", "Start with your GitHub documents and code.")}<br />{t("구체적인 개발 항목과 그 근거를 함께 확인하세요.", "Find concrete tasks and the evidence behind them.")}</p>
            <div className={styles.heroActions}><Link href="/connect/github" className={styles.primaryButton}><GitBranch size={18} aria-hidden="true" /> {t("내 저장소로 시작하기", "Start with my repository")} <ArrowRight size={16} aria-hidden="true" /></Link><a href="#how-it-works" className={styles.textLink}>{t("어떻게 작동하나요?", "How does it work?")} <ArrowDown size={15} aria-hidden="true" /></a></div>
            <p className={styles.heroNote}><ShieldCheck size={14} aria-hidden="true" /> {t("로그인 후 내 저장소를 연결해 시작합니다.", "Sign in and connect your repository to get started.")}</p>
          </div>
          <div className={styles.heroVisual} aria-label={t("저장소에서 개발 항목을 도출하는 분석 흐름 설명", "How repository analysis leads to development tasks")}>
            <div className={styles.visualHeader}><span className={styles.visualDots}><i /><i /><i /></span><span>autopilot / {t("분석 흐름", "analysis flow")}</span><span className={styles.exampleLabel}>{t("분석 흐름 예시", "Illustrative workflow")}</span></div>
            <div className={styles.visualBody}>
              <div className={styles.sourceHeading}><GitBranch size={16} aria-hidden="true" /><span>{t("내 GitHub 저장소", "My GitHub repository")}</span><span className={styles.sourceTag}>{t("원본", "SOURCE")}</span></div>
              <div className={styles.sourceFiles}><span><FileText size={15} aria-hidden="true" /> README</span><span><FileCode2 size={15} aria-hidden="true" /> {t("소스 코드", "Source code")}</span><span><GitBranch size={15} aria-hidden="true" /> {t("기본 브랜치", "Default branch")}</span></div>
              <div className={styles.flowConnector}><span /><span className={styles.aiMark}><Sparkles size={20} aria-hidden="true" /></span><span /><small>{t("문서·코드 맥락 분석", "Analyze context")}</small></div>
              <div className={styles.outputCard}>
                <div className={styles.outputTitle}><span className={styles.outputIcon}><ListChecks size={18} aria-hidden="true" /></span><div><small>{t("다음 단계", "YOUR NEXT STEP")}</small><strong>{t("근거에서 출발하는 개발 항목", "Tasks grounded in your code")}</strong></div></div>
                <div className={styles.outputRow}><span className={styles.checkIcon}><Check size={12} aria-hidden="true" /></span><span>{t("무엇을 개선할지", "What to improve")}</span><b>{t("우선순위", "Priority")}</b></div>
                <div className={styles.outputRow}><span className={styles.checkIcon}><Check size={12} aria-hidden="true" /></span><span>{t("왜 필요한지", "Why it matters")}</span><b>{t("파일 · 코드 근거", "Files · code evidence")}</b></div>
                <div className={styles.outputRow}><span className={styles.checkIcon}><Check size={12} aria-hidden="true" /></span><span>{t("어떻게 진행할지", "How to proceed")}</span><b>{t("구현 단계 · 완료 기준", "Steps · acceptance criteria")}</b></div>
              </div>
              <p className={styles.visualCaption}>{t("아이디어를 넘어, 검토할 수 있는 구체적인 제안으로.", "Turn ideas into concrete proposals you can review.")}</p>
            </div>
          </div>
        </section>
        <div className={styles.contextStrip}><span>{t("프로젝트를 이해하는 것부터,", "From understanding your project")}<br /><strong>{t("다음 개발을 결정하는 것까지.", "to choosing what to build next.")}</strong></span><div><FileText size={18} aria-hidden="true" /> {t("저장소 맥락", "Repository context")} <ArrowRight size={14} aria-hidden="true" /> <ScanLine size={18} aria-hidden="true" /> {t("AI 분석", "AI analysis")} <ArrowRight size={14} aria-hidden="true" /> <ListChecks size={18} aria-hidden="true" /> {t("구체적인 다음 단계", "Concrete next steps")}</div></div>
        <section id="features" className={styles.features} aria-labelledby="features-title">
          <div className={styles.sectionIntro}><p className={styles.eyebrow}>{t("맥락에서 시작하는 제안", "BUILT ON CONTEXT")}</p><h2 id="features-title">{t("좋은 다음 단계에는", "Every next step")}<br />{t("분명한 이유가 있으니까.", "needs a clear reason.")}</h2><p>{t("막연한 조언 대신, 내 프로젝트를 바탕으로", "Get proposals grounded in your project,")}<br />{t("검토하고 실행할 수 있는 제안을 확인하세요.", "with enough detail to review and act on.")}</p></div>
          <div className={styles.featureGrid}>
            <article className={styles.evidenceFeature}><span className={styles.featureIcon}><Code2 size={23} aria-hidden="true" /></span><h3>{t("코드로 확인하는 근거", "Evidence you can inspect")}</h3><p>{t("제안에 연결된 파일과 줄 번호를 확인하고,", "Follow the linked files and line numbers,")}<br />{t("분석 기준 커밋의 코드에서 직접 검토하세요.", "then review the code at the analyzed commit.")}</p><div className={styles.evidenceDiagram} aria-label={t("코드 위치와 제안 근거의 연결", "Code locations linked to supporting evidence")}><div><span /><span /><span /><span /><span /></div><span className={styles.evidenceConnection} /><span className={styles.evidencePill}><ScanLine size={14} aria-hidden="true" /> {t("제안의 근거", "Code evidence")}</span></div></article>
            <article className={styles.priorityFeature}><span className={styles.featureIcon}><ListChecks size={23} aria-hidden="true" /></span><h3>{t("생각에서 구체적인 항목으로", "From ideas to concrete tasks")}</h3><p>{t("개선 이유와 우선순위부터 구현 단계와 완료 기준까지. 다음 작업을 판단하는 데 필요한 내용을 한곳에 정리합니다.", "Rationale, priorities, implementation steps, and acceptance criteria. Find what you need to evaluate your next task in one place.")}</p><div className={styles.priorityTags}><span>{t("우선순위", "Priority")}</span><span>{t("구현 단계", "Implementation steps")}</span><span>{t("완료 기준", "Acceptance criteria")}</span></div></article>
            <article className={styles.controlFeature}><span className={styles.featureIcon}><ShieldCheck size={23} aria-hidden="true" /></span><div><h3>{t("분석의 시작도, 다음 결정도 직접", "You start the analysis. You choose what comes next.")}</h3><p>{t("저장소와 목표를 선택하고 분석을 시작하세요. 결과를 검토하고 무엇부터 진행할지는 직접 결정합니다.", "Choose a repository and a goal, then start the analysis. Review the results and decide which work to take on first.")}</p></div><span className={styles.controlStamp}>{t("결정은 직접", "YOU'RE IN CONTROL")} <ArrowRight size={17} aria-hidden="true" /></span></article>
          </div>
        </section>
        <section id="how-it-works" className={styles.howItWorks} aria-labelledby="steps-title">
          <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>{t("간단한 이용 방법", "A SIMPLE WORKFLOW")}</p><h2 id="steps-title">{t("시작은 가볍게.", "Start simply.")}<br />{t("다음 단계는 구체적으로.", "Make your next step concrete.")}</h2></div><Link href="/connect/github" className={styles.textLink}>{t("첫 분석 시작하기", "Start your first analysis")} <ArrowRight size={16} aria-hidden="true" /></Link></div>
          <ol className={styles.stepList}>{steps.map(({ number, icon: Icon, title, description }) => <li key={number}><div className={styles.stepTop}><span>{number}</span><Icon size={25} strokeWidth={1.5} aria-hidden="true" /></div><h3>{title}</h3><p>{description}</p></li>)}</ol>
          <p className={styles.analysisNote}><ShieldCheck size={16} aria-hidden="true" /> {t("분석을 시작하면 선택한 저장소의 README와 일부 소스 코드가 AI 모델에 전달됩니다.", "Starting an analysis sends the selected repository's README and portions of its source code to an AI model.")}</p>
        </section>
        <section className={styles.finalCta} aria-labelledby="cta-title"><div className={styles.ctaDecoration} aria-hidden="true"><Command /></div><div><p className={styles.eyebrow}>{t("다음 단계를 함께 찾아보세요", "LET'S FIND YOUR NEXT STEP")}</p><h2 id="cta-title">{t("다음에 만들 것,", "Find what to build next,")}<br />{t("내 코드에서 찾아보세요.", "right in your code.")}</h2><p>{t("저장소 하나면 시작할 수 있어요.", "One repository is all you need to get started.")}</p></div><Link href="/connect/github" className={styles.lightButton}><GitBranch size={19} aria-hidden="true" /> {t("GitHub로 시작하기", "Get started with GitHub")} <ArrowRight size={17} aria-hidden="true" /></Link></section>
      </main>
      <footer className={styles.footer}><Link href="/" className={styles.footerBrand}>autopilot<span>.</span></Link><p>AI Project Autopilot · {t("코드에서 다음 할 일까지", "From your code to your next task")}</p><Link href="/dashboard">{t("대시보드", "Dashboard")} <ArrowRight size={14} aria-hidden="true" /></Link></footer>
    </div>
  );
}
