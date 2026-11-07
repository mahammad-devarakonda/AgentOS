import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardActionArea,
  Button,
  Chip,
  Stack,
  Paper,
  Tabs,
  Tab,
  Divider,
} from '@mui/material';
import {
  Description as ResumeIcon,
  TravelExplore as JobIcon,
  ArrowForward as ArrowForwardIcon,
  AutoAwesome as SparklesIcon,
  VerifiedUser as VerifierIcon,
  Psychology as BrainIcon,
  CheckCircle as CheckIcon,
  Layers as LayersIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { AgentNetworkVisual } from './AgentNetworkVisual';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<number>(0);

  const capabilities = [
    {
      title: 'Autonomous Graph Pipeline',
      icon: <LayersIcon />,
      tag: 'LangGraph Orchestrated',
      summary:
        'Instead of fragile monolithic prompts, Agent OS decomposes complex career tasks into deterministic, asynchronous agent graphs with isolated state and error boundaries.',
      points: [
        'Deterministic state transitions prevent hallucinated deviations',
        'Asynchronous HTTPX client with fallback model routing',
        'Sub-second inference and real-time execution progress updates',
      ],
    },
    {
      title: 'Deep Resume Intelligence & ATS Scoring',
      icon: <ResumeIcon />,
      tag: '4-Stage Pipeline',
      summary:
        'Extracts, normalizes, and analyzes resumes against job specifications. Delivers multidimensional scores for ATS readiness, hard skill match, and quantifiable achievements.',
      points: [
        'Robust multi-format parser for PDF, DOCX, and raw text',
        'Structured Pydantic v2 schemas for verified candidate extraction',
        'Actionable bullet rewrites with strong action verbs and quantified impact',
      ],
    },
    {
      title: 'Self-Healing QA Verification Loops',
      icon: <VerifierIcon />,
      tag: 'Score < 90 Guardrail',
      summary:
        'Autonomous quality assurance guards: if any candidate analysis score drops below 90, Agent OS automatically invokes the Verification Auditor to self-heal and refine recommendations.',
      points: [
        'Zero human intervention required to trigger remediation loops',
        'Cross-checks hallucination risks and factual resume consistency',
        'Confidence score and transparent audit trail on every analysis',
      ],
    },
    {
      title: 'Autonomous Job Discovery & Matching',
      icon: <JobIcon />,
      tag: 'Market Intelligence',
      summary:
        'Scouts relevant industry opportunities, calculates vector skill compatibility, estimates salary bands, and identifies pinpoint skill gaps needed to win the role.',
      points: [
        'Instant candidate fit index from 0 to 100%',
        'Missing skill diagnostics with proactive upskilling recommendations',
        'Direct synchronization with Resume Analyzer for tailored pitches',
      ],
    },
  ];

  return (
    <Box sx={{ minHeight: '100vh', pb: 8, bgcolor: 'background.default', color: 'text.primary' }}>
      {/* Hero Banner Section */}
      <Box
        sx={{
          py: { xs: 6, md: 8 },
          background: 'linear-gradient(180deg, #ffffff 0%, #f1f5f9 100%)',
          borderBottom: '1px solid #e2e8f0',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Glow backdrop circles */}
        <Box
          sx={{
            position: 'absolute',
            top: -100,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 700,
            height: 350,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(37, 99, 235, 0.12) 0%, rgba(37, 99, 235, 0) 70%)',
            pointerEvents: 'none',
          }}
        />

        <Container maxWidth="lg">
          <Stack
            spacing={3}
            sx={{
              alignItems: 'center',
              textAlign: 'center',
              position: 'relative',
              zIndex: 1,
            }}
          >
            {/* Top Pill */}
            <Chip
              icon={<SparklesIcon sx={{ fontSize: '15px !important', color: '#2563eb !important' }} />}
              label="Next-Gen Autonomous Agent Operating System"
              size="medium"
              sx={{
                bgcolor: 'rgba(37, 99, 235, 0.08)',
                color: '#2563eb',
                border: '1px solid rgba(37, 99, 235, 0.25)',
                fontWeight: 700,
                fontSize: '0.8rem',
                py: 0.5,
              }}
            />

            {/* Main Headline */}
            <Typography
              variant="h1"
              sx={{
                fontSize: { xs: '2.3rem', sm: '3.2rem', md: '3.8rem' },
                fontWeight: 900,
                letterSpacing: '-0.04em',
                lineHeight: 1.15,
                maxWidth: 900,
                color: '#0f172a',
              }}
            >
              The Multi-Agent Operating System for{' '}
              <Box
                component="span"
                sx={{
                  background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Intelligent Careers
              </Box>
            </Typography>

            {/* Sub-headline */}
            <Typography
              variant="body1"
              sx={{
                fontSize: { xs: '1rem', md: '1.2rem' },
                color: '#475569',
                maxWidth: 720,
                lineHeight: 1.6,
              }}
            >
              Agent OS orchestrates specialized autonomous AI agents that analyze resumes, audit quality with self-healing QA loops, match market opportunities, and automate high-impact career workflows.
            </Typography>

            {/* Hero Quick Action Buttons */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ pt: 1 }}>
              <Button
                variant="contained"
                size="large"
                startIcon={<ResumeIcon />}
                endIcon={<ArrowForwardIcon />}
                onClick={() => navigate('/resume-analyzer')}
                sx={{
                  bgcolor: '#2563eb',
                  px: 3.5,
                  py: 1.4,
                  borderRadius: 2.5,
                  fontSize: '1rem',
                  fontWeight: 700,
                  boxShadow: '0 8px 24px rgba(37, 99, 235, 0.3)',
                  '&:hover': { bgcolor: '#1d4ed8' },
                }}
              >
                Open Resume Analyzer
              </Button>

              <Button
                variant="outlined"
                size="large"
                startIcon={<JobIcon />}
                endIcon={<ArrowForwardIcon />}
                onClick={() => navigate('/job-search')}
                sx={{
                  color: '#0f172a',
                  borderColor: '#cbd5e1',
                  bgcolor: '#ffffff',
                  px: 3.5,
                  py: 1.4,
                  borderRadius: 2.5,
                  fontSize: '1rem',
                  fontWeight: 700,
                  '&:hover': {
                    borderColor: '#2563eb',
                    bgcolor: 'rgba(37, 99, 235, 0.04)',
                  },
                }}
              >
                Launch Job Search Agent
              </Button>
            </Stack>

            {/* Key Metrics Strip */}
            <Grid container spacing={2} sx={{ mt: 3, maxWidth: 960 }}>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    bgcolor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    textAlign: 'center',
                  }}
                >
                  <Typography variant="h5" sx={{ fontWeight: 800, color: '#2563eb' }}>
                    4+
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                    Specialized Sub-Agents
                  </Typography>
                </Paper>
              </Grid>

              <Grid size={{ xs: 6, sm: 3 }}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    bgcolor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    textAlign: 'center',
                  }}
                >
                  <Typography variant="h5" sx={{ fontWeight: 800, color: '#10b981' }}>
                    &lt; 90 QA
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                    Self-Healing Loop
                  </Typography>
                </Paper>
              </Grid>

              <Grid size={{ xs: 6, sm: 3 }}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    bgcolor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    textAlign: 'center',
                  }}
                >
                  <Typography variant="h5" sx={{ fontWeight: 800, color: '#7c3aed' }}>
                    99.4%
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                    Extraction Accuracy
                  </Typography>
                </Paper>
              </Grid>

              <Grid size={{ xs: 6, sm: 3 }}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    bgcolor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    textAlign: 'center',
                  }}
                >
                  <Typography variant="h5" sx={{ fontWeight: 800, color: '#f59e0b' }}>
                    &lt; 1.2s
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                    Async Inference
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </Stack>
        </Container>
      </Box>

      {/* Main Content Area */}
      <Container maxWidth="lg" sx={{ mt: 5 }}>
        {/* Section 1: Interactive Agent OS Visual Topology */}
        <Box sx={{ mb: 7 }}>
          <Box sx={{ mb: 2 }}>
            <Chip label="Section 1 • Interactive Architecture" size="small" sx={{ mb: 1, fontWeight: 700 }} />
            <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
              How Agent OS Operates
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Interact with the multi-agent graph below. Click on any agent node to inspect its runtime engine, roles, and communication conduits.
            </Typography>
          </Box>

          <AgentNetworkVisual />
        </Box>

        <Divider sx={{ my: 6 }} />

        {/* Section 2: What Agent OS Will Do (Detailed capabilities) */}
        <Box sx={{ mb: 7 }}>
          <Box sx={{ mb: 3 }}>
            <Chip label="Section 2 • Platform Capabilities" size="small" color="primary" sx={{ mb: 1, fontWeight: 700 }} />
            <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
              What Agent OS Will Do For You
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 700 }}>
              Agent OS serves as an end-to-end autonomous career co-pilot, handling labor-intensive parsing, scoring, verifying, and matching tasks with mathematical rigor.
            </Typography>
          </Box>

          {/* Interactive Feature Tabs */}
          <Paper
            elevation={0}
            sx={{
              borderRadius: 3,
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              bgcolor: 'background.paper',
            }}
          >
            <Tabs
              value={activeTab}
              onChange={(_, val) => setActiveTab(val)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                borderBottom: '1px solid #e2e8f0',
                bgcolor: '#f8fafc',
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  py: 2,
                },
              }}
            >
              {capabilities.map((cap, idx) => (
                <Tab key={idx} icon={cap.icon} iconPosition="start" label={cap.title} />
              ))}
            </Tabs>

            <Box sx={{ p: { xs: 3, md: 4 } }}>
              <Grid container spacing={3} sx={{ alignItems: 'center' }}>
                <Grid size={{ xs: 12, md: 7 }}>
                  <Chip
                    label={capabilities[activeTab].tag}
                    size="small"
                    sx={{
                      bgcolor: 'rgba(37, 99, 235, 0.08)',
                      color: '#2563eb',
                      fontWeight: 700,
                      mb: 1.5,
                    }}
                  />
                  <Typography variant="h5" sx={{ fontWeight: 800, mb: 1.5 }}>
                    {capabilities[activeTab].title}
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#475569', lineHeight: 1.6, mb: 3 }}>
                    {capabilities[activeTab].summary}
                  </Typography>

                  <Stack spacing={1.5}>
                    {capabilities[activeTab].points.map((pt, i) => (
                      <Stack key={i} direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                        <CheckIcon sx={{ color: '#10b981', fontSize: 20 }} />
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                          {pt}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                </Grid>

                <Grid size={{ xs: 12, md: 5 }}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 3,
                      borderRadius: 3,
                      background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                      color: '#fff',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                    }}
                  >
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2 }}>
                      <BrainIcon sx={{ color: '#38bdf8' }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#93c5fd' }}>
                        LIVE AGENT STATUS
                      </Typography>
                    </Stack>
                    <Typography variant="body2" sx={{ color: '#cbd5e1', lineHeight: 1.5, mb: 2 }}>
                      Agent OS executes concurrent LangGraph state transforms with strict Pydantic models to eliminate hallucinations and deliver guaranteed outputs.
                    </Typography>
                    <Stack direction="row" spacing={1}>
                      <Chip label="Model: Auto-Fallback" size="small" sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.7rem' }} />
                      <Chip label="Latency: ~800ms" size="small" sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.7rem' }} />
                    </Stack>
                  </Paper>
                </Grid>
              </Grid>
            </Box>
          </Paper>
        </Box>

        <Divider sx={{ my: 6 }} />

        {/* Section 3: Available Works (Direct Routing Section) */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ mb: 3 }}>
            <Chip label="Section 3 • Available Works & Routing" size="small" color="success" sx={{ mb: 1, fontWeight: 700 }} />
            <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
              Available Works in Agent OS
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Select any active work module below to enter its specialized autonomous agent interface. Each module has dedicated routing and workflow state.
            </Typography>
          </Box>

          <Grid container spacing={3}>
            {/* Work Module 1: Resume Analyzer */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Card
                sx={{
                  height: '100%',
                  borderRadius: 3,
                  border: '2px solid #2563eb',
                  transition: 'all 0.25s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  boxShadow: '0 8px 30px rgba(37, 99, 235, 0.08)',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 16px 36px rgba(37, 99, 235, 0.16)',
                  },
                }}
              >
                <CardActionArea
                  onClick={() => navigate('/resume-analyzer')}
                  sx={{
                    p: 3.5,
                    flexGrow: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    justifyContent: 'flex-start',
                  }}
                >
                  {/* Top Bar */}
                  <Stack
                    direction="row"
                    sx={{ width: '100%', mb: 2, justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <Box
                      sx={{
                        width: 52,
                        height: 52,
                        borderRadius: 2.5,
                        background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
                      }}
                    >
                      <ResumeIcon sx={{ fontSize: 28 }} />
                    </Box>

                    <Chip
                      icon={<CheckIcon sx={{ fontSize: '14px !important', color: '#10b981 !important' }} />}
                      label="Available Work • Online"
                      size="small"
                      sx={{
                        bgcolor: 'rgba(16, 185, 129, 0.1)',
                        color: '#065f46',
                        fontWeight: 700,
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                      }}
                    />
                  </Stack>

                  {/* Title & Tagline */}
                  <Typography variant="h5" sx={{ fontWeight: 800, mb: 1, color: '#0f172a' }}>
                    Resume Analyzer Agent
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#475569', mb: 2.5, lineHeight: 1.6 }}>
                    Upload or paste your resume for multi-agent extraction, ATS compliance evaluation, and an automated self-healing QA verification loop if score &lt; 90.
                  </Typography>

                  {/* Key Highlights */}
                  <Stack spacing={1} sx={{ width: '100%', mb: 3 }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <CheckIcon sx={{ fontSize: 16, color: '#2563eb' }} />
                      <Typography variant="body2" sx={{ color: '#334155', fontWeight: 600 }}>
                        PDF, DOCX, &amp; Raw Text ingestion
                      </Typography>
                    </Stack>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <CheckIcon sx={{ fontSize: 16, color: '#2563eb' }} />
                      <Typography variant="body2" sx={{ color: '#334155', fontWeight: 600 }}>
                        ATS, Hard Skill &amp; Soft Skill multi-score breakdown
                      </Typography>
                    </Stack>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <CheckIcon sx={{ fontSize: 16, color: '#2563eb' }} />
                      <Typography variant="body2" sx={{ color: '#334155', fontWeight: 600 }}>
                        Automatic QA verification &amp; actionable bullet rewrites
                      </Typography>
                    </Stack>
                  </Stack>

                  {/* Launch Button */}
                  <Button
                    variant="contained"
                    fullWidth
                    endIcon={<ArrowForwardIcon />}
                    sx={{
                      bgcolor: '#2563eb',
                      py: 1.2,
                      borderRadius: 2,
                      fontWeight: 700,
                      boxShadow: 'none',
                    }}
                  >
                    Launch Resume Analyzer (/resume-analyzer)
                  </Button>
                </CardActionArea>
              </Card>
            </Grid>

            {/* Work Module 2: Job Search Agent */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Card
                sx={{
                  height: '100%',
                  borderRadius: 3,
                  border: '2px solid #059669',
                  transition: 'all 0.25s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  boxShadow: '0 8px 30px rgba(5, 150, 105, 0.08)',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 16px 36px rgba(5, 150, 105, 0.16)',
                  },
                }}
              >
                <CardActionArea
                  onClick={() => navigate('/job-search')}
                  sx={{
                    p: 3.5,
                    flexGrow: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    justifyContent: 'flex-start',
                  }}
                >
                  {/* Top Bar */}
                  <Stack
                    direction="row"
                    sx={{ width: '100%', mb: 2, justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <Box
                      sx={{
                        width: 52,
                        height: 52,
                        borderRadius: 2.5,
                        background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        boxShadow: '0 4px 14px rgba(5, 150, 105, 0.35)',
                      }}
                    >
                      <JobIcon sx={{ fontSize: 28 }} />
                    </Box>

                    <Chip
                      icon={<CheckIcon sx={{ fontSize: '14px !important', color: '#10b981 !important' }} />}
                      label="Available Work • Online"
                      size="small"
                      sx={{
                        bgcolor: 'rgba(16, 185, 129, 0.1)',
                        color: '#065f46',
                        fontWeight: 700,
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                      }}
                    />
                  </Stack>

                  {/* Title & Tagline */}
                  <Typography variant="h5" sx={{ fontWeight: 800, mb: 1, color: '#0f172a' }}>
                    Job Search Agent
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#475569', mb: 2.5, lineHeight: 1.6 }}>
                    Autonomous market scout that indexes active roles, evaluates candidate fit scores, flags missing skill keywords, and generates tailored pitches.
                  </Typography>

                  {/* Key Highlights */}
                  <Stack spacing={1} sx={{ width: '100%', mb: 3 }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <CheckIcon sx={{ fontSize: 16, color: '#059669' }} />
                      <Typography variant="body2" sx={{ color: '#334155', fontWeight: 600 }}>
                        Real-time role scoring (e.g. 94% compatibility match)
                      </Typography>
                    </Stack>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <CheckIcon sx={{ fontSize: 16, color: '#059669' }} />
                      <Typography variant="body2" sx={{ color: '#334155', fontWeight: 600 }}>
                        Missing skills gap analysis &amp; salary benchmarks
                      </Typography>
                    </Stack>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <CheckIcon sx={{ fontSize: 16, color: '#059669' }} />
                      <Typography variant="body2" sx={{ color: '#334155', fontWeight: 600 }}>
                        Seamless synergy with Resume Analyzer for tailored applications
                      </Typography>
                    </Stack>
                  </Stack>

                  {/* Launch Button */}
                  <Button
                    variant="contained"
                    fullWidth
                    endIcon={<ArrowForwardIcon />}
                    sx={{
                      bgcolor: '#059669',
                      py: 1.2,
                      borderRadius: 2,
                      fontWeight: 700,
                      boxShadow: 'none',
                      '&:hover': { bgcolor: '#047857' },
                    }}
                  >
                    Launch Job Search Agent (/job-search)
                  </Button>
                </CardActionArea>
              </Card>
            </Grid>
          </Grid>
        </Box>
      </Container>
    </Box>
  );
};
