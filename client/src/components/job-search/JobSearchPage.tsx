import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Stack,
  LinearProgress,
  Chip,
  Breadcrumbs,
  Link,
  CircularProgress,
  Divider,
  Paper,
  TextField,
  Grid,
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Description as FileIcon,
  CheckCircle as CheckIcon,
  RadioButtonUnchecked as PendingIcon,
  AutoAwesome as SparklesIcon,
  TravelExplore as SearchIcon,
  Delete as DeleteIcon,
  Hub as HubIcon,
  Work as WorkIcon,
  LocationOn as LocationIcon,
  AttachMoney as MoneyIcon,
  RestartAlt as ResetIcon,
  Psychology as AgentIcon,
  Launch as LaunchIcon,
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  ContentCopy as CopyIcon,
  Check as CopiedIcon,
  FlashOn as BoltIcon,
} from '@mui/icons-material';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { jobSearchApi, systemApi } from '../../services/api';
import type { JobAgentStep, JobPostingItem, JobStreamStepEvent } from '../../types/jobSearch';

const INITIAL_AGENT_STEPS: JobAgentStep[] = [
  {
    id: 'parser',
    name: 'Agent 1: Resume Parser & Profiler',
    role: 'Candidate Profiling & Chunk Indexing',
    description: 'Extracting key technical skills, experience timeline, and indexing resume chunks into Qdrant vector store.',
    status: 'pending',
  },
  {
    id: 'market',
    name: 'Agent 2: Market Query Synthesizer',
    role: 'Search Query Formulation',
    description: 'Constructing high-precision boolean search terms and salary/location market parameters.',
    status: 'pending',
  },
  {
    id: 'discovery',
    name: 'Agent 3: Multi-Board Discovery Agent',
    role: 'Qdrant Vector Retrieval & Live Scanning',
    description: 'Querying Qdrant vector store via dense semantic search (all-MiniLM-L6-v2) and scanning live tech boards.',
    status: 'pending',
  },
  {
    id: 'matcher',
    name: 'Agent 4: ATS Fit & Relevance Matcher',
    role: 'RAG Semantic Evidence Scoring',
    description: 'Evaluating candidate-to-job compatibility using Qdrant vector RAG evidence retrieval and computing match scores.',
    status: 'pending',
  },
  {
    id: 'ranking',
    name: 'Agent 5: Opportunity Ranking Agent',
    role: 'Final Recommendation & Insights',
    description: 'Ranking top job opportunities and generating personalized application strategies.',
    status: 'pending',
  },
];



