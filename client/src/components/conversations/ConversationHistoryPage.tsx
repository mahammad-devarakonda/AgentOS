import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Stack,
  Button,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  InputAdornment,
  Chip,
} from '@mui/material';
import {
  RefreshRounded as RefreshIcon,
  TokenRounded as TokenIcon,
  DescriptionRounded as ResumeIcon,
  TravelExploreRounded as JobIcon,
  DeleteOutlineRounded as DeleteIcon,
  DeleteForeverRounded as ClearAllIcon,
  SearchRounded as SearchIcon,
  HistoryRounded as HistoryIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { conversationApi } from '../../services/api';
import type {
  ConversationAnalyticsItem,
  ConversationAnalyticsResponse,
} from '../../types/conversation';
import { HistoryKpiCards } from './HistoryKpiCards';
import { HistoryList } from './HistoryList';
import { ResumeExecutionDetail } from './ResumeExecutionDetail';
import { JobSearchExecutionDetail } from './JobSearchExecutionDetail';
import { AuditTraceView } from './AuditTraceView';
import { RawPayloadView } from './RawPayloadView';

export const ConversationHistoryPage: React.FC = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ConversationAnalyticsResponse | null>(null);
  const [selectedAgentTab, setSelectedAgentTab] = useState<string>('all');
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [detailTab, setDetailTab] = useState<number>(0);

  // Dialog states
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [clearAllConfirmOpen, setClearAllConfirmOpen] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  const fetchConversations = async (preserveSelectedId?: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await conversationApi.getResumeAndJobsConversations();
      setData(res);

      if (res.conversations.length > 0) {
        const targetId = preserveSelectedId || selectedConvId;
        const exists = res.conversations.some((c) => c.id === targetId);
        setSelectedConvId(exists ? (targetId as string) : res.conversations[0].id);
      } else {
        setSelectedConvId(null);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load execution history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  const handleDeleteItem = async () => {
    if (!deleteConfirmId) return;
    try {
      setActionLoading(true);
      await conversationApi.deleteConversation(deleteConfirmId);
      setDeleteConfirmId(null);
      await fetchConversations();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete history record.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleClearAll = async () => {
    try {
      setActionLoading(true);
      await conversationApi.clearAllConversations();
      setClearAllConfirmOpen(false);
      await fetchConversations();
    } catch (err: any) {
      setError(err?.message || 'Failed to clear history.');
    } finally {
      setActionLoading(false);
    }
  };

  // Filter conversations
  const filteredConversations = (data?.conversations || []).filter((conv) => {
    if (selectedAgentTab !== 'all' && conv.agent_type !== selectedAgentTab) {
      return false;
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const titleMatch = (conv.title || '').toLowerCase().includes(q);
    const candidateName = (conv.metadata?.extracted_profile?.full_name || '').toLowerCase().includes(q);
    const targetRole = (conv.metadata?.target_role || '').toLowerCase().includes(q);
    const filename = (conv.metadata?.filename || '').toLowerCase().includes(q);
    return titleMatch || candidateName || targetRole || filename;
  });

  const selectedConversation: ConversationAnalyticsItem | undefined =
    (data?.conversations || []).find((c) => c.id === selectedConvId) || filteredConversations[0];

  const formatTokens = (val: number | undefined) => (val ?? 0).toLocaleString();

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const getAgentBadge = (agentType: string) => {
    if (agentType === 'resume_analyzer') {
      return {
        label: 'Resume Analyzer',
        bg: 'rgba(99, 102, 241, 0.1)',
        color: '#4f46e5',
        border: 'rgba(99, 102, 241, 0.3)',
      };
    }
    return {
      label: 'Job Search Agent',
      bg: 'rgba(16, 185, 129, 0.1)',
      color: '#059669',
      border: 'rgba(16, 185, 129, 0.3)',
    };
  };

  return (
    <Box sx={{ py: 4, minHeight: 'calc(100vh - 70px)', backgroundColor: '#f8fafc' }}>
      <Container maxWidth="xl">
        {/* Header Section */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', md: 'center' },
            gap: 2,
            mb: 4,
          }}
        >
          <Box>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 0.5 }}>
              <Box
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                }}
              >
                <HistoryIcon fontSize="medium" />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#0f172a' }}>
                Execution History & Token Analytics
              </Typography>
            </Stack>
            <Typography variant="body1" sx={{ color: '#64748b' }}>
              Historical archive of all executions conducted on <strong>Resume Analyzer</strong> and{' '}
              <strong>Job Search Agent</strong>, including token consumption and full analysis reports.
            </Typography>
          </Box>

          <Stack direction="row" spacing={1.5}>
            <Button
              variant="outlined"
              color="error"
              startIcon={<ClearAllIcon />}
              onClick={() => setClearAllConfirmOpen(true)}
              disabled={loading || (data?.conversations || []).length === 0}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
            >
              Clear All History
            </Button>
            <Button
              variant="outlined"
              startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
              onClick={() => fetchConversations(selectedConvId || undefined)}
              disabled={loading}
              sx={{
                borderRadius: 2,
                borderColor: '#cbd5e1',
                color: '#334155',
                textTransform: 'none',
                fontWeight: 600,
                '&:hover': { borderColor: '#94a3b8', backgroundColor: '#f1f5f9' },
              }}
            >
              Refresh Data
            </Button>
          </Stack>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        {/* Aggregate KPI Metric Cards */}
        <HistoryKpiCards data={data} />

        {/* Filter Tabs & Search Bar */}
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          sx={{ justifyContent: 'space-between', alignItems: { md: 'center' }, mb: 3 }}
        >
          <Paper
            elevation={0}
            sx={{
              p: 0.5,
              borderRadius: 2.5,
              border: '1px solid #e2e8f0',
              backgroundColor: '#ffffff',
              display: 'inline-block',
            }}
          >
            <Tabs
              value={selectedAgentTab}
              onChange={(_, val) => setSelectedAgentTab(val)}
              textColor="primary"
              indicatorColor="primary"
              sx={{ minHeight: 40 }}
            >
              <Tab
                value="all"
                label={`All History (${data?.total_conversations ?? 0})`}
                sx={{ textTransform: 'none', fontWeight: 600, minHeight: 40, px: 2.5 }}
              />
              <Tab
                value="resume_analyzer"
                icon={<ResumeIcon sx={{ fontSize: 16 }} />}
                iconPosition="start"
                label={`Resume Analyzer (${data?.breakdown_by_agent?.resume_analyzer?.conversation_count ?? 0})`}
                sx={{ textTransform: 'none', fontWeight: 600, minHeight: 40, px: 2.5 }}
              />
              <Tab
                value="job_search"
                icon={<JobIcon sx={{ fontSize: 16 }} />}
                iconPosition="start"
                label={`Job Search (${data?.breakdown_by_agent?.job_search?.conversation_count ?? 0})`}
                sx={{ textTransform: 'none', fontWeight: 600, minHeight: 40, px: 2.5 }}
              />
            </Tabs>
          </Paper>

          <TextField
            size="small"
            placeholder="Search by role, candidate, or file..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" sx={{ color: '#94a3b8' }} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{
              minWidth: { xs: '100%', md: 280 },
              bgcolor: '#ffffff',
              '& .MuiOutlinedInput-root': { borderRadius: 2.5 },
            }}
          />
        </Stack>

        {/* Main Split Layout: Left List, Right Detailed Report */}
        <Grid container spacing={3}>
          {/* Left Column: History Items List */}
          <Grid size={{ xs: 12, md: 4.5 }}>
            <HistoryList
              conversations={filteredConversations}
              selectedId={selectedConversation?.id || null}
              loading={loading}
              onSelect={(id) => setSelectedConvId(id)}
              onDeleteRequest={(id) => setDeleteConfirmId(id)}
              onNavigateResume={() => navigate('/resume-analyzer')}
              onNavigateJobSearch={() => navigate('/job-search')}
            />
          </Grid>

          {/* Right Column: Execution History Detail Report */}
          <Grid size={{ xs: 12, md: 7.5 }}>
            {selectedConversation ? (
              <Stack spacing={2.5}>
                {/* Active History Header Banner */}
                <Paper
                  elevation={0}
                  sx={{
                    p: 2.5,
                    borderRadius: 3,
                    border: '1px solid #e2e8f0',
                    backgroundColor: '#ffffff',
                  }}
                >
                  <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { sm: 'flex-start' }, mb: 1.5, gap: 1 }}>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>
                        {selectedConversation.title}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748b' }}>
                        Execution ID: <code style={{ color: '#4f46e5' }}>{selectedConversation.id}</code> • Recorded{' '}
                        {formatDate(selectedConversation.created_at)}
                      </Typography>
                    </Box>

                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <Chip
                        label={
                          selectedConversation.agent_type === 'resume_analyzer'
                            ? 'Resume Analyzer'
                            : 'Job Search Multi-Agent'
                        }
                        sx={{
                          fontWeight: 700,
                          ...getAgentBadge(selectedConversation.agent_type),
                        }}
                      />
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => setDeleteConfirmId(selectedConversation.id)}
                        sx={{ border: '1px solid #fecaca', bgcolor: '#fff' }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Stack>

                  {/* Token usage summary bar */}
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 1.5,
                      alignItems: 'center',
                    }}
                  >
                    <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center' }}>
                      <TokenIcon sx={{ color: '#d97706', fontSize: 18 }} />
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#334155' }}>
                        Token Usage:
                      </Typography>
                    </Stack>
                    <Chip
                      label={`Total: ${formatTokens(selectedConversation.token_usage?.total_tokens)} tokens`}
                      size="small"
                      sx={{ bgcolor: '#fef3c7', color: '#92400e', fontWeight: 700 }}
                    />
                    <Chip
                      label={`Prompt: ${formatTokens(selectedConversation.token_usage?.prompt_tokens)}`}
                      size="small"
                      sx={{ bgcolor: '#eff6ff', color: '#1d4ed8', fontWeight: 600 }}
                    />
                    <Chip
                      label={`Completion: ${formatTokens(selectedConversation.token_usage?.completion_tokens)}`}
                      size="small"
                      sx={{ bgcolor: '#ecfdf5', color: '#047857', fontWeight: 600 }}
                    />

                    <Box sx={{ ml: 'auto' }}>
                      <Button
                        size="small"
                        variant="text"
                        startIcon={selectedConversation.agent_type === 'resume_analyzer' ? <ResumeIcon /> : <JobIcon />}
                        onClick={() =>
                          navigate(selectedConversation.agent_type === 'resume_analyzer' ? '/resume-analyzer' : '/job-search')
                        }
                        sx={{ textTransform: 'none', fontWeight: 700, color: '#4f46e5' }}
                      >
                        Switch to {selectedConversation.agent_type === 'resume_analyzer' ? 'Resume Analyzer' : 'Job Search'}
                      </Button>
                    </Box>
                  </Box>

                  {/* Tabs for Detail View */}
                  <Box sx={{ borderBottom: 1, borderColor: 'divider', mt: 2 }}>
                    <Tabs
                      value={detailTab}
                      onChange={(_, v) => setDetailTab(v)}
                      textColor="primary"
                      indicatorColor="primary"
                      sx={{ minHeight: 40 }}
                    >
                      <Tab label="Execution Report" sx={{ textTransform: 'none', fontWeight: 700, minHeight: 40 }} />
                      <Tab label="Multi-Agent Audit Trace" sx={{ textTransform: 'none', fontWeight: 700, minHeight: 40 }} />
                      <Tab label="Raw Payload / JSON" sx={{ textTransform: 'none', fontWeight: 700, minHeight: 40 }} />
                    </Tabs>
                  </Box>
                </Paper>

                {/* Tab 0: Execution Report */}
                {detailTab === 0 && (
                  selectedConversation.agent_type === 'resume_analyzer' ? (
                    <ResumeExecutionDetail conversation={selectedConversation} />
                  ) : (
                    <JobSearchExecutionDetail conversation={selectedConversation} />
                  )
                )}

                {/* Tab 1: Audit Trace */}
                {detailTab === 1 && <AuditTraceView conversation={selectedConversation} />}

                {/* Tab 2: Raw Payload */}
                {detailTab === 2 && <RawPayloadView conversation={selectedConversation} />}
              </Stack>
            ) : (
              <Paper
                elevation={0}
                sx={{
                  p: 8,
                  textAlign: 'center',
                  borderRadius: 3,
                  border: '1px solid #e2e8f0',
                  bgcolor: '#ffffff',
                  color: '#94a3b8',
                }}
              >
                <HistoryIcon sx={{ fontSize: 56, mb: 1.5, opacity: 0.4 }} />
                <Typography variant="h6" sx={{ color: '#475569', fontWeight: 700 }}>
                  Select an Execution Record
                </Typography>
                <Typography variant="body2">
                  Choose any past Resume Analysis or Job Search from the left to view candidate details, scores, and recommendations.
                </Typography>
              </Paper>
            )}
          </Grid>
        </Grid>
      </Container>

      {/* Delete Single Record Confirmation Dialog */}
      <Dialog
        open={Boolean(deleteConfirmId)}
        onClose={() => setDeleteConfirmId(null)}
        slotProps={{ paper: { sx: { borderRadius: 3, p: 1 } } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Delete Execution History Record?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to permanently delete this execution record from the history archive? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteConfirmId(null)} disabled={actionLoading} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteItem}
            color="error"
            variant="contained"
            disabled={actionLoading}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
          >
            {actionLoading ? <CircularProgress size={16} /> : 'Delete Record'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Clear All History Confirmation Dialog */}
      <Dialog
        open={clearAllConfirmOpen}
        onClose={() => setClearAllConfirmOpen(false)}
        slotProps={{ paper: { sx: { borderRadius: 3, p: 1 } } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#dc2626' }}>Clear Entire Execution History?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will permanently remove all stored execution records, candidate evaluation reports, job search histories, and audit step logs across all agents.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setClearAllConfirmOpen(false)} disabled={actionLoading} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            onClick={handleClearAll}
            color="error"
            variant="contained"
            disabled={actionLoading}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
          >
            {actionLoading ? <CircularProgress size={16} /> : 'Clear Everything'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ConversationHistoryPage;
