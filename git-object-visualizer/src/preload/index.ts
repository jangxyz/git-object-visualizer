import { contextBridge, ipcRenderer } from 'electron'

// Commit type for renderer (히스토리용)
interface Commit {
  sha: string
  message: string
  author: string
  date: string
}

// CommitObject type for renderer (상세 정보용)
interface CommitObject {
  sha: string
  tree: string
  parents: string[]
  author: string
  authorDate: string
  committer: string
  committerDate: string
  message: string
}

// TreeEntry type for renderer
interface TreeEntry {
  mode: string
  type: 'blob' | 'tree'
  sha: string
  name: string
}

// Git API to be exposed to renderer
const gitApi = {
  /**
   * 주어진 경로가 유효한 Git 저장소인지 확인합니다.
   * @param path - 확인할 디렉토리 경로
   * @returns Promise<boolean> - Git 저장소이면 true, 아니면 false
   */
  isValidRepository: (path: string): Promise<boolean> => {
    return ipcRenderer.invoke('git:isValidRepository', path)
  },

  /**
   * 저장소의 커밋 히스토리를 조회합니다.
   * @param repoPath - Git 저장소 경로
   * @param limit - 조회할 커밋 수 (기본값: 50)
   * @returns Promise<Commit[]> - 커밋 목록
   */
  getCommitHistory: (repoPath: string, limit?: number): Promise<Commit[]> => {
    return ipcRenderer.invoke('git:getCommitHistory', repoPath, limit)
  },

  /**
   * 커밋 객체의 상세 정보를 조회합니다.
   * @param repoPath - Git 저장소 경로
   * @param sha - 커밋 SHA
   * @returns Promise<CommitObject> - 커밋 객체 정보
   */
  getCommit: (repoPath: string, sha: string): Promise<CommitObject> => {
    return ipcRenderer.invoke('git:getCommit', repoPath, sha)
  },

  /**
   * 트리 객체의 항목 목록을 조회합니다.
   * @param repoPath - Git 저장소 경로
   * @param sha - 트리 SHA
   * @returns Promise<TreeEntry[]> - 트리 항목 목록
   */
  getTree: (repoPath: string, sha: string): Promise<TreeEntry[]> => {
    return ipcRenderer.invoke('git:getTree', repoPath, sha)
  },

  /**
   * Blob 객체의 내용을 조회합니다.
   * @param repoPath - Git 저장소 경로
   * @param sha - Blob SHA
   * @returns Promise<string> - Blob 내용
   */
  getBlob: (repoPath: string, sha: string): Promise<string> => {
    return ipcRenderer.invoke('git:getBlob', repoPath, sha)
  }
}

// Dialog API to be exposed to renderer
const dialogApi = {
  /**
   * 폴더 선택 다이얼로그를 엽니다.
   * @returns Promise<string | null> - 선택된 폴더 경로 또는 취소 시 null
   */
  openFolder: (): Promise<string | null> => {
    return ipcRenderer.invoke('dialog:openFolder')
  }
}

// Expose API to renderer process
contextBridge.exposeInMainWorld('api', {
  git: gitApi,
  dialog: dialogApi
})
