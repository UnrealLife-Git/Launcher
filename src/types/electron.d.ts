// src/types/electron.d.ts
export {};

declare global {
  interface Window {
    ipcRenderer: {
      on: (channel: string, listener: (...args: any[]) => void) => void;
      off: (channel: string, listener: (...args: any[]) => void) => void;
      send: (channel: string, data?: any) => void;
      invoke: (channel: string, data?: any) => Promise<any>;
    };
  }
}
