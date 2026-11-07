import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import {
  CheckCircleOutlined as CheckCircleOutlineIcon,
  WarningAmber as WarningAmberIcon,
  ErrorOutlined as ErrorOutlineIcon,
} from '@mui/icons-material';
import type { ResumeAnalysisEvaluation } from '../../types/resume';

interface AnalysisScoreCardProps {
  analysis: ResumeAnalysisEvaluation;
}

const ScoreBar: React.FC<{ label: string; score: number }> = ({ label, score }) => (
  <Box sx={{ mb: 1.5 }}>
    <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.5 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {score}/100
      </Typography>
    </Stack>
    <LinearProgress
      variant="determinate"
      value={Math.min(100, Math.max(0, score))}
      color={score >= 75 ? 'success' : score >= 50 ? 'primary' : 'warning'}
      sx={{ height: 7, borderRadius: 4, bgcolor: '#e2e8f0' }}
    />
  </Box>
);

export const AnalysisScoreCard: React.FC<AnalysisScoreCardProps> = ({ analysis }) => {
  return (
    <Card elevation={0}>
      <CardContent sx={{ p: 3 }}>
        <Stack
          direction="row"
          sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
        >
          <Box>
            <Typography variant="h6">ATS & Quality Evaluation</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3 }}>
              {analysis.role_fit_assessment}
            </Typography>
          </Box>
          <Box
            sx={{
              minWidth: 68,
              height: 68,
              borderRadius: 2,
              border: '1px solid #cbd5e1',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: '#f8fafc',
              px: 1.5,
            }}
          >
            <Typography variant="h5" color="primary.main" sx={{ fontWeight: 700 }}>
              {analysis.overall_score}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Score / 100
            </Typography>
          </Box>
        </Stack>

        <Divider sx={{ my: 2 }} />

        <ScoreBar
          label="Impact & Quantified Metrics"
          score={analysis.section_scores.impact_and_metrics}
        />
        <ScoreBar
          label="ATS Compatibility & Formatting"
          score={analysis.section_scores.ats_compatibility}
        />
        <ScoreBar label="Skills Relevance" score={analysis.section_scores.skills_relevance} />
        <ScoreBar
          label="Experience Clarity & Progression"
          score={analysis.section_scores.experience_clarity}
        />

        <Divider sx={{ my: 2 }} />

        <Typography
          variant="subtitle2"
          sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.8 }}
        >
          <CheckCircleOutlineIcon color="success" fontSize="small" /> Key Strengths
        </Typography>
        <Stack spacing={0.6} sx={{ mb: 2 }}>
          {analysis.key_strengths.map((item, idx) => (
            <Typography key={idx} variant="body2" color="text.secondary">
              • {item}
            </Typography>
          ))}
        </Stack>

        {analysis.skill_gaps_or_missing_keywords.length > 0 && (
          <>
            <Typography
              variant="subtitle2"
              sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.8 }}
            >
              <WarningAmberIcon color="warning" fontSize="small" /> Missing Keywords / Skill Gaps
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8, mb: 2 }}>
              {analysis.skill_gaps_or_missing_keywords.map((gap, idx) => (
                <Chip key={idx} label={gap} size="small" variant="outlined" />
              ))}
            </Box>
          </>
        )}

        {analysis.red_flags.length > 0 && (
          <>
            <Typography
              variant="subtitle2"
              sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.8 }}
            >
              <ErrorOutlineIcon color="error" fontSize="small" /> Areas to Improve
            </Typography>
            <Stack spacing={0.6}>
              {analysis.red_flags.map((flag, idx) => (
                <Typography key={idx} variant="body2" color="text.secondary">
                  • {flag}
                </Typography>
              ))}
            </Stack>
          </>
        )}
      </CardContent>
    </Card>
  );
};
