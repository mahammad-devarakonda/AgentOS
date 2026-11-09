import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Stack,
  Avatar,
  Chip,
} from '@mui/material';
import { AutoAwesomeRounded as LLMIcon } from '@mui/icons-material';
import type { ConversationAnalyticsItem, MessageItem } from '../../types/conversation';

interface AuditTraceViewProps {
  conversation: ConversationAnalyticsItem;
}

export const AuditTraceView: React.FC<AuditTraceViewProps> = ({ conversation }) => {
  const messages = conversation.messages || [];
  const agentTrace = conversation.metadata?.agent_trace || [];
  const conversationModel = conversation.metadata?.model;

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
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a' }}>
              Multi-Agent Graph Node Trace ({agentTrace.length} Nodes)
            </Typography>
            <Chip
              icon={<LLMIcon sx={{ fontSize: '11px !important', color: '#4338ca !important' }} />}
              label={`LLM: ${conversationModel}`}
              size="small"
              sx={{
                bgcolor: 'rgba(99, 102, 241, 0.08)',
                color: '#4338ca',
                fontWeight: 700,
                fontSize: '0.68rem',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                height: 22,
              }}
            />
          </Stack>
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
                    <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center' }}>
                      <Chip
                        icon={<LLMIcon sx={{ fontSize: '10px !important', color: '#4338ca !important' }} />}
                        label={step.model || conversationModel}
                        size="small"
                        sx={{ height: 19, fontSize: '0.64rem', bgcolor: '#eef2ff', color: '#4338ca', fontWeight: 600 }}
                      />
                      {step.execution_time_ms && (
                        <Chip
                          label={`${step.execution_time_ms} ms`}
                          size="small"
                          sx={{ height: 19, fontSize: '0.64rem', bgcolor: '#f1f5f9' }}
                        />
                      )}
                    </Stack>
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
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a' }}>
            Execution Step Logs ({messages.length})
          </Typography>
          <Chip
            icon={<LLMIcon sx={{ fontSize: '11px !important', color: '#059669 !important' }} />}
            label={`Generated via: ${conversationModel}`}
            size="small"
            sx={{
              bgcolor: 'rgba(16, 185, 129, 0.08)',
              color: '#059669',
              fontWeight: 700,
              fontSize: '0.68rem',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              height: 22,
            }}
          />
        </Stack>
        <Stack spacing={1.5}>
          {messages.map((msg: MessageItem, idx: number) => {
            const msgModel = msg.metadata?.model || conversationModel;
            return (
              <Box
                key={msg.id || idx}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  border: '1px solid #e2e8f0',
                  bgcolor: msg.role === 'user' ? '#f0fdf4' : '#ffffff',
                }}
              >
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 0.8 }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: msg.role === 'user' ? '#047857' : '#4f46e5' }}>
                      {msg.sender_name || (msg.role === 'user' ? 'Input Trigger' : 'Agent OS Node')}
                    </Typography>
                    {msg.role !== 'user' && (
                      <Chip
                        icon={<LLMIcon sx={{ fontSize: '10px !important', color: '#4338ca !important' }} />}
                        label={`LLM: ${msgModel}`}
                        size="small"
                        sx={{
                          height: 18,
                          fontSize: '0.62rem',
                          bgcolor: 'rgba(99, 102, 241, 0.08)',
                          color: '#4338ca',
                          fontWeight: 600,
                          border: '1px solid rgba(99, 102, 241, 0.2)',
                        }}
                      />
                    )}
                  </Stack>
                  <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                    {formatDate(msg.created_at)}
                  </Typography>
                </Stack>
                <Typography variant="body2" sx={{ color: '#1e293b', whiteSpace: 'pre-wrap' }}>
                  {msg.content}
                </Typography>
              </Box>
            );
          })}
        </Stack>
      </Paper>
    </Stack>
  );
};

