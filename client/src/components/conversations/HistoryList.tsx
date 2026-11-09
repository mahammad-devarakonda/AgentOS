import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Stack,
  Chip,
  IconButton,
  CircularProgress,
  Button,
} from '@mui/material';
import {
  DescriptionRounded as ResumeIcon,
  TravelExploreRounded as JobIcon,
  TokenRounded as TokenIcon,
  AccessTimeRounded as TimeIcon,
  DeleteOutlineRounded as DeleteIcon,
  HistoryRounded as HistoryIcon,
  AutoAwesomeRounded as LLMIcon,
} from '@mui/icons-material';
import type { ConversationAnalyticsItem } from '../../types/conversation';

interface HistoryListProps {
  conversations: ConversationAnalyticsItem[];
  selectedId: string | null;
  loading: boolean;
  onSelect: (id: string) => void;
  onDeleteRequest: (id: string) => void;
  onNavigateResume: () => void;
  onNavigateJobSearch: () => void;
}

export const HistoryList: React.FC<HistoryListProps> = ({
  conversations,
  selectedId,
  loading,
  onSelect,
  onDeleteRequest,
  onNavigateResume,
  onNavigateJobSearch,
}) => {
  const formatTokens = (val: number | undefined) => (val ?? 0).toLocaleString();

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const getAgentBadge = (agentType: string) => {
    if (agentType === 'resume_analyzer') {
      return {
        label: 'Resume Analyzer',
        bg: 'rgba(99, 102, 241, 0.1)',
        color: '#4f46e5',
        border: 'rgba(99, 102, 241, 0.3)',
        icon: <ResumeIcon sx={{ fontSize: 14 }} />,
      };
    }
    return {
      label: 'Job Search Agent',
      bg: 'rgba(16, 185, 129, 0.1)',
      color: '#059669',
      border: 'rgba(16, 185, 129, 0.3)',
      icon: <JobIcon sx={{ fontSize: 14 }} />,
    };
  };

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 3,
        border: '1px solid #e2e8f0',
        backgroundColor: '#ffffff',
        overflow: 'hidden',
        minHeight: 560,
      }}
    >
      <Box
        sx={{
          p: 2,
          borderBottom: '1px solid #f1f5f9',
          bgcolor: '#f8fafc',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#334155' }}>
          Execution Archive ({conversations.length})
        </Typography>
        <Typography variant="caption" sx={{ color: '#94a3b8' }}>
          Click to inspect full output
        </Typography>
      </Box>

      {loading ? (
        <Box sx={{ p: 6, textAlign: 'center' }}>
          <CircularProgress size={32} />
          <Typography variant="body2" sx={{ color: '#64748b', mt: 1.5 }}>
            Loading execution history...
          </Typography>
        </Box>
      ) : conversations.length === 0 ? (
        <Box sx={{ p: 6, textAlign: 'center' }}>
          <HistoryIcon sx={{ fontSize: 44, color: '#cbd5e1', mb: 1 }} />
          <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 600 }}>
            No history records found.
          </Typography>
          <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mt: 0.5 }}>
            Analyze a resume or search for jobs to see history records populate here automatically.
          </Typography>
          <Stack direction="row" spacing={1} sx={{ justifyContent: 'center', mt: 2 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<ResumeIcon />}
              onClick={onNavigateResume}
              sx={{ textTransform: 'none', borderRadius: 2 }}
            >
              Resume Analyzer
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<JobIcon />}
              onClick={onNavigateJobSearch}
              sx={{ textTransform: 'none', borderRadius: 2 }}
            >
              Job Search
            </Button>
          </Stack>
        </Box>
      ) : (
        <Box sx={{ maxHeight: 680, overflowY: 'auto' }}>
          {conversations.map((conv) => {
            const isSelected = selectedId === conv.id;
            const badge = getAgentBadge(conv.agent_type);
            const meta = conv.metadata || {};
            const score = meta.overall_score ?? meta.analysis?.overall_score;
            const jobCount = meta.job_count ?? meta.discovered_jobs?.length;

            return (
              <Box
                key={conv.id}
                onClick={() => onSelect(conv.id)}
                sx={{
                  p: 2,
                  cursor: 'pointer',
                  borderBottom: '1px solid #f1f5f9',
                  backgroundColor: isSelected ? 'rgba(79, 70, 229, 0.05)' : '#ffffff',
                  borderLeft: isSelected ? '4px solid #4f46e5' : '4px solid transparent',
                  transition: 'all 0.15s ease',
                  '&:hover': {
                    backgroundColor: isSelected ? 'rgba(79, 70, 229, 0.08)' : '#f8fafc',
                  },
                }}
              >
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Chip
                    icon={badge.icon}
                    label={badge.label}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      bgcolor: badge.bg,
                      color: badge.color,
                      border: `1px solid ${badge.border}`,
                    }}
                  />

                  <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center' }}>
                    {score !== undefined && (
                      <Chip
                        label={`Score: ${score}`}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          bgcolor: score >= 90 ? '#ecfdf5' : '#eff6ff',
                          color: score >= 90 ? '#047857' : '#1d4ed8',
                        }}
                      />
                    )}
                    {jobCount !== undefined && (
                      <Chip
                        label={`${jobCount} Jobs`}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          bgcolor: '#ecfdf5',
                          color: '#047857',
                        }}
                      />
                    )}
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteRequest(conv.id);
                      }}
                      sx={{ color: '#94a3b8', p: 0.2, '&:hover': { color: '#ef4444' } }}
                    >
                      <DeleteIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Stack>
                </Stack>

                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 700,
                    color: '#1e293b',
                    lineHeight: 1.3,
                    mb: 0.8,
                  }}
                >
                  {conv.title}
                </Typography>

                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                  <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', color: '#94a3b8' }}>
                    <TimeIcon sx={{ fontSize: 13 }} />
                    <Typography variant="caption">{formatDate(conv.created_at)}</Typography>
                  </Stack>
                  <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center' }}>
                    <Chip
                      icon={<LLMIcon sx={{ fontSize: '10px !important', color: '#4338ca !important' }} />}
                      label={`LLM: ${meta.model}`}
                      size="small"
                      sx={{
                        height: 18,
                        fontSize: '0.64rem',
                        bgcolor: 'rgba(99, 102, 241, 0.08)',
                        color: '#4338ca',
                        fontWeight: 600,
                        border: '1px solid rgba(99, 102, 241, 0.2)',
                      }}
                    />
                    <Chip
                      icon={<TokenIcon sx={{ fontSize: '11px !important' }} />}
                      label={`${formatTokens(conv.token_usage?.total_tokens)} tokens`}
                      size="small"
                      sx={{
                        height: 18,
                        fontSize: '0.65rem',
                        bgcolor: '#fef3c7',
                        color: '#92400e',
                        fontWeight: 700,
                      }}
                    />
                  </Stack>
                </Stack>
              </Box>
            );
          })}
        </Box>
      )}
    </Paper>
  );
};

