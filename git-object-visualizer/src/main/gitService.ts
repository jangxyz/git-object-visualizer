import { existsSync, statSync } from 'fs'
import { join } from 'path'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

/**
 * 커밋 정보 타입
 */
export interface Commit {
  sha: string
  message: string
  author: string
  date: string
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
