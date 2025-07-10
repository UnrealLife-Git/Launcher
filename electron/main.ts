import { app, BrowserWindow, ipcMain, shell, dialog, net  } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import fetch from 'node-fetch';
import path from 'node:path'
import fs from 'fs';
import { writeFile } from 'fs/promises';
import {  existsSync, mkdirSync, readdirSync } from 'fs';
import { Readable } from 'stream';
import http from 'http';
import { spawn } from 'child_process';
import { autoUpdater } from 'electron-updater';
import crypto from 'crypto';


const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

function createWindow() {
  win = new BrowserWindow({
    width: 920,
  height: 550,
  frame: false, // supprime la barre native
  roundedCorners: true, // Windows uniquement
  transparent: false,
  titleBarStyle: 'hiddenInset',
  resizable: false,
  backgroundColor: '#0d1117',
    icon: path.join(process.env.VITE_PUBLIC, 'logo.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true, // <-- obligatoire
      nodeIntegration: false,
    },
  })
  win.setMaximizable(false);
  win.setFullScreenable(false);

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }

  autoUpdater.on('checking-for-update', () => {
    console.log('[AutoUpdater] Checking for update...');
  });
  autoUpdater.on('update-available', (info) => {
    console.log('[AutoUpdater] Update available:', info);
  });
  autoUpdater.on('update-not-available', (info) => {
    console.log('[AutoUpdater] Update not available:', info);
  });
  autoUpdater.on('error', (err) => {
    console.error('[AutoUpdater] Error:', err);
  });
  autoUpdater.on('download-progress', (progressObj) => {
    console.log('[AutoUpdater] Download progress:', progressObj);
  });
  autoUpdater.on('update-downloaded', (info) => {
    console.log('[AutoUpdater] Update downloaded:', info);
  });

  autoUpdater.checkForUpdatesAndNotify();
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(() => {
  createWindow();

  setInterval(() => {
    autoUpdater.checkForUpdatesAndNotify();
  }, 1000 * 60 * 60);

  autoUpdater.autoDownload = true; // C'est la valeur par défaut, mais important à forcer

  autoUpdater.on('update-downloaded', () => {
    setTimeout(() => {
      autoUpdater.quitAndInstall();
    }, 5000); // Laisse 5 secondes à l'utilisateur avant redémarrage automatique
  });

  // 🔁 Vérifie immédiatement s'il y a une mise à jour
  autoUpdater.checkForUpdates();
  
});

ipcMain.on('close-app', () => {
  win?.close();
});

ipcMain.handle('open-external', async (event, url) => {
  await shell.openExternal(url);
});

ipcMain.on('restart-app', () => {
  autoUpdater.quitAndInstall();
});


ipcMain.handle('get-news-md', async () => {
  const res = await fetch('http://188.165.200.136/news/news.md');
  const text = await res.text();
  return text;
});

ipcMain.handle('get-mods-list', async () => {
  const res = await fetch('http://188.165.200.136/modsList/modsList.json');
  const json = await res.json();
  return json;
});

ipcMain.handle('open-dialog', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
  });
  return result.filePaths[0];
});

