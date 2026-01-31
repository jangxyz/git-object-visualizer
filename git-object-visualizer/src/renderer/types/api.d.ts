/**
 * 커밋 정보 타입 (히스토리용)
 */
interface Commit {
  sha: string
  message: string
  author: string
  date: string
}

/**
 * 커밋 객체 상세 정보 타입
 */
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

/**
 * 트리 항목 타입
 */
interface TreeEntry {
  mode: string
  type: 'blob' | 'tree'
  sha: string
  name: string
}

/**
 * 그래프 노드 타입
 */
interface GraphNode {
  id: string
  type: 'commit' | 'tree' | 'blob'
  label: string
  name?: string
}

/**
 * 그래프 엣지 타입
 */
interface GraphEdge {
  source: string
  target: string
}

/**
 * 객체 그래프 타입
 */
interface ObjectGraph {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

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

  /**
   * 저장소의 커밋 히스토리를 조회합니다.
   * @param repoPath - Git 저장소 경로
   * @param limit - 조회할 커밋 수 (기본값: 50)
   * @returns Promise<Commit[]> - 커밋 목록
   */
  getCommitHistory(repoPath: string, limit?: number): Promise<Commit[]>

  /**
   * 커밋 객체의 상세 정보를 조회합니다.
   * @param repoPath - Git 저장소 경로
   * @param sha - 커밋 SHA
   * @returns Promise<CommitObject> - 커밋 객체 정보
   */
  getCommit(repoPath: string, sha: string): Promise<CommitObject>

  /**
   * 트리 객체의 항목 목록을 조회합니다.
   * @param repoPath - Git 저장소 경로
   * @param sha - 트리 SHA
   * @returns Promise<TreeEntry[]> - 트리 항목 목록
   */
  getTree(repoPath: string, sha: string): Promise<TreeEntry[]>

  /**
   * Blob 객체의 내용을 조회합니다.
   * @param repoPath - Git 저장소 경로
   * @param sha - Blob SHA
   * @returns Promise<string> - Blob 내용
   */
  getBlob(repoPath: string, sha: string): Promise<string>

  /**
   * 선택된 커밋의 객체들을 그래프 데이터 구조로 변환합니다.
   * @param repoPath - Git 저장소 경로
   * @param commitSha - 커밋 SHA
   * @param maxDepth - 탐색 깊이 제한 (기본값: 3)
   * @returns Promise<ObjectGraph> - 객체 그래프 (nodes와 edges)
   */
  buildObjectGraph(repoPath: string, commitSha: string, maxDepth?: number): Promise<ObjectGraph>
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
