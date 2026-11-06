import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Grid,
  CircularProgress,
  Divider,
  Alert,
  Chip,
} from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import DescriptionIcon from '@mui/icons-material/Description';
import WorkIcon from '@mui/icons-material/Work';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import { streamResumeAnalysis } from '../api/agentApi';

// ─── Component ───────────────────────────────────────────────────────────────
export const ResumePage: React.FC = () => {
  const [jobDescription, setJobDescription] = useState('');
  const [resumeContent, setResumeContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [streamedText, setStreamedText] = useState('');
  const [modelUsed, setModelUsed] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isReady = jobDescription.trim().length > 0 && resumeContent.trim().length > 0;
  const hasResult = streamedText.length > 0;

  // ── Run Agent: stream tokens from backend ────────────────────────────────
  const handleRunAgent = async () => {
    if (!isReady) return;

    setLoading(true);
    setDone(false);
    setError(null);
    setStreamedText('');
    setModelUsed('');

    await streamResumeAnalysis(
      {
        job_description: jobDescription.trim(),
        resume_content: resumeContent.trim(),
      },
      // onChunk — called for every token streamed
      (chunk) => {
        setStreamedText((prev) => prev + chunk.content);
        if (chunk.model) setModelUsed(chunk.model);
      },
      // onDone
      () => {
        setLoading(false);
        setDone(true);
      },
      // onError
      (msg) => {
        setError(msg);
        setLoading(false);
      }
    );
  };

  const handleClear = () => {
    setJobDescription('');
    setResumeContent('');
    setStreamedText('');
    setModelUsed('');
    setDone(false);
    setError(null);
  };

  // ── Lightweight markdown renderer ─────────────────────────────────────────
  const renderAnalysis = (text: string) =>
    text.split('\n').map((line, idx) => {
      if (line.startsWith('## '))
        return (
          <Typography
            key={idx}
            variant="h6"
            sx={{ mt: 2.5, mb: 0.5, color: 'primary.main', fontWeight: 700 }}
          >
            {line.replace('## ', '')}
          </Typography>
        );
      if (line.startsWith('# '))
        return (
          <Typography
            key={idx}
            variant="h5"
            sx={{ mt: 3, mb: 1, color: 'primary.light', fontWeight: 800 }}
          >
            {line.replace('# ', '')}
          </Typography>
        );
      if (/^\*\*(.+)\*\*$/.test(line))
        return (
          <Typography key={idx} variant="body1" sx={{ mt: 1, fontWeight: 700 }}>
            {line.replace(/\*\*/g, '')}
          </Typography>
        );
      if (line.startsWith('- ') || line.startsWith('* '))
        return (
          <Typography
            key={idx}
            variant="body2"
            sx={{ pl: 2, py: 0.2, color: 'text.secondary' }}
          >
            • {line.slice(2)}
          </Typography>
        );
      if (line.trim() === '') return <Box key={idx} sx={{ height: 4 }} />;
      return (
        <Typography key={idx} variant="body2" sx={{ lineHeight: 1.8 }}>
          {line}
        </Typography>
      );
    });

  const wordCount = (text: string) =>
    text.trim().split(/\s+/).filter(Boolean).length;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: 8 }}>
      <Box sx={{ maxWidth: 1200, mx: 'auto', px: 3, pt: 5 }}>

        {/* ── Page Header ─────────────────────────────────────────────── */}
        <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
          <SmartToyIcon sx={{ fontSize: 40, color: 'primary.main' }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary' }}>
              Resume Analyzer Agent
            </Typography>
            <Typography variant="body2" color="text.secondary">
              AI-powered resume &amp; job description analysis &mdash; streamed live
            </Typography>
          </Box>
        </Box>

        {/* ── Input Cards ─────────────────────────────────────────────── */}
        <Grid container spacing={3}>
          {/* Job Description */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper
              elevation={3}
              sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', height: '100%' }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <WorkIcon color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Job Description
                </Typography>
              </Box>
              <TextField
                multiline
                fullWidth
                minRows={12}
                maxRows={18}
                placeholder={
                  'Paste the job description here...\n\ne.g., We are looking for a Senior React Developer with 5+ years of experience in TypeScript, REST APIs...'
                }
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                variant="outlined"
                disabled={loading}
                sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'background.paper', fontSize: 14 } }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                {wordCount(jobDescription)} words
              </Typography>
            </Paper>
          </Grid>

          {/* Resume Content */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper
              elevation={3}
              sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', height: '100%' }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <DescriptionIcon color="secondary" />
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Your Resume Content
                </Typography>
              </Box>
              <TextField
                multiline
                fullWidth
                minRows={12}
                maxRows={18}
                placeholder={
                  'Paste your resume content here...\n\ne.g., John Doe | john@email.com\n\nExperience:\n- 6 years of frontend development with React...'
                }
                value={resumeContent}
                onChange={(e) => setResumeContent(e.target.value)}
                variant="outlined"
                disabled={loading}
                sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'background.paper', fontSize: 14 } }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                {wordCount(resumeContent)} words
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* ── Action Bar ──────────────────────────────────────────────── */}
        <Box sx={{ mt: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            size="large"
            onClick={handleRunAgent}
            disabled={!isReady || loading}
            startIcon={
              loading
                ? <CircularProgress size={20} color="inherit" />
                : <SmartToyIcon />
            }
            sx={{
              px: 5,
              py: 1.5,
              borderRadius: 3,
              fontWeight: 700,
              fontSize: 16,
              ...(isReady && !loading && {
                background: 'linear-gradient(135deg, #0288d1 0%, #7b1fa2 100%)',
                boxShadow: '0 4px 20px rgba(2,136,209,0.4)',
              }),
              transition: 'all 0.3s ease',
            }}
          >
            {loading ? 'Analyzing...' : 'Run Agent'}
          </Button>

          {(hasResult || error) && !loading && (
            <Button
              variant="outlined"
              size="large"
              onClick={handleClear}
              sx={{ px: 3, py: 1.5, borderRadius: 3 }}
            >
              Clear All
            </Button>
          )}

          {!isReady && !loading && (
            <Typography variant="caption" color="text.secondary">
              Fill in both fields to enable the agent.
            </Typography>
          )}
        </Box>

        {/* ── Error ───────────────────────────────────────────────────── */}
        {error && (
          <Alert severity="error" sx={{ mt: 3, borderRadius: 2 }}>
            <strong>Agent Error:</strong> {error}
          </Alert>
        )}

        {/* ── Streaming / Result Panel ─────────────────────────────────── */}
        {(hasResult || loading) && (
          <Paper
            elevation={4}
            sx={{
              mt: 4,
              p: 4,
              borderRadius: 3,
              border: '1px solid',
              borderColor: done ? 'primary.dark' : 'divider',
              background:
                'linear-gradient(145deg, rgba(2,136,209,0.05) 0%, rgba(123,31,162,0.05) 100%)',
              transition: 'border-color 0.4s ease',
            }}
          >
            {/* Panel Header */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: 2,
                flexWrap: 'wrap',
                gap: 1,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                {done ? (
                  <CheckCircleOutlinedIcon sx={{ color: 'success.main', fontSize: 28 }} />
                ) : (
                  <CircularProgress size={22} thickness={5} />
                )}
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  {done ? 'Analysis Complete' : 'Agent is thinking…'}
                </Typography>
              </Box>

              {modelUsed && (
                <Chip
                  label={`Model: ${modelUsed}`}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              )}
            </Box>

            <Divider sx={{ mb: 3 }} />

            {/* Live streamed output */}
            <Box sx={{ lineHeight: 1.9 }}>
              {renderAnalysis(streamedText)}
              {/* Blinking cursor while streaming */}
              {loading && (
                <Box
                  component="span"
                  sx={{
                    display: 'inline-block',
                    width: 2,
                    height: '1em',
                    bgcolor: 'primary.main',
                    ml: 0.5,
                    verticalAlign: 'middle',
                    animation: 'blink 1s step-start infinite',
                    '@keyframes blink': {
                      '0%, 100%': { opacity: 1 },
                      '50%': { opacity: 0 },
                    },
                  }}
                />
              )}
            </Box>
          </Paper>
        )}

      </Box>
    </Box>
  );
};