ipcMain.handle('dialog:open', async (_, startPath?: string) => {
  const result = await dialog.showOpenDialog({
    title: 'Sélectionnez le dossier du jeu',
    defaultPath: startPath,
    properties: ['openDirectory']
  });

  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('check:arma3', async (_, folderPath: string) => {
  try {
    const exePath = path.join(folderPath, 'arma3.exe');
    return fs.existsSync(exePath);
  } catch {
    return false;
  }
});

ipcMain.handle('write-file', async (_event, targetPath: string, buffer: Buffer) => {
  const dir = path.dirname(targetPath);
  fs.mkdirSync(dir, { recursive: true }); // ← crée le dossier parent si besoin
  await writeFile(targetPath, buffer);
  return true;
});

ipcMain.handle('download-mod-file', async (_event, fileName: string) => {
  const res = await fetch(`http://188.165.200.136/modsList/${fileName}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  return buffer;
});

ipcMain.handle('fs:exists', async (_, filePath: string) => {
  try {
    const nativePath = path.normalize(filePath);
    return fs.existsSync(nativePath);
  } catch (e) {
    console.error('Erreur fs:exists', e);
    return false;
  }
});

ipcMain.handle('fs:size', async (_, filePath: string) => {
  try {
    const nativePath = path.normalize(filePath);
    const stats = fs.statSync(nativePath);
    return stats.size;
  } catch (e) {
    console.error('Erreur fs:size', e);
    return -1;
  }
});


ipcMain.handle('fs:ensureDir', async (_, dirPath: string) => {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
});

ipcMain.handle('fs:readDir', async (_, dirPath: string) => {
  try {
    return readdirSync(dirPath);
  } catch {
    return [];
  }
});

ipcMain.handle('download-mod-stream', async (_event, fileName: string) => {
  return new Promise((resolve, reject) => {
    const request = net.request(`http://188.165.200.136/modsList/${fileName}`);
    request.on('response', (response) => {
      const stream = Readable.fromWeb(response as any); // cast to allow usage
      resolve(stream);
    });
    request.on('error', reject);
    request.end();
  });
});

ipcMain.handle('download-mod-file-stream', async (_event, fileName: string) => {
  return new Promise((resolve, reject) => {
    const url = `http://188.165.200.136/modsList/${fileName}`;
    const request = http.get(url, (res) => {
      resolve(res); // ← res est un flux lisible (IncomingMessage)
    });

    request.on('error', (err) => {
      reject(err);
    });
  });
});

ipcMain.handle('start-download', async (_event, { fileName, destination }) => {
  return new Promise((resolve, reject) => {
    // On regarde l'extension
    const isOtherResource = !fileName.endsWith('.pbo') && !fileName.endsWith('.bisign');
    const baseUrl = isOtherResource
      ? 'http://188.165.200.136/other_ressources'
      : 'http://188.165.200.136/modsList';
    const url = `${baseUrl}/${fileName}`;
    const filePath = path.join(destination, fileName);
    const file = fs.createWriteStream(filePath);

    http.get(url, (res) => {
      // ⚠️ Vérifie le code HTTP avant d'écrire
      if (res.statusCode !== 200) {
        file.close();
        fs.unlink(filePath, () => {}); // On nettoie le fichier s'il existe
        return reject(
          new Error(
            `[DOWNLOAD] Fichier introuvable sur le serveur : ${fileName} (HTTP ${res.statusCode})`
          )
        );
      }

      const totalSize = parseInt(res.headers['content-length'] || '0', 10);
      let downloaded = 0;

      res.on('data', (chunk) => {
        downloaded += chunk.length;
        win?.webContents.send('download-progress', {
          fileName,
          percent: Math.floor((downloaded / totalSize) * 100),
          downloaded,
          totalSize,
        });
      });

      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(true);
      });
    }).on('error', (err) => {
      fs.unlink(filePath, () => reject(err));
    });
  });
});


ipcMain.handle('get-other-resources', async () => {
  const response = await fetch('http://188.165.200.136/other_ressources/');
  const html = await response.text();

  const regex = /href="([^"]+\.(dll|paa|cpp|ts3_plugin))"/gi;
  const matches = Array.from(html.matchAll(regex));
  const files = matches.map(match => match[1]);

  const fileStats = await Promise.all(
    files.map(async name => {
      const url = `http://188.165.200.136/other_ressources/${name}`;
      const head = await fetch(url, { method: 'HEAD' });
      const size = parseInt(head.headers.get('content-length') || '0');
      return { name, size };
    })
  );

  return fileStats;
});


ipcMain.handle('launch-game', async (_, gamePath: string) => {
  const armaExe = path.join(gamePath, 'arma3_x64.exe');
  const battleEyeExe = path.join(gamePath, 'arma3battleye.exe');
  const armaCfg = path.join(app.getPath('documents'), 'Arma 3', 'arma3.cfg');

  let args = [
    '2', '1', '0',
    '-exe', armaExe,
    '-malloc=jemalloc_bi_x64',
    '-enableHT',
    '-mod=@A3URL',
    '-world=empty',
    '-nosplash',
    '-noPause',
    '-noPauseAudio',
    '-skipIntro',
    '-connect=188.165.200.136',
    '-port=2302',
    '-password=btrteam',
    '-BEservice'
  ];

  if (fs.existsSync(armaCfg)) {
    args.push(`-cfg=${armaCfg}`);
  }

  if (!fs.existsSync(battleEyeExe) || !fs.existsSync(armaExe)) {
    throw new Error("Les exécutables requis sont introuvables.");
  }

  const process = spawn(battleEyeExe, args, {
    windowsHide: true,
    detached: true
  });

  process.on('error', err => {
    console.error('Erreur au lancement :', err);
  });

  return 'Jeu lancé';
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('list-files', async (_event, directory: string) => {
  try {
    return fs.readdirSync(directory).filter(f => fs.statSync(path.join(directory, f)).isFile());
  } catch {
    return [];
  }
});

ipcMain.handle('delete-files', async (_event, files: string[], directory: string) => {
  const deleted: string[] = [];
  for (const file of files) {
    try {
      fs.unlinkSync(path.join(directory, file));
      deleted.push(file);
    } catch {}
  }
  return deleted;
});
// Dans le main process
ipcMain.handle('fs:mtime', async (_event, filePath: string) => {
  try {
    if (!fs.existsSync(filePath)) return null;
    const stats = fs.statSync(filePath);
    // Attention, statSync(filePath).mtime.getTime() retourne des ms, alors que le bash retourne des secondes
    return Math.floor(stats.mtime.getTime() / 1000);
  } catch (e) {
    return null;
  }
});

ipcMain.handle('fs:setmtime', async (_event, filePath, mtime) => {
  try {
    fs.utimesSync(filePath, new Date(), new Date(mtime * 1000));
    return true;
  } catch (e) {
    console.error('[SETMTIME]', e);
    return false;
  }
});
