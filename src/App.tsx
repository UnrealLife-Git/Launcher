import { useEffect, useState } from 'react';
import {
  AppBar,
  Box,
  Button,
  IconButton,
  Stack,
  Toolbar,
} from '@mui/material';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import { Carousel } from './components/Carousel';
import NewsContent from './components/NewsContent';
import SettingsContent from './components/SettingsContent';
import ModSyncPanel from './components/ModSyncPanel';
import ModSyncManager from './components/ModSyncManager';
import Logo from '/assets/logo.png';
import discordIcon from '/assets/icons/discord.png';
import intranetIcon from '/assets/icons/intranet.png';
import teamspeakIcon from '/assets/icons/teamspeak.png';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import Tooltip from '@mui/material/Tooltip';

const ICONS: Record<string, string> = {
  discord: discordIcon,
  intranet: intranetIcon,
  teamspeak: teamspeakIcon,
};

export function App() {
  const [gamePath, setGamePath] = useState('');
  const [showSnackbar, setShowSnackbar] = useState(false);
  window.electronAPI.onUpdateAvailable(() => {});
  window.electronAPI.onUpdateDownloaded(() => {});

  useEffect(() => {
    const saved = localStorage.getItem('arma3Path');
    if (!saved) setShowSnackbar(true) // Si pas de chemin enregistré, on affiche le snackbar
    setGamePath(saved || '');
    window.electronAPI.onUpdateAvailable(() => {});
    window.electronAPI.onUpdateDownloaded(() => {});
  }, []);

  return (
    <ModSyncManager basePath={gamePath}>
      <MainApp gamePath={gamePath} setGamePath={setGamePath} />
      <Snackbar
        open={showSnackbar}
        autoHideDuration={6000}
        onClose={() => setShowSnackbar(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="warning" variant="filled" onClose={() => setShowSnackbar(false)}>
          Merci de configurer le chemin d’accès à Arma 3 dans les paramètres ⚙️
        </Alert>
      </Snackbar>
    </ModSyncManager>
  );
}

function MainApp({ gamePath, setGamePath }: { gamePath: string; setGamePath: (path: string) => void }) {
  const [activeTab, setActiveTab] = useState<'home' | 'news' | 'settings'>('home');
  //const { progress, isDownloading, currentFile, fileProgress } = useModSync();

  const handleLinkClick = async (type: string) => {
    try {
      if (type === 'discord') {
        await window.api?.openExternal('https://discord.gg/CSQJum2EJC');
      } else if (type === 'intranet') {
        await window.api?.openExternal('https://intranet.unreallife.fr/');
      } else if (type === 'teamspeak') {
        await window.api?.openExternal('https://fr.vessoft.com/software/windows/download/teamspeak');
      }
      
    } catch (error) {
      console.error('[Erreur] lors de l\'ouverture du lien:', error);
    }
  };

  return (
    <Box
      sx={{
        bgcolor: '#0d1117',
        color: 'white',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <AppBar
        position="static"
        elevation={0}
        
        sx={{
          bgcolor: 'transparent',
          px: 2,
          pt: 1,
          '-webkit-app-region': 'drag',
          userSelect: 'none',
        }}
      >
        <Toolbar sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <img src={Logo} alt="UnrealLife" height={90} />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, '-webkit-app-region': 'no-drag' }}>
            <Button color="inherit" onClick={() => setActiveTab('home')}>ACCUEIL</Button>
            <Button color="inherit" onClick={() => setActiveTab('news')}>NEWS</Button>
            <Button color="inherit" onClick={() => setActiveTab('settings')}>PARAMÈTRES</Button>

            <IconButton
              onClick={() => window.ipcRenderer.send('close-app')}
              sx={{
                width: 14,
                height: 14,
                bgcolor: '#ff4d4d',
                borderRadius: '50%',
                p: 0,
                '&:hover': { bgcolor: '#e03e3e' },
              }}
            />
          </Box>
        </Toolbar>
      </AppBar>

      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {activeTab === 'home' && (
          <Box sx={{ flex: 1, px: 6, py: 3 }}>
            <Carousel />

            {gamePath && (
              <ModSyncPanel basePath={gamePath} onReadyToPlay={() => { }} />
            )}

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Stack>

                <Stack direction="row" spacing={3} sx={{ mt: 2 }}>
                {['discord', 'intranet', 'teamspeak'].map((icon) => {
                  const tooltips: Record<string, string> = {
                    discord: 'Rejoindre notre Discord',
                    intranet: 'Accéder à l’Intranet',
                    teamspeak: 'Télécharger Teamspeak',
                  };
                  return (
                    <Box key={icon} textAlign="center">
                      <Tooltip title={tooltips[icon]} arrow>
                        <IconButton
                          onClick={() => handleLinkClick(icon)}
                          sx={{
                            bgcolor: '#1c1c1c',
                            borderRadius: '50%',
                            width: 60,
                            height: 60,
                            boxShadow: '0 0 10px rgba(0,0,0,0.4)',
                            transition: 'transform 0.2s ease',
                            '&:hover': {
                              transform: 'scale(1.05)',
                              bgcolor: '#2a2a2a',
                            },
                          }}
                        >
                          <img src={ICONS[icon]} alt={icon} style={{ width: 42, height: 42 }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  );
                })}
              </Stack>
              </Stack>
            </Box>
          </Box>
        )}

        {activeTab === 'news' && (
          <Box
            sx={{
              flex: 1,
              overflowY: 'auto',
              px: 6,
              py: 3,
              '&::-webkit-scrollbar': {
                width: '8px',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: '#30363d',
                borderRadius: '8px',
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: '#161b22',
              },
            }}
          >
            <NewsContent />
          </Box>
        )}

        {activeTab === 'settings' && (
          <Box sx={{ flex: 1, overflowY: 'auto', px: 6, py: 3 }}>
            <SettingsContent onGamePathChange={setGamePath} />
          </Box>
        )}
      </Box>
    </Box>
  );
}
