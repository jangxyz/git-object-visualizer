import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { isValidRepository, getCommitHistory, getCommit, getTree, getBlob, buildObjectGraph } from './gitService'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

/**
 * IPC 에러 로깅 및 처리 헬퍼 함수
 * @param handlerName - IPC 핸들러 이름
 * @param params - 핸들러에 전달된 파라미터
 * @param error - 발생한 에러
 * @returns 에러 정보를 담은 객체
 */
function logAndFormatError(handlerName: string, params: Record<string, unknown>, error: unknown): { error: true; message: string; handlerName: string } {
  const errorMessage = error instanceof Error ? error.message : String(error)
  const errorStack = error instanceof Error ? error.stack : undefined

  console.error(`[IPC Error] ${handlerName}`)
  console.error(`  Parameters: ${JSON.stringify(params)}`)
  console.error(`  Message: ${errorMessage}`)
  if (errorStack) {
    console.error(`  Stack: ${errorStack}`)
  }

  return {
    error: true,
    message: errorMessage,
    handlerName
  }
}

// IPC handlers for git service
ipcMain.handle('git:isValidRepository', async (_event, path: string) => {
  try {
    return isValidRepository(path)
  } catch (error) {
    return logAndFormatError('git:isValidRepository', { path }, error)
  }
})

ipcMain.handle('git:getCommitHistory', async (_event, repoPath: string, limit?: number) => {
  try {
    return await getCommitHistory(repoPath, limit)
  } catch (error) {
    return logAndFormatError('git:getCommitHistory', { repoPath, limit }, error)
  }
})

ipcMain.handle('git:getCommit', async (_event, repoPath: string, sha: string) => {
  try {
    return await getCommit(repoPath, sha)
  } catch (error) {
    return logAndFormatError('git:getCommit', { repoPath, sha }, error)
  }
})

ipcMain.handle('git:getTree', async (_event, repoPath: string, sha: string) => {
  try {
    return await getTree(repoPath, sha)
  } catch (error) {
    return logAndFormatError('git:getTree', { repoPath, sha }, error)
  }
})

ipcMain.handle('git:getBlob', async (_event, repoPath: string, sha: string) => {
  try {
    return await getBlob(repoPath, sha)
  } catch (error) {
    return logAndFormatError('git:getBlob', { repoPath, sha }, error)
  }
})

ipcMain.handle('git:buildObjectGraph', async (_event, repoPath: string, commitSha: string, maxDepth?: number) => {
  try {
    return await buildObjectGraph(repoPath, commitSha, maxDepth)
  } catch (error) {
    return logAndFormatError('git:buildObjectGraph', { repoPath, commitSha, maxDepth }, error)
  }
})

// Dialog handler for opening folder
ipcMain.handle('dialog:openFolder', async () => {
  try {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: '저장소 폴더 선택'
    })
    if (result.canceled || result.filePaths.length === 0) {
      return null
    }
    return result.filePaths[0]
  } catch (error) {
    return logAndFormatError('dialog:openFolder', {}, error)
  }
})

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
