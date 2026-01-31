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

// IPC handlers for git service
ipcMain.handle('git:isValidRepository', (_event, path: string) => {
  return isValidRepository(path)
})

ipcMain.handle('git:getCommitHistory', (_event, repoPath: string, limit?: number) => {
  return getCommitHistory(repoPath, limit)
})

ipcMain.handle('git:getCommit', (_event, repoPath: string, sha: string) => {
  return getCommit(repoPath, sha)
})

ipcMain.handle('git:getTree', (_event, repoPath: string, sha: string) => {
  return getTree(repoPath, sha)
})

ipcMain.handle('git:getBlob', (_event, repoPath: string, sha: string) => {
  return getBlob(repoPath, sha)
})

ipcMain.handle('git:buildObjectGraph', (_event, repoPath: string, commitSha: string, maxDepth?: number) => {
  return buildObjectGraph(repoPath, commitSha, maxDepth)
})

// Dialog handler for opening folder
ipcMain.handle('dialog:openFolder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: '저장소 폴더 선택'
  })
  if (result.canceled || result.filePaths.length === 0) {
    return null
  }
  return result.filePaths[0]
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
