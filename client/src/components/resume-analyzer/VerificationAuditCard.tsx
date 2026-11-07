import React from 'react';
import {
  Card,
  CardContent,
  Chip,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import {
  VerifiedUserOutlined as VerifiedIcon,
  CheckCircleOutlined as CheckIcon,
  GppMaybeOutlined as FixIcon,
} from '@mui/icons-material';
import type { VerificationAuditOutput } from '../../types/resume';

interface VerificationAuditCardProps {
  verification: VerificationAuditOutput;
}

export const VerificationAuditCard: React.FC<VerificationAuditCardProps> = ({
  verification,
}) => {
  return (
    <Card
      elevation={0}
      sx={{
        border: '1px solid #bfdbfe',
        bgcolor: '#f8fafc',
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          sx={{
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' },
            mb: 1.5,
          }}
          spacing={1}
        >
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <VerifiedIcon color="primary" fontSize="small" />
            <Typography variant="h6">
              Agent 4: QA Verification Audit (Score &lt; 90 Triggered)
            </Typography>
          </Stack>

          <Stack direction="row" spacing={1}>
            <Chip
              size="small"
              label={`Initial: ${verification.initial_score}/100`}
              variant="outlined"
            />
            <Chip
              size="small"
              color="success"
              label={`Projected After Fixes: ${verification.verified_projected_score}/100`}
            />
          </Stack>
        </Stack>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {verification.audit_verdict}
        </Typography>

        <Divider sx={{ my: 2 }} />

        <Typography
          variant="subtitle2"
          sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 0.8 }}
        >
          <CheckIcon color="success" fontSize="small" /> Cross-Agent Checks Verified
        </Typography>
        <Stack spacing={0.6} sx={{ mb: 2.5 }}>
          {verification.verified_checks.map((check, idx) => (
            <Typography key={idx} variant="body2" color="text.secondary">
              ✓ {check}
            </Typography>
          ))}
        </Stack>

        <Typography
          variant="subtitle2"
          sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 0.8 }}
        >
          <FixIcon color="primary" fontSize="small" /> Critical Fixes Required to Reach 90+ Score
        </Typography>
        <Stack spacing={0.8}>
          {verification.critical_fixes_to_reach_90_plus.map((fix, idx) => (
            <Typography key={idx} variant="body2" color="text.primary">
              {idx + 1}. {fix}
            </Typography>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
};
