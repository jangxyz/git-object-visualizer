import { existsSync, statSync } from 'fs'
import { join } from 'path'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

/**
 * 커밋 정보 타입 (히스토리용)
 */
export interface Commit {
  sha: string
  message: string
  author: string
  date: string
}

/**
 * 커밋 객체 상세 정보 타입
 */
export interface CommitObject {
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
export interface TreeEntry {
  mode: string
  type: 'blob' | 'tree'
  sha: string
  name: string
}

/**
 * Git 저장소 관련 서비스 함수들
 */

/**
 * 주어진 경로가 유효한 Git 저장소인지 확인합니다.
 * .git 폴더의 존재 여부로 판단합니다.
 * @param repoPath - 확인할 디렉토리 경로
 * @returns Git 저장소이면 true, 아니면 false
 */
export function isValidRepository(repoPath: string): boolean {
  try {
    const gitPath = join(repoPath, '.git')
    return existsSync(gitPath) && statSync(gitPath).isDirectory()
  } catch {
    return false
  }
}

/**
 * 저장소의 커밋 히스토리를 조회합니다.
 * @param repoPath - Git 저장소 경로
 * @param limit - 조회할 커밋 수 (기본값: 50)
 * @returns 커밋 목록
 */
export async function getCommitHistory(repoPath: string, limit: number = 50): Promise<Commit[]> {
  const format = '%H%n%s%n%an%n%aI'
  const separator = '---COMMIT_SEPARATOR---'

  const { stdout } = await execFileAsync('git', [
    'log',
    `--format=${format}${separator}`,
    `-n${limit}`
  ], { cwd: repoPath })

  const commits: Commit[] = []
  const entries = stdout.split(separator).filter(entry => entry.trim())

  for (const entry of entries) {
    const lines = entry.trim().split('\n')
    if (lines.length >= 4) {
      commits.push({
        sha: lines[0],
        message: lines[1],
        author: lines[2],
        date: lines[3]
      })
    }
  }

  return commits
}

/**
 * 커밋 객체의 상세 정보를 조회합니다.
 * @param repoPath - Git 저장소 경로
 * @param sha - 커밋 SHA
 * @returns 커밋 객체 정보
 */
export async function getCommit(repoPath: string, sha: string): Promise<CommitObject> {
  // git cat-file -p <sha> 로 커밋 내용을 가져옴
  const { stdout } = await execFileAsync('git', [
    'cat-file',
    '-p',
    sha
  ], { cwd: repoPath })

  const lines = stdout.split('\n')
  let tree = ''
  const parents: string[] = []
  let author = ''
  let authorDate = ''
  let committer = ''
  let committerDate = ''
  let messageStartIndex = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line === '') {
      // 빈 줄 이후는 커밋 메시지
      messageStartIndex = i + 1
      break
    }
    if (line.startsWith('tree ')) {
      tree = line.substring(5)
    } else if (line.startsWith('parent ')) {
      parents.push(line.substring(7))
    } else if (line.startsWith('author ')) {
      // author 형식: "author Name <email> timestamp timezone"
      const authorMatch = line.match(/^author (.+) <.+> (\d+) ([+-]\d{4})$/)
      if (authorMatch) {
        author = authorMatch[1]
        // timestamp를 ISO 8601 형식으로 변환
        const timestamp = parseInt(authorMatch[2], 10) * 1000
        authorDate = new Date(timestamp).toISOString()
      }
    } else if (line.startsWith('committer ')) {
      const committerMatch = line.match(/^committer (.+) <.+> (\d+) ([+-]\d{4})$/)
      if (committerMatch) {
        committer = committerMatch[1]
        const timestamp = parseInt(committerMatch[2], 10) * 1000
        committerDate = new Date(timestamp).toISOString()
      }
    }
  }

  const message = lines.slice(messageStartIndex).join('\n').trim()

  return {
    sha,
    tree,
    parents,
    author,
    authorDate,
    committer,
    committerDate,
    message
  }
}

/**
 * 트리 객체의 항목 목록을 조회합니다.
 * @param repoPath - Git 저장소 경로
 * @param sha - 트리 SHA
 * @returns 트리 항목 목록
 */
export async function getTree(repoPath: string, sha: string): Promise<TreeEntry[]> {
  // git ls-tree <sha> 로 트리 내용을 가져옴
  const { stdout } = await execFileAsync('git', [
    'ls-tree',
    sha
  ], { cwd: repoPath })

  const entries: TreeEntry[] = []
  const lines = stdout.split('\n').filter(line => line.trim())

  for (const line of lines) {
    // 형식: "<mode> <type> <sha>\t<name>"
    const match = line.match(/^(\d{6})\s+(blob|tree)\s+([a-f0-9]{40})\t(.+)$/)
    if (match) {
      entries.push({
        mode: match[1],
        type: match[2] as 'blob' | 'tree',
        sha: match[3],
        name: match[4]
      })
    }
  }

  return entries
}

/**
 * Blob 객체의 내용을 조회합니다.
 * @param repoPath - Git 저장소 경로
 * @param sha - Blob SHA
 * @returns Blob 내용 (문자열)
 */
export async function getBlob(repoPath: string, sha: string): Promise<string> {
  // git cat-file -p <sha> 로 blob 내용을 가져옴
  const { stdout } = await execFileAsync('git', [
    'cat-file',
    '-p',
    sha
  ], { cwd: repoPath })

  return stdout
}
