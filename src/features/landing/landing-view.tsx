import Link from "next/link";
import { ArrowDown, ArrowRight, Check, Code2, Command, FileCode2, FileText, GitBranch, ListChecks, ScanLine, ShieldCheck, Sparkles } from "lucide-react";
import styles from "./landing-view.module.css";

const steps = [
  { number: "01", icon: GitBranch, title: "GitHub로 연결하세요", description: "GitHub에 로그인하고, 접근 가능한 저장소 중 분석할 프로젝트를 선택하세요." },
  { number: "02", icon: ScanLine, title: "궁금한 방향을 알려주세요", description: "개선하고 싶은 목표를 적거나, 목표 없이 저장소 전반의 분석을 시작하세요." },
  { number: "03", icon: ListChecks, title: "다음 할 일을 확인하세요", description: "코드 근거와 우선순위, 구현 단계와 완료 기준을 살펴보고 개발 방향을 정하세요." },
];

export function LandingView() {
  return (
    <div className={styles.page}>
      <a href="#main-content" className={styles.skipLink}>본문으로 바로가기</a>
      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label="AI Project Autopilot 홈"><span className={styles.brandMark}><Command size={21} aria-hidden="true" /></span><span>autopilot<span className={styles.brandDot}>.</span></span></Link>
        <nav className={styles.navigation} aria-label="서비스 소개"><a href="#features">주요 기능</a><a href="#how-it-works">이용 방법</a></nav>
        <Link href="/connect/github" className={styles.headerCta}>GitHub로 시작하기 <ArrowRight size={15} aria-hidden="true" /></Link>
      </header>
      <main id="main-content">
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}><span /> YOUR CODE. A CLEARER NEXT STEP.</p>
            <h1 id="hero-title">코드의 맥락을 읽고,<br /><span>다음 할 일을</span><br />선명하게.</h1>
            <p className={styles.heroDescription}>어디부터 개선해야 할지 막막할 때.<br />GitHub 저장소의 문서와 코드에서 출발해,<br />구체적인 개발 항목과 그 근거를 함께 확인하세요.</p>
            <div className={styles.heroActions}><Link href="/connect/github" className={styles.primaryButton}><GitBranch size={18} aria-hidden="true" /> 내 저장소로 시작하기 <ArrowRight size={16} aria-hidden="true" /></Link><a href="#how-it-works" className={styles.textLink}>어떻게 작동하나요? <ArrowDown size={15} aria-hidden="true" /></a></div>
            <p className={styles.heroNote}><ShieldCheck size={14} aria-hidden="true" /> 로그인 후 내 저장소를 연결해 시작합니다.</p>
          </div>
          <div className={styles.heroVisual} aria-label="저장소에서 개발 항목을 도출하는 분석 흐름 설명">
            <div className={styles.visualHeader}><span className={styles.visualDots}><i /><i /><i /></span><span>autopilot / analysis flow</span><span className={styles.exampleLabel}>분석 흐름 예시</span></div>
            <div className={styles.visualBody}>
              <div className={styles.sourceHeading}><GitBranch size={16} aria-hidden="true" /><span>내 GitHub 저장소</span><span className={styles.sourceTag}>SOURCE</span></div>
              <div className={styles.sourceFiles}><span><FileText size={15} aria-hidden="true" /> README</span><span><FileCode2 size={15} aria-hidden="true" /> 소스 코드</span><span><GitBranch size={15} aria-hidden="true" /> 기본 브랜치</span></div>
              <div className={styles.flowConnector}><span /><span className={styles.aiMark}><Sparkles size={20} aria-hidden="true" /></span><span /><small>문서와 코드의 맥락 분석</small></div>
              <div className={styles.outputCard}>
                <div className={styles.outputTitle}><span className={styles.outputIcon}><ListChecks size={18} aria-hidden="true" /></span><div><small>YOUR NEXT STEP</small><strong>근거에서 출발하는 개발 항목</strong></div></div>
                <div className={styles.outputRow}><span className={styles.checkIcon}><Check size={12} aria-hidden="true" /></span><span>무엇을 개선할지</span><b>우선순위</b></div>
                <div className={styles.outputRow}><span className={styles.checkIcon}><Check size={12} aria-hidden="true" /></span><span>왜 필요한지</span><b>파일 · 코드 근거</b></div>
                <div className={styles.outputRow}><span className={styles.checkIcon}><Check size={12} aria-hidden="true" /></span><span>어떻게 진행할지</span><b>구현 단계 · 완료 기준</b></div>
              </div>
              <p className={styles.visualCaption}>아이디어를 넘어, 검토할 수 있는 구체적인 제안으로.</p>
            </div>
          </div>
        </section>
        <div className={styles.contextStrip}><span>프로젝트를 이해하는 것부터,<br /><strong>다음 개발을 결정하는 것까지.</strong></span><div><FileText size={18} aria-hidden="true" /> 저장소 맥락 <ArrowRight size={14} aria-hidden="true" /> <ScanLine size={18} aria-hidden="true" /> AI 분석 <ArrowRight size={14} aria-hidden="true" /> <ListChecks size={18} aria-hidden="true" /> 구체적인 다음 단계</div></div>
        <section id="features" className={styles.features} aria-labelledby="features-title">
          <div className={styles.sectionIntro}><p className={styles.eyebrow}>BUILT ON CONTEXT</p><h2 id="features-title">좋은 다음 단계에는<br />분명한 이유가 있으니까.</h2><p>막연한 조언 대신, 내 프로젝트를 바탕으로<br />검토하고 실행할 수 있는 제안을 확인하세요.</p></div>
          <div className={styles.featureGrid}>
            <article className={styles.evidenceFeature}><span className={styles.featureIcon}><Code2 size={23} aria-hidden="true" /></span><h3>코드로 확인하는 근거</h3><p>제안에 연결된 파일과 줄 번호를 확인하고,<br />분석 기준 커밋의 코드에서 직접 검토하세요.</p><div className={styles.evidenceDiagram} aria-label="코드 위치와 제안 근거의 연결"><div><span /><span /><span /><span /><span /></div><span className={styles.evidenceConnection} /><span className={styles.evidencePill}><ScanLine size={14} aria-hidden="true" /> 제안의 근거</span></div></article>
            <article className={styles.priorityFeature}><span className={styles.featureIcon}><ListChecks size={23} aria-hidden="true" /></span><h3>생각에서 구체적인 항목으로</h3><p>개선 이유와 우선순위부터 구현 단계와 완료 기준까지. 다음 작업을 판단하는 데 필요한 내용을 한곳에 정리합니다.</p><div className={styles.priorityTags}><span>우선순위</span><span>구현 단계</span><span>완료 기준</span></div></article>
            <article className={styles.controlFeature}><span className={styles.featureIcon}><ShieldCheck size={23} aria-hidden="true" /></span><div><h3>분석의 시작도, 다음 결정도 직접</h3><p>저장소와 목표를 선택하고 분석을 시작하세요. 결과를 검토하고 무엇부터 진행할지는 직접 결정합니다.</p></div><span className={styles.controlStamp}>YOU&apos;RE IN CONTROL <ArrowRight size={17} aria-hidden="true" /></span></article>
          </div>
        </section>
        <section id="how-it-works" className={styles.howItWorks} aria-labelledby="steps-title">
          <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>A SIMPLE WORKFLOW</p><h2 id="steps-title">시작은 가볍게.<br />다음 단계는 구체적으로.</h2></div><Link href="/connect/github" className={styles.textLink}>첫 분석 시작하기 <ArrowRight size={16} aria-hidden="true" /></Link></div>
          <ol className={styles.stepList}>{steps.map(({ number, icon: Icon, title, description }) => <li key={number}><div className={styles.stepTop}><span>{number}</span><Icon size={25} strokeWidth={1.5} aria-hidden="true" /></div><h3>{title}</h3><p>{description}</p></li>)}</ol>
          <p className={styles.analysisNote}><ShieldCheck size={16} aria-hidden="true" /> 분석을 시작하면 선택한 저장소의 README와 일부 소스 코드가 AI 모델에 전달됩니다.</p>
        </section>
        <section className={styles.finalCta} aria-labelledby="cta-title"><div className={styles.ctaDecoration} aria-hidden="true"><Command /></div><div><p className={styles.eyebrow}>LET&apos;S FIND YOUR NEXT STEP</p><h2 id="cta-title">다음에 만들 것,<br />내 코드에서 찾아보세요.</h2><p>저장소 하나면 시작할 수 있어요.</p></div><Link href="/connect/github" className={styles.lightButton}><GitBranch size={19} aria-hidden="true" /> GitHub로 시작하기 <ArrowRight size={17} aria-hidden="true" /></Link></section>
      </main>
      <footer className={styles.footer}><Link href="/" className={styles.footerBrand}>autopilot<span>.</span></Link><p>AI Project Autopilot · 코드에서 다음 할 일까지</p><Link href="/dashboard">대시보드 <ArrowRight size={14} aria-hidden="true" /></Link></footer>
    </div>
  );
}
