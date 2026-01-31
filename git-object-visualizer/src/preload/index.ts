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
