import { existsSync, statSync } from 'fs'
import { join } from 'path'

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
