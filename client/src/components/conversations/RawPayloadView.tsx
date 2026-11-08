import React from 'react';
import {
  Box,
  Typography,
  Paper,
} from '@mui/material';
import type { ConversationAnalyticsItem } from '../../types/conversation';

interface RawPayloadViewProps {
  conversation: ConversationAnalyticsItem;
}

export const RawPayloadView: React.FC<RawPayloadViewProps> = ({ conversation }) => {
  return (
    <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a', mb: 2 }}>
        Raw Session Metadata & Result Payload
      </Typography>
      <Box
        component="pre"
        sx={{
          p: 2,
          borderRadius: 2,
          bgcolor: '#0f172a',
          color: '#38bdf8',
          fontSize: '0.8rem',
          maxHeight: 550,
          overflow: 'auto',
          lineHeight: 1.5,
        }}
      >
        {JSON.stringify(conversation, null, 2)}
      </Box>
    </Paper>
  );
};