export const JobSearchPage: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [targetRole, setTargetRole] = useState<string>('');
  const [preferredLocation, setPreferredLocation] = useState<string>('');

  // Agent execution state
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [executionModel, setExecutionModel] = useState<string>('llama-3.3-70b-versatile');
  const [agentSteps, setAgentSteps] = useState<JobAgentStep[]>(INITIAL_AGENT_STEPS);
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [searchCompleted, setSearchCompleted] = useState<boolean>(false);
  const [discoveredJobs, setDiscoveredJobs] = useState<JobPostingItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    systemApi.getActiveModel().then((res) => {
      if (res?.model) setExecutionModel(res.model);
    }).catch(() => { });
  }, []);

  // Liked / Saved jobs state
  const [likedJobIds, setLikedJobIds] = useState<string[]>([]);
  const [filterTab, setFilterTab] = useState<'all' | 'liked'>('all');
  const [copiedJobId, setCopiedJobId] = useState<string | null>(null);

  const toggleLike = (jobId: string) => {
    setLikedJobIds((prev) =>
      prev.includes(jobId) ? prev.filter((id) => id !== jobId) : [...prev, jobId]
    );
  };

  const handleCopyPitch = (job: JobPostingItem) => {
    const pitchText = `Hi ${job.company} Team,\n\nI am applying for the ${job.title} position.\n\n${job.application_tip || job.agent_summary}\n\nKey Competencies: ${job.matched_skills.join(', ')}`;
    navigator.clipboard.writeText(pitchText);
    setCopiedJobId(job.id);
    setTimeout(() => setCopiedJobId(null), 2500);
  };

  // File size formatting helper
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFileSelect = (file: File) => {
    setUploadedFile(file);
    setIsSearching(false);
    setSearchCompleted(false);
    setProgressPercent(0);
    setActiveAgentId(null);
    setAgentSteps(INITIAL_AGENT_STEPS);
    setDiscoveredJobs([]);
    setErrorMessage(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setIsSearching(false);
    setSearchCompleted(false);
    setProgressPercent(0);
    setActiveAgentId(null);
    setAgentSteps(INITIAL_AGENT_STEPS);
    setDiscoveredJobs([]);
    setErrorMessage(null);
  };

  // Trigger Find Jobs multi-agent pipeline
  const handleFindJobs = async () => {
    if (!uploadedFile || isSearching) return;

    setIsSearching(true);
    setSearchCompleted(false);
    setProgressPercent(10);
    setActiveAgentId('parser');
    setErrorMessage(null);

    setAgentSteps(
      INITIAL_AGENT_STEPS.map((step, idx) => ({
        ...step,
        status: idx === 0 ? 'running' : 'pending',
      }))
    );

    try {
      const response = await jobSearchApi.searchJobsFileStream(
        uploadedFile,
        targetRole,
        preferredLocation,
        (event: JobStreamStepEvent) => {
          if (event.type === 'error') {
            setErrorMessage(event.message || 'Job search validation failed.');
            setIsSearching(false);
            setActiveAgentId(null);
            setAgentSteps((prev) =>
              prev.map((s, idx) => (idx === 0 ? { ...s, status: 'pending', details: event.message } : s))
            );
            return;
          }

          if (event.type === 'step_update') {
            if (event.progress !== undefined) {
              setProgressPercent(event.progress);
            }
            if (event.model) {
              setExecutionModel(event.model);
            }

            if (event.agent_id) {
              setActiveAgentId(event.agent_id);
              setAgentSteps((prev =>
                prev.map((s) => {
                  if (s.id === event.agent_id) {
                    return {
                      ...s,
                      status: event.status === 'completed' ? 'completed' : 'running',
                      details: event.detail || s.description,
                      model: event.model || executionModel,
                    };
                  }
                  return s;
                })
              ));
            }
          }

          if (event.type === 'complete' && event.result) {
            setDiscoveredJobs(event.result.discovered_jobs);
            if (event.result.model || event.model) {
              setExecutionModel(event.result.model || event.model || executionModel);
            }
            setProgressPercent(100);
            setIsSearching(false);
            setSearchCompleted(true);
            setActiveAgentId(null);
            setAgentSteps((prev) => prev.map((s) => ({ ...s, status: 'completed' })));
          }
        }
      );

      if (response && response.discovered_jobs) {
        setDiscoveredJobs(response.discovered_jobs);
        setSearchCompleted(true);
        setIsSearching(false);
      }
    } catch (err: any) {
      const errorText = err?.message || 'Failed to process document.';
      setErrorMessage(errorText);
      setIsSearching(false);
      setActiveAgentId(null);
      setAgentSteps((prev) =>
        prev.map((s, idx) => (idx === 0 ? { ...s, status: 'pending', details: errorText } : s))
      );
    }
  };

  const currentRunningAgent = agentSteps.find((s) => s.status === 'running') ||
    agentSteps.find((s) => s.id === activeAgentId) || null;

  return (
    <Box sx={{ minHeight: '100vh', py: 4, bgcolor: 'background.default', color: 'text.primary' }}>
      <Container maxWidth="md">
        {/* Navigation Breadcrumb */}
        <Breadcrumbs sx={{ mb: 2 }}>
          <Link
            component={RouterLink}
            to="/"
            underline="hover"
            color="inherit"
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
          >
            <HubIcon sx={{ fontSize: 16, color: 'primary.main' }} />
            AgentOS Dashboard
          </Link>
          <Typography color="text.primary" sx={{ fontWeight: 600 }}>
            Job Search
          </Typography>
        </Breadcrumbs>

        {/* Page Header */}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{
            mb: 4,
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' },
          }}
        >
          <Box>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 0.5 }}>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>
                Job Search Agent
              </Typography>
              <Chip
                icon={<SparklesIcon sx={{ fontSize: '14px !important' }} />}
                label="Autonomous Hunter"
                size="small"
                sx={{ bgcolor: 'rgba(37, 99, 235, 0.08)', color: '#2563eb', fontWeight: 700 }}
              />
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Upload your resume to dispatch our multi-agent pipeline: parsing, market discovery, relevance ranking, and job match analysis.
            </Typography>
          </Box>

          <Button
            variant="outlined"
            size="small"
            onClick={() => navigate('/resume-analyzer')}
            sx={{ borderRadius: 2, fontWeight: 600 }}
          >
            Switch to Resume Analyzer
          </Button>
        </Stack>

        {errorMessage && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setErrorMessage(null)}>
            {errorMessage}
          </Alert>
        )}

        {/* 1. Resume Upload Card */}
        <Card sx={{ mb: 3, border: '1px solid #e2e8f0', borderRadius: 3 }}>
          <CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
              Step 1: Upload Resume
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
              Upload your resume in PDF, DOCX, or TXT format. Once uploaded, the &quot;Find Jobs&quot; button will be enabled.
            </Typography>

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={handleInputChange}
              style={{ display: 'none' }}
              id="resume-file-input"
            />

            {!uploadedFile ? (
              // Drag & Drop Zone
              <Box
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                sx={{
                  border: '2px dashed',
                  borderColor: isDragging ? 'primary.main' : '#cbd5e1',
                  borderRadius: 2.5,
                  p: { xs: 3, sm: 5 },
                  textAlign: 'center',
                  bgcolor: isDragging ? 'rgba(37, 99, 235, 0.04)' : '#f8fafc',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor: 'primary.main',
                    bgcolor: 'rgba(37, 99, 235, 0.02)',
                  },
                }}
              >
                <Stack spacing={1.5} sx={{ alignItems: 'center' }}>
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: '50%',
                      bgcolor: 'rgba(37, 99, 235, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'primary.main',
                    }}
                  >
                    <CloudUploadIcon sx={{ fontSize: 32 }} />
                  </Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    Click or drag &amp; drop your resume here
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Supports PDF, DOCX, or TXT (Max size 10MB)
                  </Typography>
                  <Button
                    variant="contained"
                    size="small"
                    component="span"
                    sx={{ mt: 1, borderRadius: 2, px: 3 }}
                  >
                    Browse Resume File
                  </Button>
                </Stack>
              </Box>
            ) : (
              // Uploaded File Info Card
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  borderRadius: 2,
                  bgcolor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                }}
              >
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={2}
                  sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
                >
                  <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: 2,
                        bgcolor: '#dcfce7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#15803d',
                      }}
                    >
                      <FileIcon />
                    </Box>
                    <Box>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#166534' }}>
                          {uploadedFile.name}
                        </Typography>
                        <Chip
                          label="Uploaded"
                          size="small"
                          color="success"
                          sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700 }}
                        />
                      </Stack>
                      <Typography variant="caption" sx={{ color: '#15803d' }}>
                        {formatFileSize(uploadedFile.size)} • {uploadedFile.type || 'Document'}
                      </Typography>
                    </Box>
                  </Stack>

                  <Stack direction="row" spacing={1} sx={{ alignSelf: { xs: 'flex-end', sm: 'center' } }}>
                    <Button
                      size="small"
                      color="inherit"
                      onClick={() => fileInputRef.current?.click()}
                      sx={{ fontSize: '0.8rem', color: '#166534' }}
                    >
                      Change
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      startIcon={<DeleteIcon />}
                      onClick={handleRemoveFile}
                      sx={{ fontSize: '0.8rem' }}
                    >
                      Remove
                    </Button>
                  </Stack>
                </Stack>
              </Paper>
            )}

            {/* Optional Preferences */}
            <Box sx={{ mt: 3 }}>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  color: 'text.secondary',
                  display: 'block',
                  mb: 1.5,
                }}
              >
                Optional Search Criteria
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="e.g. AI Engineer, Full-Stack Developer"
                    label="Target Role / Keywords"
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    disabled={isSearching}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="e.g. Remote, San Francisco, New York"
                    label="Preferred Location"
                    value={preferredLocation}
                    onChange={(e) => setPreferredLocation(e.target.value)}
                    disabled={isSearching}
                  />
                </Grid>
              </Grid>

              {/* 24-Hour Freshness Guarantee Notice */}
              <Paper
                elevation={0}
                sx={{
                  p: 1.5,
                  mt: 2.5,
                  borderRadius: 2,
                  bgcolor: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                }}
              >
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    bgcolor: '#d1fae5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#059669',
                    flexShrink: 0,
                  }}
                >
                  <BoltIcon sx={{ fontSize: 20 }} />
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#065f46', fontSize: '0.88rem' }}>
                    Past 24 Hours Filter Active
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#047857', display: 'block', mt: 0.1 }}>
                    Agents strictly crawl LinkedIn with &quot;f_TPR=r86400&quot; to guarantee only vacancies posted within the last 24 hours are delivered.
                  </Typography>
                </Box>
              </Paper>
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* 2. Find Jobs Button */}
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              sx={{ alignItems: 'center', justifyContent: 'space-between' }}
            >
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Step 2: Find Jobs
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {!uploadedFile
                    ? 'Upload your resume above to enable the "Find Jobs" button.'
                    : 'Resume uploaded successfully! Ready to dispatch agents.'}
                </Typography>
              </Box>

              <Button
                variant="contained"
                color="primary"
                size="large"
                disabled={!uploadedFile || isSearching}
                onClick={handleFindJobs}
                startIcon={
                  isSearching ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : (
                    <SearchIcon />
                  )
                }
                sx={{
                  py: 1.2,
                  px: 4,
                  borderRadius: 2.5,
                  fontSize: '1rem',
                  fontWeight: 700,
                  bgcolor: uploadedFile && !isSearching ? '#2563eb' : undefined,
                  boxShadow: uploadedFile && !isSearching ? '0 4px 12px rgba(37,99,235,0.25)' : 'none',
                  '&:hover': {
                    bgcolor: '#1d4ed8',
                  },
                }}
              >
                {isSearching ? 'Agents Searching...' : 'Find Jobs'}
              </Button>
            </Stack>
          </CardContent>
        </Card>

        {/* 3. Progress Bar & Running Agent Indicator */}
        {(isSearching || searchCompleted || progressPercent > 0) && (
          <Card sx={{ mb: 3, border: '1px solid #e2e8f0', borderRadius: 3 }}>
            <CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, mb: 1.5 }}
                spacing={1}
              >
                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                  <AgentIcon sx={{ color: 'primary.main' }} />
                  <Box>
                    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap', mb: 0.5 }}>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        Multi-Agent Search Progress
                      </Typography>
                      <Chip
                        icon={<SparklesIcon sx={{ fontSize: '13px !important', color: '#1d4ed8 !important' }} />}
                        label={`Generated via: ${executionModel}`}
                        size="small"
                        sx={{
                          bgcolor: 'rgba(37, 99, 235, 0.08)',
                          color: '#1d4ed8',
                          border: '1px solid rgba(37, 99, 235, 0.25)',
                          fontWeight: 700,
                          fontSize: '0.72rem',
                          height: 22,
                        }}
                      />
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      {isSearching && currentRunningAgent
                        ? `Running Agent: ${currentRunningAgent.name}`
                        : searchCompleted
                          ? `All 5 agents finished! Matching jobs discovered • LLM: ${executionModel}`
                          : `Agent pipeline initialized with ${executionModel}`}
                    </Typography>
                  </Box>
                </Stack>

                <Chip
                  label={`${progressPercent}% Complete`}
                  color={searchCompleted ? 'success' : isSearching ? 'primary' : 'default'}
                  sx={{ fontWeight: 700 }}
                />
              </Stack>

              {/* Overall Progress Bar */}
              <LinearProgress
                variant="determinate"
                value={progressPercent}
                sx={{
                  height: 10,
                  borderRadius: 5,
                  mb: 3,
                  bgcolor: '#e2e8f0',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 5,
                    bgcolor: searchCompleted ? '#10b981' : '#2563eb',
                    transition: 'transform 0.4s ease',
                  },
                }}
              />

              {/* Active Agent Banner showing which agent is currently running */}
              {isSearching && currentRunningAgent && (
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    mb: 3,
                    borderRadius: 2,
                    bgcolor: '#eff6ff',
                    border: '1px solid #bfdbfe',
                  }}
                >
                  <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                    <CircularProgress size={26} thickness={5} sx={{ color: '#2563eb' }} />
                    <Box sx={{ flexGrow: 1 }}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#1e40af' }}>
                          CURRENTLY RUNNING: {currentRunningAgent.name}
                        </Typography>
                        <Chip
                          label={currentRunningAgent.role}
                          size="small"
                          sx={{ bgcolor: '#dbeafe', color: '#1e40af', fontWeight: 600, height: 20 }}
                        />
                        <Chip
                          icon={<SparklesIcon sx={{ fontSize: '11px !important', color: '#1e40af !important' }} />}
                          label={`LLM: ${executionModel}`}
                          size="small"
                          sx={{ bgcolor: '#bfdbfe', color: '#1e3a8a', fontWeight: 700, height: 20, fontSize: '0.67rem' }}
                        />
                      </Stack>
                      <Typography variant="body2" sx={{ color: '#1e3a8a', mt: 0.5 }}>
                        {currentRunningAgent.details || currentRunningAgent.description}
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>
              )}

              {/* Agent Pipeline Steps List */}
              <Stack spacing={1.5}>
                {agentSteps.map((step) => {
                  const isRunning = step.status === 'running' || step.id === activeAgentId;
                  const isCompleted = step.status === 'completed';

                  return (
                    <Box
                      key={step.id}
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: isRunning
                          ? '#3b82f6'
                          : isCompleted
                            ? '#bbf7d0'
                            : '#e2e8f0',
                        bgcolor: isRunning
                          ? '#f0f7ff'
                          : isCompleted
                            ? '#f0fdf4'
                            : '#f8fafc',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start' }}>
                        <Box sx={{ mt: 0.25 }}>
                          {isRunning ? (
                            <CircularProgress size={20} thickness={5} sx={{ color: '#2563eb' }} />
                          ) : isCompleted ? (
                            <CheckIcon sx={{ color: '#16a34a', fontSize: 22 }} />
                          ) : (
                            <PendingIcon sx={{ color: '#94a3b8', fontSize: 22 }} />
                          )}
                        </Box>

                        <Box sx={{ flexGrow: 1 }}>
                          <Stack
                            direction={{ xs: 'column', sm: 'row' }}
                            spacing={1}
                            sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
                          >
                            <Typography
                              variant="subtitle2"
                              sx={{
                                fontWeight: isRunning ? 800 : 700,
                                color: isRunning
                                  ? '#1d4ed8'
                                  : isCompleted
                                    ? '#15803d'
                                    : 'text.primary',
                              }}
                            >
                              {step.name}
                            </Typography>
                            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                              {(isRunning || isCompleted) && (
                                <Chip
                                  size="small"
                                  icon={<SparklesIcon sx={{ fontSize: '11px !important', color: '#1d4ed8 !important' }} />}
                                  label={step.model || executionModel}
                                  variant="outlined"
                                  sx={{
                                    height: 20,
                                    fontSize: '0.67rem',
                                    fontWeight: 600,
                                    borderColor: 'rgba(37, 99, 235, 0.25)',
                                    color: '#1d4ed8',
                                    bgcolor: 'rgba(37, 99, 235, 0.05)',
                                  }}
                                />
                              )}
                              <Chip
                                size="small"
                                label={isRunning ? 'Running' : isCompleted ? 'Completed' : 'Waiting'}
                                color={isRunning ? 'primary' : isCompleted ? 'success' : 'default'}
                                variant={isRunning || isCompleted ? 'filled' : 'outlined'}
                                sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600, width: 'fit-content' }}
                              />
                            </Stack>
                          </Stack>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            {step.details || step.description}
                          </Typography>
                        </Box>
                      </Stack>
                    </Box>
                  );
                })}
              </Stack>

              {searchCompleted && (
                <Stack direction="row" sx={{ mt: 3, justifyContent: 'flex-end' }}>
                  <Button
                    size="small"
                    startIcon={<ResetIcon />}
                    onClick={handleFindJobs}
                    sx={{ color: 'text.secondary' }}
                  >
                    Run Search Again
                  </Button>
                </Stack>
              )}
            </CardContent>
          </Card>
        )}

        {/* 4. Discovered Job Results (Shown after agents finish) */}
        {searchCompleted && discoveredJobs.length > 0 && (
          <Box sx={{ mb: 4 }}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, mb: 2.5 }}
            >
              <Box>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Typography variant="h5" sx={{ fontWeight: 800 }}>
                    Discovered Opportunities
                  </Typography>
                  <Chip
                    label={`${discoveredJobs.length} Live Matches`}
                    size="small"
                    color="success"
                    sx={{ fontWeight: 700 }}
                  />
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Click &quot;Apply Now&quot; to open the live application, or like jobs to save them to your favorites.
                </Typography>
              </Box>

              {/* Filter Tabs: All vs Liked */}
              <Stack direction="row" spacing={1}>
                <Chip
                  label={`All Matches (${discoveredJobs.length})`}
                  color={filterTab === 'all' ? 'primary' : 'default'}
                  onClick={() => setFilterTab('all')}
                  sx={{ fontWeight: 700, cursor: 'pointer' }}
                />
                <Chip
                  icon={<FavoriteIcon sx={{ fontSize: '15px !important', color: likedJobIds.length > 0 ? '#e11d48 !important' : undefined }} />}
                  label={`Liked (${likedJobIds.length})`}
                  color={filterTab === 'liked' ? 'error' : 'default'}
                  variant={filterTab === 'liked' ? 'filled' : 'outlined'}
                  onClick={() => setFilterTab('liked')}
                  sx={{ fontWeight: 700, cursor: 'pointer' }}
                />
              </Stack>
            </Stack>

            {filterTab === 'liked' && likedJobIds.length === 0 ? (
              <Paper
                elevation={0}
                sx={{
                  p: 4,
                  textAlign: 'center',
                  bgcolor: '#fff1f2',
                  border: '1px dashed #f43f5e',
                  borderRadius: 2.5,
                }}
              >
                <FavoriteIcon sx={{ fontSize: 36, color: '#f43f5e', mb: 1 }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#9f1239' }}>
                  No Liked Jobs Yet
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Click the heart icon on any job card to save it here for easy follow-up.
                </Typography>
                <Button size="small" variant="outlined" color="error" onClick={() => setFilterTab('all')}>
                  View All Matches
                </Button>
              </Paper>
            ) : (
              <Stack spacing={2}>
                {(filterTab === 'liked'
                  ? discoveredJobs.filter((j) => likedJobIds.includes(j.id))
                  : discoveredJobs
                ).map((job) => {
                  const isLiked = likedJobIds.includes(job.id);
                  const isLinkedIn = job.apply_url?.includes('linkedin');
                  const isRemoteOk = job.apply_url?.includes('remoteok');

                  return (
                    <Card
                      key={job.id}
                      sx={{
                        borderRadius: 2.5,
                        border: '1px solid',
                        borderColor: isLiked ? '#fecdd3' : '#e2e8f0',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          borderColor: isLiked ? '#fda4af' : '#93c5fd',
                          boxShadow: '0 4px 16px rgba(37,99,235,0.08)',
                        },
                      }}
                    >
                      <CardContent sx={{ p: 3 }}>
                        <Stack
                          direction={{ xs: 'column', sm: 'row' }}
                          sx={{ justifyContent: 'space-between', alignItems: { sm: 'flex-start' }, mb: 1.5 }}
                          spacing={1}
                        >
                          <Box sx={{ flexGrow: 1 }}>
                            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                {job.title}
                              </Typography>
                              {isLinkedIn && (
                                <Chip
                                  label="LinkedIn"
                                  size="small"
                                  sx={{ bgcolor: '#e8f4f9', color: '#0a66c2', fontWeight: 700, height: 20, fontSize: '0.7rem' }}
                                />
                              )}
                              {isRemoteOk && (
                                <Chip
                                  label="RemoteOK"
                                  size="small"
                                  sx={{ bgcolor: '#ecfdf5', color: '#059669', fontWeight: 700, height: 20, fontSize: '0.7rem' }}
                                />
                              )}
                              <Chip
                                icon={<BoltIcon sx={{ fontSize: '13px !important', color: '#059669 !important' }} />}
                                label={job.posted || 'Past 24h'}
                                size="small"
                                sx={{ bgcolor: '#d1fae5', color: '#065f46', fontWeight: 700, height: 20, fontSize: '0.7rem' }}
                              />
                            </Stack>
                            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, mt: 0.25 }}>
                              {job.company}
                            </Typography>
                          </Box>

                          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                            <Chip
                              label={`${job.match_score}% Match`}
                              color="success"
                              sx={{ fontWeight: 800, fontSize: '0.85rem' }}
                            />

                            {/* Like / Favorite Button */}
                            <Tooltip title={isLiked ? 'Remove from Saved' : 'Like & Save Job'}>
                              <IconButton
                                size="small"
                                onClick={() => toggleLike(job.id)}
                                sx={{
                                  color: isLiked ? '#e11d48' : '#94a3b8',
                                  bgcolor: isLiked ? '#ffe4e6' : '#f8fafc',
                                  border: '1px solid',
                                  borderColor: isLiked ? '#fecdd3' : '#e2e8f0',
                                  '&:hover': {
                                    bgcolor: isLiked ? '#fecdd3' : '#fee2e2',
                                    color: '#e11d48',
                                  },
                                }}
                              >
                                {isLiked ? (
                                  <FavoriteIcon sx={{ fontSize: 20 }} />
                                ) : (
                                  <FavoriteBorderIcon sx={{ fontSize: 20 }} />
                                )}
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </Stack>

                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2, color: 'text.secondary', fontSize: '0.85rem' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <LocationIcon sx={{ fontSize: 16 }} />
                            {job.location}
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <MoneyIcon sx={{ fontSize: 16 }} />
                            {job.salary}
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <WorkIcon sx={{ fontSize: 16 }} />
                            {job.type}
                          </Box>
                        </Box>

                        {/* Matched skills */}
                        {job.matched_skills && job.matched_skills.length > 0 && (
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 0.5 }}>
                              Matched Competencies:
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                              {job.matched_skills.map((skill) => (
                                <Chip
                                  key={skill}
                                  label={skill}
                                  size="small"
                                  sx={{ bgcolor: '#f1f5f9', fontWeight: 600, fontSize: '0.75rem' }}
                                />
                              ))}
                            </Box>
                          </Box>
                        )}

                        {/* Agent Commentary */}
                        {job.agent_summary && (
                          <Paper
                            elevation={0}
                            sx={{
                              p: 1.5,
                              borderRadius: 1.5,
                              bgcolor: '#fafafa',
                              borderLeft: '3px solid #2563eb',
                              mb: job.application_tip ? 1.5 : 0,
                            }}
                          >
                            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5, flexWrap: 'wrap' }}>
                              <Typography variant="caption" sx={{ fontWeight: 700, color: '#1e40af' }}>
                                Agent Evaluation Summary
                              </Typography>
                              <Chip
                                icon={<SparklesIcon sx={{ fontSize: '10px !important', color: '#1e40af !important' }} />}
                                label={`LLM: ${executionModel}`}
                                size="small"
                                sx={{ height: 18, fontSize: '0.62rem', bgcolor: '#dbeafe', color: '#1e40af', fontWeight: 600 }}
                              />
                            </Stack>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                              {job.agent_summary}
                            </Typography>
                          </Paper>
                        )}

                        {/* Application Tip */}
                        {job.application_tip && (
                          <Paper
                            elevation={0}
                            sx={{
                              p: 1.5,
                              borderRadius: 1.5,
                              bgcolor: '#f0fdf4',
                              borderLeft: '3px solid #16a34a',
                              mb: 2,
                            }}
                          >
                            <Typography variant="caption" sx={{ fontWeight: 700, color: '#15803d', display: 'block' }}>
                              AI Application Strategy
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#166534', mt: 0.25 }}>
                              {job.application_tip}
                            </Typography>
                          </Paper>
                        )}

                        {/* Action Buttons: Copy Pitch & Direct Apply Link */}
                        <Divider sx={{ my: 2 }} />

                        <Stack
                          direction={{ xs: 'column', sm: 'row' }}
                          spacing={1.5}
                          sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}
                        >
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={copiedJobId === job.id ? <CopiedIcon /> : <CopyIcon />}
                            onClick={() => handleCopyPitch(job)}
                            sx={{
                              color: copiedJobId === job.id ? 'success.main' : 'text.secondary',
                              borderColor: copiedJobId === job.id ? 'success.main' : '#cbd5e1',
                              fontWeight: 600,
                              borderRadius: 2,
                              fontSize: '0.8rem',
                            }}
                          >
                            {copiedJobId === job.id ? 'Pitch Copied!' : 'Copy Tailored Pitch'}
                          </Button>

                          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                            {job.apply_url && (
                              <Button
                                variant="contained"
                                size="small"
                                endIcon={<LaunchIcon sx={{ fontSize: '15px !important' }} />}
                                component="a"
                                href={job.apply_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                sx={{
                                  borderRadius: 2,
                                  fontWeight: 700,
                                  px: 2.5,
                                  py: 0.75,
                                  bgcolor: isLinkedIn ? '#0a66c2' : isRemoteOk ? '#059669' : '#2563eb',
                                  boxShadow: isLinkedIn
                                    ? '0 2px 8px rgba(10, 102, 194, 0.3)'
                                    : '0 2px 8px rgba(37, 99, 235, 0.3)',
                                  '&:hover': {
                                    bgcolor: isLinkedIn ? '#004182' : isRemoteOk ? '#047857' : '#1d4ed8',
                                  },
                                }}
                              >
                                {isLinkedIn ? 'Apply on LinkedIn' : isRemoteOk ? 'Apply on RemoteOK' : 'Apply Now'}
                              </Button>
                            )}
                          </Stack>
                        </Stack>
                      </CardContent>
                    </Card>
                  );
                })}
              </Stack>
            )}
          </Box>
        )}
      </Container>
    </Box>
  );
};

export default JobSearchPage;
