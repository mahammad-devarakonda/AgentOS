import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import {
  AutoFixHigh as AutoFixHighIcon,
  LightbulbOutlined as LightbulbOutlinedIcon,
} from '@mui/icons-material';
import type { ResumeEnhancementOutput } from '../../types/resume';

interface SuggestionsListProps {
  enhancements: ResumeEnhancementOutput;
}

export const SuggestionsList: React.FC<SuggestionsListProps> = ({ enhancements }) => {
  return (
    <Card elevation={3} sx={{ border: '1px solid rgba(255,255,255,0.08)' }}>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <AutoFixHighIcon color="secondary" /> AI Agent Enhancements & Bullet Rewrites
        </Typography>

        {enhancements.improved_summary && (
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              mb: 3,
            }}
          >
            <Typography variant="subtitle2" color="secondary.main" gutterBottom>
              Recommended Executive Summary Rewrite
            </Typography>
            <Typography variant="body2">{enhancements.improved_summary}</Typography>
          </Box>
        )}

        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
          High-Impact Bullet Point Rewrites (Before → After)
        </Typography>
        <Stack spacing={2} sx={{ mb: 3 }}>
          {enhancements.bullet_rewrites.map((item, idx) => (
            <Box
              key={idx}
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <Chip label={item.section} size="small" sx={{ mb: 1 }} />
              <Typography variant="body2" color="error.light" sx={{ mb: 1 }}>
                <strong>Before:</strong> {item.original_bullet}
              </Typography>
              <Typography variant="body2" color="secondary.light" sx={{ mb: 1 }}>
                <strong>After:</strong> {item.improved_bullet}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                <em>Why it works: {item.rationale}</em>
              </Typography>
            </Box>
          ))}
        </Stack>

        <Divider sx={{ my: 2 }} />

        <Typography
          variant="subtitle1"
          sx={{ fontWeight: 600, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}
        >
          <LightbulbOutlinedIcon color="warning" fontSize="small" /> Actionable Next Steps
        </Typography>
        <Stack spacing={1}>
          {enhancements.actionable_recommendations.map((rec, idx) => (
            <Typography key={idx} variant="body2" color="text.secondary">
              {idx + 1}. {rec}
            </Typography>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
};
