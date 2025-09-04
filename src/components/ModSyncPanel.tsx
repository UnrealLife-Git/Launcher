import { useEffect, useState } from 'react';
import { Box, Button, LinearProgress, Typography } from '@mui/material';
import { useModSync } from './ModSyncManager';

interface Props {
  basePath: string;
  onReadyToPlay: () => void;
}

export default function ModSyncPanel({ basePath, onReadyToPlay }: Props) {
  const {
    modsToDownload,
    checkMods,
    downloadMods,
    isDownloading,
    isVerifying,
    currentFile,
    currentVerifyingFile,
    fileProgress,
    progress,
    verificationProgress,
    formatRemainingTime,
    modsReady
  } = useModSync();

  const [isPlayDisabled, setIsPlayDisabled] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [checkingAfterLaunch, setCheckingAfterLaunch] = useState(false);

  useEffect(() => {
    if (basePath) {
      checkMods(basePath, onReadyToPlay);
    }
  }, [basePath]);

  const launchGame = async () => {
    setIsPlayDisabled(true);
    setLaunching(true);

    await checkMods(basePath, async () => {
      await window.api.launchGame(basePath);
      setTimeout(() => {
        setIsPlayDisabled(false);
        setLaunching(false);
        setCheckingAfterLaunch(true);
      }, 2 * 60 * 1000); // désactive pendant 2 minutes
    });
  };

  useEffect(() => {
    if (checkingAfterLaunch) {
      checkMods(basePath, () => setCheckingAfterLaunch(false));
    }
  }, [checkingAfterLaunch]);

  const shouldShowPlayButton = !isDownloading && modsReady && modsToDownload.length === 0;
  const shouldShowUpdateButton = !isDownloading && modsToDownload.length > 0;

  return (
    <Box sx={{ mt: 3 }}>
      {isVerifying && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2">
              Vérification de : <strong>{currentVerifyingFile}</strong>
            </Typography>
            <Typography variant="body2">
              Progression globale : {verificationProgress}% - Vérification des mods
            </Typography>
            <LinearProgress
              variant="determinate"
              value={verificationProgress}
              sx={{ my: 1, height: 8, borderRadius: 4 }}
              color="info"
            />
          </Box>
        </Box>
      )}

      {isDownloading && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2">
              Téléchargement de : <strong>{currentFile}</strong> ({fileProgress}%)
            </Typography>
            <Typography variant="body2">
              Progression globale : {progress}% - Temps restant: {formatRemainingTime()}
            </Typography>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{ my: 1, height: 8, borderRadius: 4 }}
            />
          </Box>
          <ModSyncPanel.DownloadButton
            onAfterDownload={() => {
              setIsPlayDisabled(false);
              setLaunching(false);
            }}
          />
        </Box>
      )}

      {!isVerifying && shouldShowUpdateButton && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2">
            {modsToDownload.length} fichier(s) à mettre à jour
          </Typography>
          <ModSyncPanel.DownloadButton
            onAfterDownload={() => {
              setIsPlayDisabled(false);
              setLaunching(false);
            }}
          />
        </Box>
      )}

      {!isVerifying && shouldShowPlayButton && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="body2">Tous les fichiers sont à jour.</Typography>
          </Box>
          <Button
            variant="contained"
            color="primary"
            onClick={launchGame}
            disabled={isPlayDisabled}
            sx={{ minWidth: 180, p: '18px' }}
          >
            {launching ? 'Lancement en cours...' : 'JOUER'}
          </Button>
        </Box>
      )}
    </Box>
  );
}

// Composant bouton réutilisable avec callback
ModSyncPanel.DownloadButton = function DownloadButton({
  onAfterDownload,
}: {
  onAfterDownload: () => void;
}) {
  const { modsToDownload, downloadMods, isDownloading } = useModSync();

  const handleClick = async () => {
    await downloadMods();
    onAfterDownload(); // Réinitialise les états après le download
  };

  return (
    <Button
      variant="contained"
      onClick={handleClick}
      disabled={isDownloading || modsToDownload.length === 0}
      sx={{ minWidth: 180, p: '18px' }}
    >
      {isDownloading ? 'Téléchargement...' : `Mettre à jour (${modsToDownload.length})`}
    </Button>
  );
};
