import { createContext, useContext, useEffect, useRef, useState } from 'react';

interface ModEntry {
  name: string;
  size: number;
  source: 'mods' | 'other';
  mtime?: number; // <- Ajouté pour suivi (facultatif ici)
}

interface ModInfo {
  name: string;
  size: number;
  mtime: number; // <- Date de modif du serveur (en secondes UNIX)
}

interface ModSyncContextValue {
  isDownloading: boolean;
  progress: number;
  fileProgress: number;
  currentFile: string | null;
  modsReady: boolean;
  modsToDownload: ModEntry[];
  checkMods: (basePath: string, onReadyToPlay: () => void) => void;
  downloadMods: () => void;
  formatRemainingTime: () => string;
}

interface ProgressPayload {
  fileName: string;
  percent: number;
  receivedBytes?: number;
}

const ModSyncContext = createContext<ModSyncContextValue | null>(null);

export function useModSync() {
  const ctx = useContext(ModSyncContext);
  if (!ctx) throw new Error('useModSync must be used inside ModSyncManager');
  return ctx;
}

export function ModSyncManager({ basePath, children }: { basePath: string; children: React.ReactNode }) {
  const [modsToDownload, setModsToDownload] = useState<ModEntry[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileProgress, setFileProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [modsReady, setModsReady] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);
  const [downloadedBytes, setDownloadedBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);

  const downloadedMap = useRef<{ [key: string]: number }>({});

  useEffect(() => {
    if (window.api?.onProgress) {
      window.api.onProgress((data: ProgressPayload) => {
        setCurrentFile(data.fileName);
        setFileProgress(data.percent);

        if (typeof data.receivedBytes === 'number' && data.fileName) {
          downloadedMap.current[data.fileName] = data.receivedBytes;
          const total = Object.values(downloadedMap.current).reduce((acc, val) => acc + val, 0);
          setDownloadedBytes(total);
        }
      });
    } else {
      console.warn("⚠️ window.api.onProgress est indisponible : vérifie que preload.ts est bien chargé");
    }
  }, []);

  const checkMods = async (basePath: string, onReadyToPlay: () => void) => {
    const remoteMods: ModInfo[] = await window.api.getModsList();
    const localPath = `${basePath}/@A3URL/addons`;
    await window.api.ensureDirectory(localPath);

    const missing: ModEntry[] = [];
    let totalSize = 0;

    // Suppression des fichiers obsolètes (inchangé)
    const localFiles = await window.api.listFiles(localPath);
    const remoteNames = new Set(remoteMods.map(m => m.name));
    const toDelete = localFiles.filter((f: string) => !remoteNames.has(f));
    if (toDelete.length > 0) {
      await window.api.deleteFiles(toDelete, localPath);
      console.log(`[CLEAN] Fichiers obsolètes supprimés :`, toDelete);
    }

    // Vérification fichiers mods via mtime
    for (const mod of remoteMods) {
      const filePath = `${localPath}/${mod.name}`;
      const exists = await window.api.checkFileExists(filePath);
      let needsUpdate = false;

      if (!exists) {
        needsUpdate = true;
      } else {
        const localMTime = await window.api.getFileMTime(filePath);
        if (localMTime !== mod.mtime) {
          needsUpdate = true;
          console.log(`[MTIME] Différence détectée pour ${mod.name} → local: ${localMTime}, remote: ${mod.mtime}`);
        }
      }
      if (needsUpdate) {
        missing.push({ name: mod.name, size: mod.size, source: 'mods', mtime: mod.mtime });
        totalSize += mod.size;
      }
    }

    // Vérification autres fichiers ("other resources")
    // On peut garder la vérif classique sur la taille ou ajouter mtime si tu ajoutes cette info côté serveur.
    const otherResources: { name: string; size: number }[] = await window.api.getOtherResources();
    const otherMissing: ModEntry[] = [];
    const otherBase = `${basePath}/@A3URL`;

    for (const file of otherResources) {
      const fullPath = `${otherBase}/${file.name}`;
      const exists = await window.api.checkFileExists(fullPath);
      const localSize = exists ? await window.api.getFileSize(fullPath) : 0;

      if (!exists || localSize !== file.size) {
        otherMissing.push({
          name: file.name,
          size: file.size,
          source: 'other',
        });
        totalSize += file.size;
        if (!exists) {
          console.warn(`[❗] Ajouté au téléchargement : ${file.name}`);
        } else {
          console.warn(`[❗] Taille différente pour ${file.name} : ${localSize} != ${file.size}`);
        }
      }
    }

    const allMissing = [...missing, ...otherMissing];
    console.log(allMissing);
    setModsToDownload(allMissing);
    setTotalBytes(totalSize);

    if (allMissing.length === 0) {
      setModsReady(true);
      onReadyToPlay();
    }
  };

  const downloadMods = async () => {
    if (!basePath || modsToDownload.length === 0) return;

    setIsDownloading(true);
    setProgress(0);
    setStartTime(Date.now());
    setDownloadedBytes(0);
    downloadedMap.current = {};

    for (let i = 0; i < modsToDownload.length; i++) {
      const mod = modsToDownload[i];
      const isFromOtherResources = mod.source === 'other';
      const destination = isFromOtherResources
        ? `${basePath}/@A3URL`
        : `${basePath}/@A3URL/addons`;

      await window.api.startDownload({ fileName: mod.name, destination });
      if (mod.mtime) {
        await window.api.setFileMTime(`${destination}/${mod.name}`, mod.mtime);
      }
      setProgress(Math.round(((i + 1) / modsToDownload.length) * 100));
    }

    setIsDownloading(false);
    await checkMods(basePath, () => setModsReady(true));
  };

  const formatRemainingTime = (): string => {
    if (downloadedBytes < 10240 || totalBytes === 0) return 'Calcul...';
    const elapsed = (Date.now() - startTime) / 1000;
    const rate = downloadedBytes / elapsed;
    const remaining = (totalBytes - downloadedBytes) / rate;
    const minutes = Math.floor(remaining / 60);
    const seconds = Math.floor(remaining % 60);
    return `${minutes}m ${seconds}s`;
  };

  return (
    <ModSyncContext.Provider
      value={{
        isDownloading,
        progress,
        fileProgress,
        currentFile,
        modsReady,
        modsToDownload,
        checkMods,
        downloadMods,
        formatRemainingTime,
      }}
    >
      {children}
    </ModSyncContext.Provider>
  );
}

export default ModSyncManager;
