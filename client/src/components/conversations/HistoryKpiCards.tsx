import React from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Stack,
  Avatar,
  Chip,
} from '@mui/material';
import {
  HistoryRounded as HistoryIcon,
  TokenRounded as TokenIcon,
  DescriptionRounded as ResumeIcon,
  TravelExploreRounded as JobIcon,
  ArrowUpwardRounded as PromptIcon,
  ArrowDownwardRounded as CompletionIcon,
} from '@mui/icons-material';
import type { ConversationAnalyticsResponse } from '../../types/conversation';

interface HistoryKpiCardsProps {
  data: ConversationAnalyticsResponse | null;
}

export const HistoryKpiCards: React.FC<HistoryKpiCardsProps> = ({ data }) => {
  const formatTokens = (val: number | undefined) => (val ?? 0).toLocaleString();

  return (
    <Grid container spacing={2.5} sx={{ mb: 4 }}>
      {/* Card 1: Total Executions */}
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Card
          elevation={0}
          sx={{
            borderRadius: 3,
            border: '1px solid #e2e8f0',
            background: '#ffffff',
            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.03)',
          }}
        >
          <CardContent sx={{ p: 2.5 }}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#64748b' }}>
                Total Executions
              </Typography>
              <Avatar sx={{ bgcolor: 'rgba(99, 102, 241, 0.1)', color: '#4f46e5', width: 34, height: 34 }}>
                <HistoryIcon fontSize="small" />
              </Avatar>
            </Stack>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#0f172a', mb: 1 }}>
              {data?.total_conversations ?? 0}
            </Typography>
            <Stack direction="row" spacing={1}>
              <Chip
                icon={<ResumeIcon sx={{ fontSize: '13px !important' }} />}
                label={`${data?.breakdown_by_agent?.resume_analyzer?.conversation_count ?? 0} Resume`}
                size="small"
                sx={{ fontSize: '0.72rem', height: 22, bgcolor: '#f1f5f9' }}
              />
              <Chip
                icon={<JobIcon sx={{ fontSize: '13px !important' }} />}
                label={`${data?.breakdown_by_agent?.job_search?.conversation_count ?? 0} Job Search`}
                size="small"
                sx={{ fontSize: '0.72rem', height: 22, bgcolor: '#f1f5f9' }}
              />
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      {/* Card 2: Total Tokens */}
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Card
          elevation={0}
          sx={{
            borderRadius: 3,
            border: '1px solid #e2e8f0',
            background: '#ffffff',
            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.03)',
          }}
        >
          <CardContent sx={{ p: 2.5 }}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#64748b' }}>
                Total Tokens Used
              </Typography>
              <Avatar sx={{ bgcolor: 'rgba(245, 158, 11, 0.1)', color: '#d97706', width: 34, height: 34 }}>
                <TokenIcon fontSize="small" />
              </Avatar>
            </Stack>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#d97706', mb: 1 }}>
              {formatTokens(data?.total_tokens?.total_tokens)}
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748b' }}>
              Aggregated across all multi-agent prompts & evaluations
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* Card 3: Prompt (Input) Tokens */}
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Card
          elevation={0}
          sx={{
            borderRadius: 3,
            border: '1px solid #e2e8f0',
            background: '#ffffff',
            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.03)',
          }}
        >
          <CardContent sx={{ p: 2.5 }}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#64748b' }}>
                Prompt (Input) Tokens
              </Typography>
              <Avatar sx={{ bgcolor: 'rgba(59, 130, 246, 0.1)', color: '#2563eb', width: 34, height: 34 }}>
                <PromptIcon fontSize="small" />
              </Avatar>
            </Stack>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#2563eb', mb: 1 }}>
              {formatTokens(data?.total_tokens?.prompt_tokens)}
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748b' }}>
              Candidate resumes, target job descriptions & prompts
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* Card 4: Completion (Output) Tokens */}
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Card
          elevation={0}
          sx={{
            borderRadius: 3,
            border: '1px solid #e2e8f0',
            background: '#ffffff',
            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.03)',
          }}
        >
          <CardContent sx={{ p: 2.5 }}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#64748b' }}>
                Completion Tokens
              </Typography>
              <Avatar sx={{ bgcolor: 'rgba(16, 185, 129, 0.1)', color: '#059669', width: 34, height: 34 }}>
                <CompletionIcon fontSize="small" />
              </Avatar>
            </Stack>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#059669', mb: 1 }}>
              {formatTokens(data?.total_tokens?.completion_tokens)}
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748b' }}>
              ATS scores, enhancements, ranked jobs & pitches
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

