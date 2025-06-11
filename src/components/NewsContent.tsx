// src/components/NewsContent.tsx
import { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import yaml from 'js-yaml';

interface NewsEntry {
  date: string;
  title: string;
  content: string;
}

export default function NewsContent() {
  const [newsList, setNewsList] = useState<NewsEntry[]>([]);

  useEffect(() => {
    window.api.getNewsMarkdown()
      .then(text => {
        const parsed = yaml.load(text) as NewsEntry[];
        setNewsList(parsed);
      })
      .catch((err) => {
        console.error('Erreur de chargement via IPC', err);
        setNewsList([]);
      });
  }, []);

  return (
    <Box
      sx={{
        overflowY: 'auto',
        pr: 2,
        bgcolor: '#161b22',
        p: 3,
        borderRadius: 2,
        color: 'white',
        lineHeight: 1.7,
        '& h1, h2, h3': {
          color: '#58a6ff',
        },
        '& a': {
          color: '#8b949e',
        },
        '& li': {
          mb: 1,
        },
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
      {newsList.length === 0 && (
        <Typography>Chargement des actualités...</Typography>
      )}

      {newsList.map((news, index) => (
        <Box key={index} sx={{ mb: 4 }}>
          <Typography variant="h5" sx={{ mb: 1 }}>{news.title}</Typography>
          <Typography variant="body2" sx={{ mb: 1, color: 'gray' }}>{news.date}</Typography>
          <ReactMarkdown>{news.content}</ReactMarkdown>
        </Box>
      ))}
    </Box>
  );
}