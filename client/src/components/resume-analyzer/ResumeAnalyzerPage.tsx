import React from 'react';
import { Box, Container, Grid, Stack, Typography, Breadcrumbs, Link, Button, Chip } from '@mui/material';
import { TravelExplore as JobIcon, Hub as HubIcon } from '@mui/icons-material';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store';
import { analyzeResumeFile, analyzeResumeText } from '../../store/resumeSlice';
import { ResumeUploadForm } from './ResumeUploadForm';
import { AgentProgressStepper } from './AgentProgressStepper';
import { VerificationAuditCard } from './VerificationAuditCard';
import { ProfileOverview } from './ProfileOverview';
import { AnalysisScoreCard } from './AnalysisScoreCard';
import { SuggestionsList } from './SuggestionsList';

export const ResumeAnalyzerPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { result, loading, error, progress, pipelineSteps, currentModel } = useSelector(
    (state: RootState) => state.resume
  );

  const handleFileSubmit = (file: File, targetRole: string, jobDescription: string) => {
    dispatch(analyzeResumeFile({ file, targetRole, jobDescription }));
  };

  const handleTextSubmit = (rawText: string, targetRole: string, jobDescription: string) => {
    dispatch(analyzeResumeText({ rawText, targetRole, jobDescription }));
  };

  return (
    <Box sx={{ minHeight: '100vh', py: 4, bgcolor: 'background.default', color: 'text.primary' }}>
      <Container maxWidth="lg">
        {/* Navigation Breadcrumb */}
        <Breadcrumbs sx={{ mb: 2 }}>
          <Link
            component={RouterLink}
            to="/"
            underline="hover"
            color="inherit"
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
          >
            <HubIcon sx={{ fontSize: 16, color: '#2563eb' }} />
            AgentOS Dashboard
          </Link>
          <Typography color="text.primary" sx={{ fontWeight: 600 }}>
            Resume Analyzer
          </Typography>
        </Breadcrumbs>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{
            mb: 3,
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' },
          }}
        >
          <Box>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>Resume Analyzer</Typography>
              <Chip
                label="Multi-Agent Pipeline"
                size="small"
                sx={{ bgcolor: 'rgba(37, 99, 235, 0.08)', color: '#2563eb', fontWeight: 700 }}
              />
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Autonomous Ingestion • ATS Score Evaluation • Automatic Score &lt; 90 QA Verification
            </Typography>
          </Box>

          <Button
            variant="outlined"
            size="small"
            startIcon={<JobIcon />}
            onClick={() => navigate('/job-search')}
            sx={{ borderRadius: 2, fontWeight: 600, color: '#059669', borderColor: '#059669' }}
          >
            Switch to Job Search Agent
          </Button>
        </Stack>

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 5 }}>
            <ResumeUploadForm
              loading={loading}
              error={error}
              onSubmitFile={handleFileSubmit}
              onSubmitText={handleTextSubmit}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 7 }}>
            <Stack spacing={3}>
              <AgentProgressStepper
                steps={pipelineSteps}
                progress={progress}
                loading={loading}
                model={currentModel || result?.model}
              />

              {result && (
                <>
                  {result.verification && (
                    <VerificationAuditCard verification={result.verification} />
                  )}
                  <AnalysisScoreCard analysis={result.analysis} />
                  <SuggestionsList enhancements={result.enhancements} />
                  <ProfileOverview profile={result.extracted_profile} />
                </>
              )}
            </Stack>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};
