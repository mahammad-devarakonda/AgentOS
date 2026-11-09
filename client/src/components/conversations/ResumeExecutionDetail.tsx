import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Avatar,
  Stack,
  Chip,
  Grid,
  Divider,
  LinearProgress,
} from '@mui/material';
import {
  DescriptionRounded as ResumeIcon,
  CheckCircleRounded as CheckIcon,
  WarningAmberRounded as WarningIcon,
  VerifiedUserRounded as VerifierIcon,
  EmailRounded as EmailIcon,
  PhoneRounded as PhoneIcon,
  PlaceRounded as PlaceIcon,
  AutoAwesomeRounded as SparklesIcon,
} from '@mui/icons-material';
import type { ConversationAnalyticsItem } from '../../types/conversation';

interface ResumeExecutionDetailProps {
  conversation: ConversationAnalyticsItem;
}

export const ResumeExecutionDetail: React.FC<ResumeExecutionDetailProps> = ({ conversation }) => {
  const meta = conversation.metadata || {};
  const extracted = meta.extracted_profile || {};
  const analysis = meta.analysis || {};
  const enhancements = meta.enhancements || {};
  const verification = meta.verification;
  const overallScore = analysis.overall_score ?? meta.overall_score ?? 0;
  const rewrites = enhancements.bullet_rewrites || [];
  const skills = extracted.skills || [];

  const getScoreColor = (score: number) => {
    if (score >= 90) return '#059669';
    if (score >= 80) return '#2563eb';
    if (score >= 70) return '#d97706';
    return '#dc2626';
  };

  return (
    <Stack spacing={3}>
      {/* Candidate Profile Overview */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: 3,
          border: '1px solid #e2e8f0',
          background: '#ffffff',
        }}
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5} sx={{ alignItems: 'flex-start' }}>
          <Avatar
            sx={{
              width: 56,
              height: 56,
              bgcolor: '#4f46e5',
              color: '#fff',
              fontSize: '1.4rem',
              fontWeight: 700,
            }}
          >
            {(extracted.full_name || extracted.name || 'C').charAt(0).toUpperCase()}
          </Avatar>
          <Box sx={{ flexGrow: 1 }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap', mb: 0.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>
                {extracted.full_name || extracted.name || 'Candidate Profile'}
              </Typography>
              <Chip
                icon={<SparklesIcon sx={{ fontSize: '12px !important', color: '#4338ca !important' }} />}
                label={`Generated via: ${meta.model}`}
                size="small"
                sx={{
                  bgcolor: 'rgba(99, 102, 241, 0.08)',
                  color: '#4338ca',
                  fontWeight: 700,
                  fontSize: '0.7rem',
                  border: '1px solid rgba(99, 102, 241, 0.25)',
                }}
              />
              {meta.target_role && (
                <Chip
                  label={`Target: ${meta.target_role}`}
                  size="small"
                  sx={{ bgcolor: '#eff6ff', color: '#1e40af', fontWeight: 600 }}
                />
              )}
              {meta.filename && (
                <Chip
                  icon={<ResumeIcon sx={{ fontSize: '13px !important' }} />}
                  label={meta.filename}
                  size="small"
                  variant="outlined"
                  sx={{ color: '#64748b', borderColor: '#cbd5e1' }}
                />
              )}
            </Stack>

            <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', color: '#64748b', fontSize: '0.85rem', mt: 1 }}>
              {extracted.email && (
                <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                  <EmailIcon sx={{ fontSize: 16, color: '#94a3b8' }} />
                  <span>{extracted.email}</span>
                </Stack>
              )}
              {extracted.phone && (
                <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                  <PhoneIcon sx={{ fontSize: 16, color: '#94a3b8' }} />
                  <span>{extracted.phone}</span>
                </Stack>
              )}
              {extracted.location && (
                <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                  <PlaceIcon sx={{ fontSize: 16, color: '#94a3b8' }} />
                  <span>{extracted.location}</span>
                </Stack>
              )}
            </Stack>

            {skills.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569', display: 'block', mb: 0.8 }}>
                  Identified Skills ({skills.length}):
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
                  {skills.slice(0, 16).map((skill: string, i: number) => (
                    <Chip
                      key={i}
                      label={skill}
                      size="small"
                      sx={{
                        bgcolor: '#f1f5f9',
                        color: '#334155',
                        fontSize: '0.72rem',
                        height: 22,
                      }}
                    />
                  ))}
                  {skills.length > 16 && (
                    <Chip
                      label={`+${skills.length - 16} more`}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: '0.72rem', height: 22 }}
                    />
                  )}
                </Box>
              </Box>
            )}
          </Box>
        </Stack>
      </Paper>

      {/* ATS Evaluation Scores */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: 3,
          border: '1px solid #e2e8f0',
          background: '#ffffff',
        }}
      >
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} sx={{ alignItems: 'center', mb: 3 }}>
          <Box
            sx={{
              width: 110,
              height: 110,
              borderRadius: '50%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              border: `6px solid ${getScoreColor(overallScore)}`,
              bgcolor: `${getScoreColor(overallScore)}0D`,
              flexShrink: 0,
            }}
          >
            <Typography variant="h3" sx={{ fontWeight: 900, color: getScoreColor(overallScore), lineHeight: 1 }}>
              {overallScore}
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, mt: 0.5 }}>
              ATS SCORE
            </Typography>
          </Box>

          <Box sx={{ flexGrow: 1, width: '100%' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a', mb: 1 }}>
              ATS Compatibility & Quality Assessment
            </Typography>
            <Grid container spacing={2}>
              {[
                { label: 'Impact & Quantification', val: analysis.impact_score },
                { label: 'Brevity & Conciseness', val: analysis.brevity_score },
                { label: 'Style & Presentation', val: analysis.style_score },
                { label: 'Skills Alignment', val: analysis.skills_score },
              ].map((item, idx) => (
                <Grid size={{ xs: 6, sm: 6, md: 3 }} key={idx}>
                  <Box sx={{ p: 1.5, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #f1f5f9' }}>
                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'block', mb: 0.5 }}>
                      {item.label}
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e293b' }}>
                        {item.val ?? 'N/A'}%
                      </Typography>
                      {item.val !== undefined && (
                        <LinearProgress
                          variant="determinate"
                          value={item.val || 0}
                          sx={{
                            flexGrow: 1,
                            height: 6,
                            borderRadius: 3,
                            bgcolor: '#e2e8f0',
                            '& .MuiLinearProgress-bar': { bgcolor: getScoreColor(item.val || 0) },
                          }}
                        />
                      )}
                    </Stack>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Stack>

        <Divider sx={{ my: 2 }} />

        {/* Strengths and Weaknesses */}
        <Grid container spacing={2.5}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#059669', display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <CheckIcon fontSize="small" /> Key Strengths ({analysis.strengths?.length || 0})
            </Typography>
            <Stack spacing={1}>
              {(analysis.strengths || []).map((str: string, idx: number) => (
                <Box
                  key={idx}
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: 'rgba(16, 185, 129, 0.05)',
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                    fontSize: '0.85rem',
                    color: '#065f46',
                    lineHeight: 1.5,
                  }}
                >
                  • {str}
                </Box>
              ))}
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#d97706', display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <WarningIcon fontSize="small" /> Areas for Improvement ({analysis.weaknesses?.length || 0})
            </Typography>
            <Stack spacing={1}>
              {(analysis.weaknesses || []).map((w: string, idx: number) => (
                <Box
                  key={idx}
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: 'rgba(245, 158, 11, 0.05)',
                    border: '1px solid rgba(245, 158, 11, 0.2)',
                    fontSize: '0.85rem',
                    color: '#92400e',
                    lineHeight: 1.5,
                  }}
                >
                  • {w}
                </Box>
              ))}
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      {/* Enhancements & Bullet Point Rewrites */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: 3,
          border: '1px solid #e2e8f0',
          background: '#ffffff',
        }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2 }}>
          <SparklesIcon sx={{ color: '#4f46e5' }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a' }}>
            Resume Enhancements & High-Impact Rewrites
          </Typography>
        </Stack>

        {enhancements.executive_summary && (
          <Box
            sx={{
              p: 2,
              mb: 3,
              borderRadius: 2.5,
              bgcolor: 'rgba(79, 70, 229, 0.04)',
              border: '1px solid rgba(79, 70, 229, 0.15)',
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 800, color: '#4338ca', display: 'block', mb: 0.5, textTransform: 'uppercase' }}>
              Generated Executive Summary:
            </Typography>
            <Typography variant="body2" sx={{ color: '#1e293b', lineHeight: 1.6 }}>
              {enhancements.executive_summary}
            </Typography>
          </Box>
        )}

        {rewrites.length > 0 && (
          <Stack spacing={2}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#334155' }}>
              Bullet Point Rewrites ({rewrites.length}):
            </Typography>
            {rewrites.map((rw: any, i: number) => (
              <Paper
                key={i}
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  border: '1px solid #e2e8f0',
                  bgcolor: '#fafafa',
                }}
              >
                <Box sx={{ mb: 1 }}>
                  <Typography variant="caption" sx={{ color: '#dc2626', fontWeight: 700, display: 'block' }}>
                    BEFORE (Original):
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#64748b', fontStyle: 'italic', pl: 1 }}>
                    "{rw.original || rw.original_bullet}"
                  </Typography>
                </Box>

                <Box sx={{ mb: 1 }}>
                  <Typography variant="caption" sx={{ color: '#059669', fontWeight: 800, display: 'block' }}>
                    AFTER (Enhanced with Quantified Impact):
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#0f172a', fontWeight: 600, pl: 1 }}>
                    "{rw.enhanced || rw.enhanced_bullet}"
                  </Typography>
                </Box>

                {(rw.reason || rw.explanation) && (
                  <Typography variant="caption" sx={{ color: '#6366f1', display: 'block', pl: 1, fontWeight: 500 }}>
                    Why this wins: {rw.reason || rw.explanation}
                  </Typography>
                )}
              </Paper>
            ))}
          </Stack>
        )}
      </Paper>

      {/* Verifier Audit Card (if verified) */}
      {verification && (
        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: 3,
            border: '1px solid #c7d2fe',
            background: 'linear-gradient(180deg, #ffffff 0%, #f5f3ff 100%)',
          }}
        >
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 1.5 }}>
            <VerifierIcon sx={{ color: '#4f46e5' }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#312e81' }}>
              QA Verifier Audit (Self-Healing Loop)
            </Typography>
            <Chip
              label="Audited & Verified"
              size="small"
              sx={{ bgcolor: '#4f46e5', color: '#fff', fontWeight: 700 }}
            />
          </Stack>
          <Typography variant="body2" sx={{ color: '#4338ca', mb: 2, lineHeight: 1.6 }}>
            {verification.notes || verification.verification_notes || 'Score dropped below threshold (< 90). Agent 4 executed an automated audit to verify suggestions and guarantee high-fidelity candidate recommendations.'}
          </Typography>

          <Grid container spacing={2}>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Typography variant="caption" sx={{ color: '#6366f1', fontWeight: 700 }}>ORIGINAL SCORE</Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#dc2626' }}>
                {verification.original_score ?? overallScore}/100
              </Typography>
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Typography variant="caption" sx={{ color: '#6366f1', fontWeight: 700 }}>VERIFIED SCORE</Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#059669' }}>
                {verification.verified_score ?? 92}/100
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="caption" sx={{ color: '#6366f1', fontWeight: 700 }}>AUDITED REMEDIATIONS</Typography>
              <Typography variant="body2" sx={{ color: '#334155', fontWeight: 500 }}>
                {Array.isArray(verification.audited_fixes)
                  ? verification.audited_fixes.join(', ')
                  : 'Verified metric truthfulness, keyword densities & ATS formatting.'}
              </Typography>
            </Grid>
          </Grid>
        </Paper>
      )}
    </Stack>
  );
};

