"use client";

import { useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, CheckCircle2, ExternalLink, GitBranch, LoaderCircle, LockKeyhole, RefreshCw, Search } from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";
import { Button, Card, PageHeading } from "@/components/ui/primitives";
import { useRepositoryWorkspaceContext } from "@/features/workspace/repository-workspace-context";
import { getGithubLoginUrl } from "@/lib/api/github-connect-api";
import styles from "./repositories-view.module.css";

function subscribeToClient() {
  return () => undefined;
}

export function RepositoriesView() {
  const { t, locale } = useLanguage();
  const { repositories, repositoryState, repositoryError, repositoryPermissionError, hasNextPage, privateRepositoriesIncluded, loadingMore, selectedId, selectedRepository, selectRepository, refreshRepositories, loadMoreRepositories } = useRepositoryWorkspaceContext();
  const [search, setSearch] = useState("");
  const clientReady = useSyncExternalStore(subscribeToClient, () => true, () => false);
  const query = search.trim().toLowerCase();
  const matches = repositories.filter((repository) => `${repository.fullName} ${repository.description ?? ""}`.toLowerCase().includes(query));
  const number = (value: number) => value.toLocaleString(locale);
  const repositoryDate = (value: string) => new Intl.DateTimeFormat(locale, { year: "numeric", month: "long", day: "numeric" }).format(new Date(value));
  const permissionLink = <a className={styles.inlineLink} href={getGithubLoginUrl()}>{t("GitHub 권한 다시 승인", "Reauthorize GitHub access")} <ArrowRight size={14} aria-hidden="true" /></a>;

  return <>
    <PageHeading eyebrow={t("내 GITHUB 저장소", "YOUR REPOSITORIES")} title={t("저장소", "Repositories")} description={t("분석할 GitHub 저장소를 선택하세요. 다음 화면에서 개발 목표를 정하고 분석을 시작할 수 있어요.", "Choose a GitHub repository to analyze. Set your development goal and start the analysis on the next screen.")} actions={<Button variant="secondary" onClick={() => void refreshRepositories()} disabled={repositoryState === "loading" || loadingMore}><RefreshCw size={15} aria-hidden="true" /> {t("목록 새로고침", "Refresh list")}</Button>} />
    {repositoryState === "loading" && <Card className={styles.feedback}><LoaderCircle size={24} className={styles.spin} aria-hidden="true" /><p role="status">{t("GitHub 저장소를 불러오고 있어요…", "Loading GitHub repositories…")}</p></Card>}
    {repositoryState === "error" && <Card className={styles.feedback}><GitBranch size={28} aria-hidden="true" /><h2>{t("저장소를 불러올 수 없어요", "Could not load repositories")}</h2><p role="alert">{repositoryError}</p><div className={styles.feedbackActions}><Button variant="secondary" onClick={() => void refreshRepositories()}><RefreshCw size={15} aria-hidden="true" /> {t("다시 불러오기", "Try again")}</Button>{repositoryPermissionError && permissionLink}</div></Card>}
    {repositoryState === "ready" && <>
      {privateRepositoriesIncluded === false && <div className={styles.notice} role="status"><LockKeyhole size={17} aria-hidden="true" /><div><strong>{t("현재 연결은 비공개 저장소를 포함하지 않습니다.", "This connection does not include private repositories.")}</strong><p>{t("비공개 저장소도 분석하려면 GitHub에서 접근 권한을 다시 승인해 주세요.", "Reauthorize access on GitHub to analyze private repositories.")}</p>{permissionLink}</div></div>}
      <div className={`${styles.layout}${selectedRepository ? ` ${styles.layoutWithSelection}` : ""}`}>
        <Card className={styles.browser}>
          <div className={styles.browserHeading}><div><span className={styles.eyebrow}>{t("GITHUB 연결됨", "CONNECTED TO GITHUB")}</span><h2>{t("내 저장소", "My repositories")}</h2></div><span className={styles.loadedCount}>{t(`${number(repositories.length)}개 불러옴`, `${number(repositories.length)} loaded`)}</span></div>
          {repositories.length > 0 ? <>
            <div className={styles.searchField}>
              <label htmlFor="repository-search">{t("불러온 저장소에서 검색", "Search loaded repositories")}</label>
              <div><Search size={17} aria-hidden="true" /><input id="repository-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("저장소 이름 또는 설명", "Repository name or description")} /></div>
              <span role="status" aria-live="polite">{query ? t(`불러온 ${number(repositories.length)}개 중 ${number(matches.length)}개 일치`, `${number(matches.length)} matches in ${number(repositories.length)} loaded repositories`) : t("분석할 저장소를 하나 선택해 주세요.", "Select a repository to analyze.")}</span>
            </div>
            <fieldset className={styles.fieldset}>
              <legend className={styles.srOnly}>{t("분석할 GitHub 저장소 선택", "Select a GitHub repository to analyze")}</legend>
              <ul className={styles.repositoryList}>{matches.map((repository) => <li key={repository.id}>
                <label className={`${styles.repositoryOption}${selectedId === repository.id ? ` ${styles.selected}` : ""}`}>
                  <input type="radio" name="repository" value={repository.id} checked={selectedId === repository.id} onChange={() => selectRepository(repository.id)} aria-label={t(`${repository.fullName} 선택`, `Select ${repository.fullName}`)} />
                  <span className={styles.repositoryDetails}>
                    <span className={styles.repositoryTitle}><strong>{repository.fullName}</strong><span className={styles.visibility}>{repository.isPrivate ? <><LockKeyhole size={11} aria-hidden="true" /> {t("비공개", "Private")}</> : t("공개", "Public")}</span>{repository.archived && <span className={styles.visibility}>{t("보관됨", "Archived")}</span>}</span>
                    {repository.description && <span className={styles.description}>{repository.description}</span>}
                    <span className={styles.repositoryMeta}>{repository.language && <span>{repository.language}</span>}<span><GitBranch size={12} aria-hidden="true" /> {repository.defaultBranch || t("기본 브랜치 없음", "No default branch")}</span><span>{t(`열린 이슈 ${number(repository.openIssueCount)}개`, `${number(repository.openIssueCount)} open issues`)}</span></span>
                    <span className={styles.updatedAt}>{t("업데이트", "Updated")} <time dateTime={repository.updatedAt}>{repositoryDate(repository.updatedAt)}</time></span>
                  </span>
                  {selectedId === repository.id && <CheckCircle2 className={styles.selectedIcon} size={18} aria-hidden="true" />}
                </label>
              </li>)}</ul>
            </fieldset>
            {matches.length === 0 && <div className={styles.searchEmpty}><Search size={25} aria-hidden="true" /><h3>{t("일치하는 저장소가 없어요", "No matching repositories")}</h3><p>{hasNextPage ? t("다른 검색어를 입력하거나 저장소를 더 불러와 주세요.", "Try a different search or load more repositories.") : t("다른 검색어를 입력해 주세요.", "Try a different search.")}</p><button type="button" onClick={() => setSearch("")}>{t("검색 초기화", "Clear search")}</button></div>}
          </> : <div className={styles.empty}><span className={styles.emptyIcon}><GitBranch size={27} aria-hidden="true" /></span><h3>{t("조회 가능한 저장소가 없어요", "No accessible repositories")}</h3><p>{t("GitHub 계정과 저장소 접근 권한을 확인해 주세요.", "Check your GitHub account and repository permissions.")}</p>{permissionLink}</div>}
          {repositoryError && <div className={styles.paginationError} role="alert"><p>{repositoryError}</p>{repositoryPermissionError && permissionLink}</div>}
          <div className={styles.listFooter}><span>{hasNextPage ? t("GitHub에서 저장소를 더 불러올 수 있어요.", "More repositories are available on GitHub.") : t("조회 가능한 저장소를 모두 불러왔어요.", "All accessible repositories are loaded.")}</span>{hasNextPage && <Button variant="secondary" disabled={loadingMore} onClick={() => void loadMoreRepositories()}>{loadingMore ? <LoaderCircle size={15} className={styles.spin} aria-hidden="true" /> : <ArrowRight size={15} aria-hidden="true" />}{loadingMore ? t("불러오는 중…", "Loading…") : repositoryError ? t("더 불러오기 다시 시도", "Retry loading more") : t("저장소 더 불러오기", "Load more repositories")}</Button>}</div>
        </Card>
        <Card className={styles.selectionSummary}>
          <span className={styles.summaryIcon}><GitBranch size={21} aria-hidden="true" /></span><span className={styles.eyebrow}>{t("분석할 프로젝트", "YOUR PROJECT")}</span><h2>{t("선택한 저장소", "Selected repository")}</h2>
          {selectedRepository ? <>
            <div className={styles.selectedName}><CheckCircle2 size={17} aria-hidden="true" /><strong>{selectedRepository.fullName}</strong></div>
            {selectedRepository.description && <p className={styles.summaryDescription}>{selectedRepository.description}</p>}
            <dl className={styles.summaryMeta}><div><dt>{t("기본 브랜치", "Default branch")}</dt><dd>{selectedRepository.defaultBranch || t("없음", "None")}</dd></div><div><dt>{t("공개 범위", "Visibility")}</dt><dd>{selectedRepository.isPrivate ? t("비공개", "Private") : t("공개", "Public")}</dd></div>{selectedRepository.language && <div><dt>{t("주요 언어", "Main language")}</dt><dd>{selectedRepository.language}</dd></div>}</dl>
            <a className={styles.inlineLink} href={selectedRepository.htmlUrl} target="_blank" rel="noopener noreferrer">{t("GitHub에서 보기", "View on GitHub")} <ExternalLink size={13} aria-hidden="true" /></a>
            <div className={styles.nextStep}><p>{t("이 저장소의 개발 목표를 입력하고 분석을 시작하세요.", "Set a development goal for this repository and start the analysis.")}</p><Button href={`/analyze?repositoryId=${encodeURIComponent(selectedRepository.id)}`}>{t("이 저장소 분석하기", "Analyze this repository")} <ArrowRight size={15} aria-hidden="true" /></Button></div>
          </> : <div className={styles.noSelection}><p>{t("목록에서 분석할 저장소를 선택해 주세요.", "Select a repository from the list to analyze.")}</p><span>{t("선택 후 새 분석 화면으로 이동할 수 있어요.", "Then continue to the new analysis screen.")}</span></div>}
        </Card>
      </div>
      {selectedRepository && clientReady && createPortal(<aside className={styles.mobileAction} aria-label={t("선택한 저장소의 새 분석으로 이동", "Start a new analysis for the selected repository")}><div><span>{t("선택한 저장소", "Selected repository")}</span><strong title={selectedRepository.fullName}>{selectedRepository.fullName}</strong></div><Button className={styles.mobileCta} href={`/analyze?repositoryId=${encodeURIComponent(selectedRepository.id)}`}>{t("이 저장소 분석하기", "Analyze repository")} <ArrowRight size={14} aria-hidden="true" /></Button></aside>, document.body)}
    </>}
  </>;
}
