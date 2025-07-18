/// <reference types="vite/client" />

export { };

declare global {

  interface Window {
    electronAPI: {
      onUpdateAvailable: (callback: () => void) => void;
      onUpdateDownloaded: (callback: () => void) => void;
      restartApp: () => void;
    };
    api: {
      getNewsMarkdown: () => Promise<string>;
      openExternal: (url: string) => Promise<void>;
      openDialog: (startingPath?: string) => Promise<string | null>;
      checkExecutable: (folderPath: string) => Promise<boolean>;
      getModsList: () => Promise<ModInfo[]>;
      downloadModFile: (fileName: string) => Promise<Buffer>;
      writeFile: (path: string, data: Buffer) => Promise<void>;
      checkFileExists: (path: string) => Promise<boolean>;
      getFileSize: (path: string) => Promise<number>;
      ensureDirectory: (dir: string) => Promise<void>;
      readDir: (dir: string) => Promise<string[]>;
      downloadModStream: (fileName: string) => Promise<{
        body: ReadableStream<Uint8Array>;
      }>;
      startDownload: (params: { fileName: string; destination: string }) => Promise<boolean>;
      onProgress: (callback: (data: { fileName: string; percent: number; receivedBytes?: number }) => void) => void;
      offProgress: (callback: (data: { fileName: string; percent: number }) => void) => void;
      getOtherResources: () => Promise<{ name: string; size: number }[]>;
      launchGame: (basePath: string) => Promise<boolean>;
      send: (channel: string, ...args: any[]) => void;
      getAppVersion: () => Promise<string>;
      listFiles: (directory: string) => Promise<string[]>;
      deleteFiles: (files: string[], directory: string) => Promise<string[]>;
      getFileMTime: (filePath: string) => Promise<number | null>;
      setFileMTime: (filePath: string, mtime: number) => Promise<boolean>;

    };
  }
}
