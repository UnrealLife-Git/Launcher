import { createContext, useContext, useEffect, useRef, useState } from 'react';

interface ModEntry {
  name: string;
  size: number;
  source: 'mods' | 'other';
  hash?: string;  // Hash MD5/SHA256 OBLIGATOIRE pour la vérification
}

interface ModInfo {
  name: string;
  size: number;
  hash?: string; // Hash optionnel pendant la migration, puis obligatoire
}

interface ModSyncContextValue {
  isDownloading: boolean;
  isVerifying: boolean;
  progress: number;
  fileProgress: number;
  verificationProgress: number;
  currentFile: string | null;
  currentVerifyingFile: string | null;
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
  const [isVerifying, setIsVerifying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileProgress, setFileProgress] = useState(0);
  const [verificationProgress, setVerificationProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [currentVerifyingFile, setCurrentVerifyingFile] = useState<string | null>(null);
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
    setIsVerifying(true);
    setVerificationProgress(0);
    setCurrentVerifyingFile(null);
    
    const remoteMods: ModInfo[] = await window.api.getModsList();
    const localPath = `${basePath}/@A3URL/addons`;
    await window.api.ensureDirectory(localPath);

    const missing: ModEntry[] = [];
    let totalSize = 0;

    // Suppression des fichiers obsolètes
    setCurrentVerifyingFile('Nettoyage des fichiers obsolètes...');
    const localFiles = await window.api.listFiles(localPath);
    const remoteNames = new Set(remoteMods.map(m => m.name));
    const toDelete = localFiles.filter((f: string) => !remoteNames.has(f));
    if (toDelete.length > 0) {
      await window.api.deleteFiles(toDelete, localPath);
      console.log(`[CLEAN] Fichiers obsolètes supprimés :`, toDelete);
    }

    console.log(`[SMART_CACHE] Vérification rapide de ${remoteMods.length} fichiers avec cache intelligent...`);
    
    for (let i = 0; i < remoteMods.length; i++) {
      const mod = remoteMods[i];
      const filePath = `${localPath}/${mod.name}`;
      
      // Mise à jour de la progression
      const progressPercent = Math.round((i / remoteMods.length) * 100);
      setVerificationProgress(progressPercent);
      setCurrentVerifyingFile(mod.name);
      
      const exists = await window.api.checkFileExists(filePath);
      let needsUpdate = false;

      if (!exists) {
        needsUpdate = true;
        console.log(`[MISSING] ${mod.name}`);
      } else if (!mod.hash) {
        needsUpdate = true;
        console.log(`[NO_HASH] ${mod.name}`);
      } else {
        // Utilisation du smart cache : taille + hash avec cache
        const localHash = await window.api.getFileChecksumSmart(filePath, mod.size);
        
        if (localHash !== mod.hash) {
          needsUpdate = true;
          console.log(`[HASH_DIFF] ${mod.name} → hash différent`);
        } else {
          console.log(`[OK] ${mod.name} ✓`);
        }
      }
      
      if (needsUpdate) {
        missing.push({ 
          name: mod.name, 
          size: mod.size, 
          source: 'mods', 
          hash: mod.hash 
        });
        totalSize += mod.size;
      }
      
      // Progress indicator pour les gros batches
      if (i % 100 === 0 && i > 0) {
        console.log(`[PROGRESS] ${i}/${remoteMods.length} fichiers vérifiés...`);
      }
    }

    // Vérification autres fichiers (simplifié par taille uniquement)
    setCurrentVerifyingFile('Vérification des autres ressources...');
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
      }
    }

    const allMissing = [...missing, ...otherMissing];
    console.log(`[RESULT] ${allMissing.length}/${remoteMods.length + otherResources.length} fichiers à télécharger`);
    
    // Finalisation
    setVerificationProgress(100);
    setCurrentVerifyingFile('Vérification terminée');
    setModsToDownload(allMissing);
    setTotalBytes(totalSize);
    
    // Petite pause pour afficher "Vérification terminée"
    setTimeout(() => {
      setIsVerifying(false);
      setCurrentVerifyingFile(null);
      
      if (allMissing.length === 0) {
        setModsReady(true);
        onReadyToPlay();
      }
    }, 500);
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

      // Téléchargement du fichier
      await window.api.startDownload({ 
        fileName: mod.name, 
        destination
      });
      
      // Vérification post-téléchargement OBLIGATOIRE par hash
      const filePath = `${destination}/${mod.name}`;
      if (mod.hash) {
        const downloadedHash = await window.api.getFileChecksum(filePath);
        if (downloadedHash !== mod.hash) {
          console.error(`[HASH] ❌ Vérification échouée pour ${mod.name}: attendu ${mod.hash}, obtenu ${downloadedHash}`);
          // TODO: Relancer le téléchargement ou marquer comme erreur
        } else {
          console.log(`[HASH] ✅ ${mod.name} téléchargé et vérifié par hash`);
        }
      } else {
        console.warn(`[NO_HASH] ⚠️ ${mod.name} téléchargé mais pas de hash pour vérification !`);
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
        isVerifying,
        progress,
        fileProgress,
        verificationProgress,
        currentFile,
        currentVerifyingFile,
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
