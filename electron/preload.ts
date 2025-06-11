// --- preload.ts ---
import { ipcRenderer, contextBridge } from 'electron';
//import path from 'path';

contextBridge.exposeInMainWorld('electronAPI', {
  onUpdateAvailable: (callback: () => void) => ipcRenderer.on('update_available', callback),
  onUpdateDownloaded: (callback: () => void) => ipcRenderer.on('update_downloaded', callback),
  restartApp: () => ipcRenderer.send('restart_app')
});

contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args;
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args));
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args;
    return ipcRenderer.off(channel, ...omit);
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args;
    return ipcRenderer.send(channel, ...omit);
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args;
    return ipcRenderer.invoke(channel, ...omit);
  }
});

contextBridge.exposeInMainWorld('updater', {
  onUpdateAvailable: (callback: () => void) => ipcRenderer.on('update_available', callback),
  onUpdateDownloaded: (callback: () => void) => ipcRenderer.on('update_downloaded', callback),
});


contextBridge.exposeInMainWorld('api', {
  getNewsMarkdown: () => ipcRenderer.invoke('get-news-md'),
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  openDialog: () => ipcRenderer.invoke('open-dialog'),
  checkExecutable: (folderPath: string) => ipcRenderer.invoke('check:arma3', folderPath),
  getModsList: () => ipcRenderer.invoke('get-mods-list'),
  downloadModFile: (fileName: string) => ipcRenderer.invoke('download-mod-file', fileName),
  writeFile: (path: string, data: Buffer) => ipcRenderer.invoke('write-file', path, data),
  checkFileExists: (filePath: string) => ipcRenderer.invoke('fs:exists', filePath),
  getFileSize: (filePath: string) => ipcRenderer.invoke('fs:size', filePath),
  ensureDirectory: (dirPath: string) => ipcRenderer.invoke('fs:ensureDir', dirPath),
  readDir: (dirPath: string) => ipcRenderer.invoke('fs:readDir', dirPath),
  downloadModStream: (fileName: string) => ipcRenderer.invoke('download-mod-file-stream', fileName),
  startDownload: (params: { fileName: string; destination: string }) => ipcRenderer.invoke('start-download', params),
  onProgress: (callback: (data: { fileName: string; percent: number; receivedBytes?: number }) => void) => {
    ipcRenderer.on('download-progress', (_event, data) => callback(data));
  },
  getOtherResources: () => ipcRenderer.invoke('get-other-resources'),
  launchGame: (gamePath: string) => ipcRenderer.invoke('launch-game', gamePath),
  send: (...args: Parameters<typeof ipcRenderer.send>) => ipcRenderer.send(...args),
});