// modSync.ts (renderer side)
import fs from 'fs';
import path from 'path';

export interface ModFile {
  name: string;
  size: number;
}

export interface ModCheckResult {
  toDownload: ModFile[];
  toDelete: string[];
}

export async function checkMods(basePath: string): Promise<ModCheckResult> {
  const addonsPath = path.join(basePath, '@A3URL', 'addons');
  const modsUrl = 'http://188.165.200.136/modsList/modsList.json';

  const res = await fetch(modsUrl);
  const remoteMods: ModFile[] = await res.json();

  // Créer les dossiers si besoin
  if (!fs.existsSync(addonsPath)) {
    fs.mkdirSync(addonsPath, { recursive: true });
  }

  const localFiles = fs.readdirSync(addonsPath);
  const localStats = new Map<string, number>();

  for (const file of localFiles) {
    const fullPath = path.join(addonsPath, file);
    const stat = fs.statSync(fullPath);
    if (stat.isFile()) {
      localStats.set(file, stat.size);
    }
  }

  const toDownload: ModFile[] = [];
  const toDelete: string[] = [];

  // Fichiers à télécharger
  for (const mod of remoteMods) {
    const localSize = localStats.get(mod.name);
    if (localSize !== mod.size) {
      toDownload.push(mod);
    }
    localStats.delete(mod.name);
  }

  // Fichiers locaux non listés à supprimer
  for (const extraFile of localStats.keys()) {
    toDelete.push(extraFile);
  }

  return { toDownload, toDelete };
}

export async function deleteFiles(files: string[], directory: string) {
  for (const file of files) {
    const filePath = path.join(directory, file);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}
