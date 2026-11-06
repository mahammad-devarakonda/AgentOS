import React from 'react';
import { Box, Typography } from '@mui/material';

interface AgentLogoProps {
  size?: number;
  showText?: boolean;
}

export const AgentLogo: React.FC<AgentLogoProps> = ({ size = 36, showText = true }) => {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <Box
        component="svg"
        viewBox="0 0 48 48"
        sx={{
          width: size,
          height: size,
          filter: 'drop-shadow(0px 0px 8px rgba(0, 229, 255, 0.5))',
        }}
      >
        <polygon
          points="24,4 42,14 42,34 24,44 6,34 6,14"
          fill="none"
          stroke="#00E5FF"
          strokeWidth="3"
        />
        <circle cx="24" cy="24" r="7" fill="#7C4DFF" />
        <circle cx="24" cy="24" r="3" fill="#00E5FF" />
        <line x1="24" y1="4" x2="24" y2="17" stroke="#00E5FF" strokeWidth="2" strokeDasharray="2,2" />
        <line x1="24" y1="31" x2="24" y2="44" stroke="#00E5FF" strokeWidth="2" strokeDasharray="2,2" />
        <line x1="6" y1="24" x2="17" y2="24" stroke="#00E5FF" strokeWidth="2" strokeDasharray="2,2" />
        <line x1="31" y1="24" x2="42" y2="24" stroke="#00E5FF" strokeWidth="2" strokeDasharray="2,2" />
      </Box>
      {showText && (
        <Typography
          variant="h5"
          component="span"
          sx={{
            fontWeight: 800,
            letterSpacing: '0.05em',
            background: 'linear-gradient(90deg, #FFFFFF 0%, #00E5FF 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Agent<Box component="span" sx={{ color: '#00E5FF', WebkitTextFillColor: '#00E5FF' }}>OS</Box>
        </Typography>
      )}
    </Box>
  );
};
