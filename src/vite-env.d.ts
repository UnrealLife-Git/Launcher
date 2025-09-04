/// <reference types="vite/client" />

export { };

interface ModInfo {
  name: string;
  size: number;
  hash?: string; // Hash optionnel pendant la migration
}

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
      getFileChecksum: (filePath: string) => Promise<string | null>;
      getFileChecksumSmart: (filePath: string, expectedSize: number) => Promise<string | null>;
      getFileChecksumBatch: (filePaths: string[]) => Promise<{ [filePath: string]: string | null }>;

    };
  }
}
