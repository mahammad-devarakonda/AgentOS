import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Stack,
  Chip,
  Button,
} from '@mui/material';
import {
  TravelExploreRounded as JobIcon,
  CheckCircleRounded as CheckIcon,
  TrendingUpRounded as TrendingIcon,
  OpenInNewRounded as ExternalLinkIcon,
  AutoAwesomeRounded as LLMIcon,
} from '@mui/icons-material';
import type { ConversationAnalyticsItem } from '../../types/conversation';

interface JobSearchExecutionDetailProps {
  conversation: ConversationAnalyticsItem;
}

export const JobSearchExecutionDetail: React.FC<JobSearchExecutionDetailProps> = ({ conversation }) => {
  const meta = conversation.metadata || {};
  const cand = meta.candidate_profile || {};
  const market = meta.market_parameters || {};
  const jobs = meta.discovered_jobs || [];
  const ranking = meta.ranking_summary || {};
  const targetRole = meta.target_role || cand.current_title || 'Target Role';
  const location = meta.preferred_location || 'Remote / Global';

  return (
    <Stack spacing={3}>
      {/* Search Parameters & Candidate Match Criteria */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: 3,
          border: '1px solid #e2e8f0',
          background: '#ffffff',
        }}
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 0.5 }}>
              <JobIcon sx={{ color: '#059669' }} />
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>
                {targetRole}
              </Typography>
            </Stack>
            <Typography variant="body2" sx={{ color: '#64748b' }}>
              Location Preference: <strong>{location}</strong> • Discovered <strong>{jobs.length} Matching Jobs</strong>
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <Chip
              icon={<LLMIcon sx={{ fontSize: '11px !important', color: '#059669 !important' }} />}
              label={`Generated via: ${meta.model || 'llama-3.3-70b-versatile'}`}
              size="small"
              sx={{
                bgcolor: 'rgba(16, 185, 129, 0.08)',
                color: '#059669',
                fontWeight: 700,
                border: '1px solid rgba(16, 185, 129, 0.25)',
              }}
            />
            <Chip
              label={`${jobs.length} Vacancies Discovered`}
              sx={{ bgcolor: 'rgba(16, 185, 129, 0.1)', color: '#059669', fontWeight: 700, border: '1px solid rgba(16, 185, 129, 0.3)' }}
            />
          </Stack>
        </Stack>

        {market.boolean_query && (
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: '#f8fafc',
              border: '1px solid #e2e8f0',
              mb: 2,
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569', display: 'block', mb: 0.5 }}>
              Synthesized Boolean Query:
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: 'monospace', color: '#0f172a', bgcolor: '#ffffff', p: 1, borderRadius: 1 }}>
              {market.boolean_query}
            </Typography>
          </Box>
        )}

        {cand.skills && cand.skills.length > 0 && (
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b', display: 'block', mb: 0.8 }}>
              Candidate Core Competencies Evaluated:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
              {cand.skills.map((s: string, idx: number) => (
                <Chip key={idx} label={s} size="small" sx={{ bgcolor: '#ecfdf5', color: '#047857', height: 22, fontSize: '0.72rem' }} />
              ))}
            </Box>
          </Box>
        )}
      </Paper>

      {/* Strategic Pitch & Application Insights */}
      {ranking.top_recommendation && (
        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: 3,
            border: '1px solid rgba(16, 185, 129, 0.25)',
            background: 'linear-gradient(180deg, #ffffff 0%, #f0fdf4 100%)',
          }}
        >
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
            <TrendingIcon sx={{ color: '#059669' }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#064e3b' }}>
              Strategic Opportunity Recommendation
            </Typography>
          </Stack>
          <Typography variant="body2" sx={{ color: '#065f46', lineHeight: 1.6, mb: 1.5 }}>
            {ranking.top_recommendation}
          </Typography>

          {ranking.strategic_pitch && (
            <Box sx={{ p: 2, bgcolor: '#ffffff', borderRadius: 2, border: '1px solid #d1fae5' }}>
              <Typography variant="caption" sx={{ fontWeight: 800, color: '#047857', display: 'block', mb: 0.5 }}>
                RECOMMENDED APPLICATION PITCH:
              </Typography>
              <Typography variant="body2" sx={{ color: '#1e293b', fontStyle: 'italic' }}>
                "{ranking.strategic_pitch}"
              </Typography>
            </Box>
          )}
        </Paper>
      )}

      {/* Discovered Matching Jobs Cards */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: 3,
          border: '1px solid #e2e8f0',
          background: '#ffffff',
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a', mb: 2 }}>
          Discovered Vacancies ({jobs.length})
        </Typography>

        <Stack spacing={2}>
          {jobs.map((job: any, idx: number) => {
            const matchScore = job.match_score || job.compatibility_score || 0;
            return (
              <Paper
                key={idx}
                elevation={0}
                sx={{
                  p: 2.5,
                  borderRadius: 2.5,
                  border: '1px solid #e2e8f0',
                  transition: 'all 0.15s ease',
                  '&:hover': {
                    borderColor: '#10b981',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.08)',
                  },
                }}
              >
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, mb: 1 }}>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a' }}>
                      {job.title || job.job_title}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#64748b' }}>
                      <strong>{job.company}</strong> • {job.location || 'Remote'}
                    </Typography>
                  </Box>

                  <Chip
                    icon={<CheckIcon sx={{ fontSize: '13px !important' }} />}
                    label={`${matchScore}% ATS Fit`}
                    sx={{
                      fontWeight: 800,
                      bgcolor: matchScore >= 85 ? '#ecfdf5' : '#eff6ff',
                      color: matchScore >= 85 ? '#047857' : '#1d4ed8',
                      border: `1px solid ${matchScore >= 85 ? '#a7f3d0' : '#bfdbfe'}`,
                    }}
                  />
                </Stack>

                {job.match_reasons && (
                  <Typography variant="body2" sx={{ color: '#334155', mb: 1.5, fontSize: '0.88rem' }}>
                    {job.match_reasons}
                  </Typography>
                )}

                {job.skills && job.skills.length > 0 && (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.6, mb: 1.5 }}>
                    {job.skills.map((sk: string, sIdx: number) => (
                      <Chip key={sIdx} label={sk} size="small" sx={{ fontSize: '0.7rem', height: 20, bgcolor: '#f1f5f9' }} />
                    ))}
                  </Box>
                )}

                {job.url && (
                  <Button
                    variant="text"
                    size="small"
                    endIcon={<ExternalLinkIcon fontSize="small" />}
                    href={job.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ textTransform: 'none', fontWeight: 600, color: '#059669', p: 0 }}
                  >
                    View Posting
                  </Button>
                )}
              </Paper>
            );
          })}
        </Stack>
      </Paper>
    </Stack>
  );
};

