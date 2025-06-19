import { Box, Button, Stack, TextField, Typography } from '@mui/material';
import { useEffect, useState } from 'react';

export default function SettingsContent({ onGamePathChange }: { onGamePathChange?: (path: string) => void }) {
  const [gamePath, setGamePath] = useState('');
  const [error, setError] = useState('');

  // Valeur par défaut
  const defaultPath = 'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Arma 3';

  // Au chargement, récupérer depuis localStorage ou mettre la valeur par défaut
  useEffect(() => {
    const saved = localStorage.getItem('arma3Path');
    setGamePath(saved || defaultPath);
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
      </Stack>
    </Box>
  );
}
