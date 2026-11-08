import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Stack,
  Avatar,
  Chip,
} from '@mui/material';
import type { ConversationAnalyticsItem, MessageItem } from '../../types/conversation';

interface AuditTraceViewProps {
  conversation: ConversationAnalyticsItem;
}

export const AuditTraceView: React.FC<AuditTraceViewProps> = ({ conversation }) => {
  const messages = conversation.messages || [];
  const agentTrace = conversation.metadata?.agent_trace || [];

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <Stack spacing={3}>
      {agentTrace.length > 0 && (
        <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a', mb: 2 }}>
            Multi-Agent Graph Node Trace ({agentTrace.length} Nodes)
          </Typography>
          <Stack spacing={1.5}>
            {agentTrace.map((step: any, i: number) => (
              <Box
                key={i}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  border: '1px solid #f1f5f9',
                  bgcolor: '#f8fafc',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 1.5,
                }}
              >
                <Avatar sx={{ width: 28, height: 28, bgcolor: '#4f46e5', fontSize: '0.8rem', fontWeight: 700 }}>
                  {i + 1}
                </Avatar>
                <Box sx={{ flexGrow: 1 }}>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e293b' }}>
                      {step.agent_name || step.node_id}
                    </Typography>
                    {step.execution_time_ms && (
                      <Chip
                        label={`${step.execution_time_ms} ms`}
                        size="small"
                        sx={{ height: 20, fontSize: '0.68rem', bgcolor: '#f1f5f9' }}
                      />
                    )}
                  </Stack>
                  <Typography variant="body2" sx={{ color: '#475569', fontSize: '0.85rem' }}>
                    {step.summary || step.detail}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Stack>
        </Paper>
      )}

      <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a', mb: 2 }}>
          Execution Step Logs ({messages.length})
        </Typography>
        <Stack spacing={1.5}>
          {messages.map((msg: MessageItem, idx: number) => (
            <Box
              key={msg.id || idx}
              sx={{
                p: 2,
                borderRadius: 2,
                border: '1px solid #e2e8f0',
                bgcolor: msg.role === 'user' ? '#f0fdf4' : '#ffffff',
              }}
            >
              <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: msg.role === 'user' ? '#047857' : '#4f46e5' }}>
                  {msg.sender_name || (msg.role === 'user' ? 'Input Trigger' : 'Agent OS Node')}
                </Typography>
                <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                  {formatDate(msg.created_at)}
                </Typography>
              </Stack>
              <Typography variant="body2" sx={{ color: '#1e293b', whiteSpace: 'pre-wrap' }}>
                {msg.content}
              </Typography>
            </Box>
          ))}
        </Stack>
      </Paper>
    </Stack>
  );
};

