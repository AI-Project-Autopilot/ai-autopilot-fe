export type WorkspaceLanguage = "ko" | "en";

const messages: Record<string, { ko: string; en: string }> = {
  "repository.forbidden": { ko: "저장소 접근 권한이 없습니다. GitHub 권한을 다시 승인해 주세요.", en: "You do not have access to these repositories. Reauthorize access on GitHub." },
  "repository.rateLimit": { ko: "GitHub 요청 한도에 도달했습니다. 잠시 후 다시 시도해 주세요.", en: "GitHub's request limit has been reached. Please try again later." },
  "repository.failed": { ko: "저장소를 불러오지 못했습니다. 연결 상태를 확인하고 다시 시도해 주세요.", en: "Could not load repositories. Check your connection and try again." },
  "analysis.invalid": { ko: "분석 요청이 올바르지 않습니다. 개발 목표를 2,000자 이내로 입력해 주세요.", en: "The analysis request is invalid. Keep your development goal within 2,000 characters." },
  "analysis.forbidden": { ko: "선택한 저장소를 읽을 권한이 없습니다. GitHub 권한을 확인해 주세요.", en: "You do not have permission to read this repository. Check your GitHub permissions." },
  "analysis.notFound": { ko: "저장소를 찾을 수 없습니다. 목록을 새로고침해 주세요.", en: "The repository could not be found. Refresh the repository list." },
  "analysis.conflict": { ko: "이미 분석이 진행 중입니다. 잠시 후 다시 시도해 주세요.", en: "An analysis is already running. Please try again later." },
  "analysis.empty": { ko: "분석할 수 있는 문서나 코드가 없습니다. 다른 저장소를 선택해 주세요.", en: "There are no documents or source files to analyze. Choose another repository." },
  "analysis.rateLimit": { ko: "요청이 많습니다. 잠시 후 다시 분석해 주세요.", en: "There are too many requests. Please try analyzing again later." },
  "analysis.resultFailed": { ko: "분석 결과를 받지 못했습니다. 잠시 후 다시 시도해 주세요.", en: "Could not receive the analysis result. Please try again later." },
  "analysis.unavailable": { ko: "현재 분석 서비스를 사용할 수 없습니다. 잠시 후 다시 시도해 주세요.", en: "The analysis service is currently unavailable. Please try again later." },
  "analysis.timeout": { ko: "분석 시간이 초과되었습니다. 목표를 좁혀 다시 시도해 주세요.", en: "The analysis timed out. Try again with a more focused goal." },
  "analysis.apiFailed": { ko: "저장소 분석에 실패했습니다. 잠시 후 다시 시도해 주세요.", en: "Repository analysis failed. Please try again later." },
  "analysis.connectionFailed": { ko: "분석을 완료하지 못했습니다. 연결 상태를 확인하고 다시 시도해 주세요.", en: "Could not complete the analysis. Check your connection and try again." },
  "analysis.storage": { ko: "분석 결과를 보관하지 못했습니다. 브라우저의 저장소 사용을 허용한 뒤 다시 시도해 주세요.", en: "Could not save the analysis result. Allow browser storage and try again." },
  "selection.invalid": { ko: "저장소 주소가 올바르지 않습니다. 저장소 목록에서 다시 선택해 주세요.", en: "The repository address is invalid. Choose a repository from the list." },
  "selection.notFound": { ko: "선택한 저장소를 찾을 수 없거나 접근 권한이 없습니다. 저장소 목록에서 다시 선택해 주세요.", en: "The selected repository was not found or is inaccessible. Choose another repository from the list." },
  "selection.failed": { ko: "저장소를 확인하지 못했습니다. 저장소 목록에서 다시 선택해 주세요.", en: "Could not verify the repository. Choose a repository from the list." },
};

export function workspaceErrorMessage(key: string | null, language: WorkspaceLanguage): string | null {
  return key ? messages[key]?.[language] ?? messages["repository.failed"][language] : null;
}
