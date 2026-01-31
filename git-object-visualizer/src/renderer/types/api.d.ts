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
 * Electron API (preload에서 노출)
 */
interface ElectronApi {
  git: GitApi
}

declare global {
  interface Window {
    api: ElectronApi
  }
}

export {}
