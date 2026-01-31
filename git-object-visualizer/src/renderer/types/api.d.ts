/**
 * Git 서비스 API 타입
 */
interface GitApi {
  /**
   * 주어진 경로가 유효한 Git 저장소인지 확인합니다.
   * @param path - 확인할 디렉토리 경로
   * @returns Promise<boolean> - Git 저장소이면 true, 아니면 false
   */
  isValidRepository(path: string): Promise<boolean>
}

/**
 * Dialog API 타입
 */
interface DialogApi {
  /**
   * 폴더 선택 다이얼로그를 엽니다.
   * @returns Promise<string | null> - 선택된 폴더 경로 또는 취소 시 null
   */
  openFolder(): Promise<string | null>
}

/**
 * Electron API (preload에서 노출)
 */
interface ElectronApi {
  git: GitApi
  dialog: DialogApi
}

declare global {
  interface Window {
    api: ElectronApi
  }
}

export {}
