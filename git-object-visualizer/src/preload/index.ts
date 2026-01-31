import { contextBridge } from 'electron'

// Expose API to renderer process
contextBridge.exposeInMainWorld('api', {
  // API will be added in later stories
})
