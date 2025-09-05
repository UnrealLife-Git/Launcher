import { Box, Button, Stack, TextField, Typography } from '@mui/material';
import { useEffect, useState } from 'react';

export default function SettingsContent({ onGamePathChange }: { onGamePathChange?: (path: string) => void }) {
  const [gamePath, setGamePath] = useState('');
  const [error, setError] = useState('');
  const [launcherVersion, setLauncherVersion] = useState<string>('dev');
  const [cacheClearing, setCacheClearing] = useState(false);
  const [cacheMessage, setCacheMessage] = useState('');

  // Valeur par défaut
  const defaultPath = 'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Arma 3';

  // Au chargement, récupérer depuis localStorage ou mettre la valeur par défaut
  useEffect(() => {
    const saved = localStorage.getItem('arma3Path');
    setGamePath(saved || defaultPath);
    // Récupère la version du launcher via l'API preload
    window.api.getAppVersion?.().then(setLauncherVersion);
  }, []);

  const handleBrowse = async () => {
    try {
      const selected = await window.api.openDialog?.(gamePath || defaultPath);
      if (selected) setGamePath(selected);
    } catch (e) {
      console.error('Erreur ouverture dossier :', e);
    }
  };

  const handleSave = async () => {
    setError('');
    try {
      const hasExecutable = await window.api.checkExecutable?.(gamePath);
      if (!hasExecutable) {
        setError("Fichier arma3.exe introuvable dans ce dossier.");
        return;
      }

      localStorage.setItem('arma3Path', gamePath);
      if (onGamePathChange) onGamePathChange(gamePath); // ← Ajouté
    } catch (e) {
      console.error(e);
      setError("Erreur lors de la vérification du fichier.");
    }
  };

  const handleClearCache = async () => {
    setCacheClearing(true);
    setCacheMessage('');
    
    try {
      const success = await window.api.clearCache?.();
      if (success) {
        setCacheMessage('Cache vidé avec succès !');
      } else {
        setCacheMessage('Erreur lors du vidage du cache.');
      }
    } catch (e) {
      console.error('Erreur lors du vidage du cache:', e);
      setCacheMessage('Erreur lors du vidage du cache.');
    } finally {
      setCacheClearing(false);
      // Effacer le message après 3 secondes
      setTimeout(() => setCacheMessage(''), 3000);
    }
  };

  return (
    <Box sx={{ px: 4, py: 2 }}>
      <Typography variant="h5" gutterBottom>
        Paramètres
      </Typography>

      <Stack spacing={2} sx={{ mt: 3, maxWidth: 600 }}>
        <TextField
          fullWidth
          label="Chemin du dossier du jeu"
          value={gamePath}
          onChange={(e) => setGamePath(e.target.value)}
          variant="outlined"
          sx={{
            input: { color: 'white' },
            label: { color: 'white' },
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderColor: '#2196f3',
              },
              '&:hover fieldset': {
                borderColor: '#42a5f5',
              },
            },
          }}
        />

        {error && <Typography color="error">{error}</Typography>}

        <Stack direction="row" spacing={2}>
          <Button variant="outlined" onClick={handleBrowse}>PARCOURIR</Button>
          <Button variant="contained" onClick={handleSave}>SAUVEGARDER</Button>
        </Stack>
        
        {/* Section pour vider le cache */}
        <Box sx={{ mt: 4, pt: 2, borderTop: '1px solid #333' }}>
          <Typography variant="h6" gutterBottom sx={{ color: 'white' }}>
            Cache du launcher
          </Typography>
          <Typography variant="body2" sx={{ color: 'gray', mb: 2 }}>
            Le cache permet d'accélérer la vérification de vos addons. 
            Vider le cache forcera une nouvelle vérification complète des mods.
          </Typography>
          
          <Button 
            variant="outlined" 
            onClick={handleClearCache}
            disabled={cacheClearing}
            sx={{ color: 'orange', borderColor: 'orange' }}
          >
            {cacheClearing ? 'VIDAGE EN COURS...' : 'VIDER LE CACHE'}
          </Button>
          
          {cacheMessage && (
            <Typography 
              variant="body2" 
              sx={{ 
                mt: 1, 
                color: cacheMessage.includes('succès') ? 'green' : 'red' 
              }}
            >
              {cacheMessage}
            </Typography>
          )}
        </Box>
      </Stack>
      {/* Numéro de version en bas de page */}
      <Box sx={{ position: 'absolute', bottom: 8, left: 0, width: '100%', textAlign: 'center', color: 'gray' }}>
        <Typography variant="body2">
          Version du launcher : {launcherVersion}
        </Typography>
      </Box>
    </Box>
  );
}
