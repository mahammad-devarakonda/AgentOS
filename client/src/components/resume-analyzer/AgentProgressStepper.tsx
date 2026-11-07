import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as PendingIcon,
  RemoveCircleOutlined as SkippedIcon,
  ErrorOutlined as ErrorIcon,
} from '@mui/icons-material';
import type { LivePipelineStep } from '../../types/resume';

interface AgentProgressStepperProps {
  steps: LivePipelineStep[];
  progress: number;
  loading: boolean;
}

export const AgentProgressStepper: React.FC<AgentProgressStepperProps> = ({
  steps,
  progress,
  loading,
}) => {
  const activeStep = steps.find((s) => s.status === 'running');

  return (
    <Card elevation={0}>
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
          <Box>
            <Typography variant="h6">Live Multi-Agent Pipeline Status</Typography>
            <Typography variant="body2" color="text.secondary">
              {loading && activeStep
                ? `Active Now: ${activeStep.title} — ${activeStep.detail}`
                : progress === 100
                ? 'All multi-agent stages finished'
                : 'Click "Analyze Resume" to watch each agent execute in real time'}
            </Typography>
          </Box>
          <Chip
            size="small"
            label={`${progress}% Complete`}
            color={progress === 100 ? 'success' : loading ? 'primary' : 'default'}
            variant={progress === 0 && !loading ? 'outlined' : 'filled'}
          />
        </Stack>

        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{ height: 6, borderRadius: 3, mb: 3, bgcolor: '#e2e8f0' }}
        />

        <Stack spacing={1.5}>
          {steps.map((step) => {
            const isRunning = step.status === 'running';
            const isCompleted = step.status === 'completed';
            const isSkipped = step.status === 'skipped';
            const isError = step.status === 'error';

            return (
              <Box
                key={step.nodeId}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: isRunning
                    ? 'primary.main'
                    : isCompleted
                    ? '#bbf7d0'
                    : isError
                    ? 'error.light'
                    : '#e2e8f0',
                  bgcolor: isRunning
                    ? '#eff6ff'
                    : isCompleted
                    ? '#f0fdf4'
                    : isError
                    ? '#fef2f2'
                    : '#f8fafc',
                  transition: 'all 0.2s ease',
                }}
              >
                <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start' }}>
                  <Box sx={{ mt: 0.3, display: 'flex', alignItems: 'center' }}>
                    {isRunning && <CircularProgress size={20} color="primary" />}
                    {isCompleted && <CheckCircleIcon color="success" sx={{ fontSize: 22 }} />}
                    {isSkipped && <SkippedIcon sx={{ fontSize: 22, color: '#64748b' }} />}
                    {isError && <ErrorIcon color="error" sx={{ fontSize: 22 }} />}
                    {step.status === 'pending' && (
                      <PendingIcon sx={{ fontSize: 22, color: '#94a3b8' }} />
                    )}
                  </Box>

                  <Box sx={{ flex: 1 }}>
                    <Stack
                      direction="row"
                      sx={{
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 1,
                      }}
                    >
                      <Typography
                        variant="subtitle2"
                        sx={{
                          fontWeight: 600,
                          color:
                            step.status === 'pending' || isSkipped
                              ? 'text.secondary'
                              : 'text.primary',
                        }}
                      >
                        {step.agentLabel || step.title}
                      </Typography>

                      <Chip
                        size="small"
                        label={
                          isRunning
                            ? 'Working...'
                            : isCompleted
                            ? 'Verified & Done'
                            : isSkipped
                            ? 'Skipped (Score ≥ 90)'
                            : isError
                            ? 'Error'
                            : 'Waiting'
                        }
                        color={
                          isRunning
                            ? 'primary'
                            : isCompleted
                            ? 'success'
                            : isError
                            ? 'error'
                            : 'default'
                        }
                        variant={
                          step.status === 'pending' || isSkipped ? 'outlined' : 'filled'
                        }
                        sx={{ height: 22, fontSize: '0.72rem' }}
                      />
                    </Stack>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 0.4, fontSize: '0.84rem' }}
                    >
                      {step.detail}
                    </Typography>
                  </Box>
                </Stack>
              </Box>
            );
          })}
        </Stack>
      </CardContent>
    </Card>
  );
};
