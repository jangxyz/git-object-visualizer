import { contextBridge, ipcRenderer } from 'electron'

// Git API to be exposed to renderer
const gitApi = {
  /**
   * 주어진 경로가 유효한 Git 저장소인지 확인합니다.
   * @param path - 확인할 디렉토리 경로
   * @returns Promise<boolean> - Git 저장소이면 true, 아니면 false
   */
  isValidRepository: (path: string): Promise<boolean> => {
    return ipcRenderer.invoke('git:isValidRepository', path)
  }
}

// Expose API to renderer process
contextBridge.exposeInMainWorld('api', {
  git: gitApi
})
