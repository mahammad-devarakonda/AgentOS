import React, { useState } from 'react';
import { Box, Paper, Typography, Stack, Chip, Button } from '@mui/material';
import {
  Hub as HubIcon,
  Description as ParserIcon,
  Psychology as ExtractorIcon,
  Assessment as ScoringIcon,
  VerifiedUser as VerifierIcon,
  TravelExplore as JobIcon,
  PlayArrow as PlayIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';

interface AgentNode {
  id: string;
  name: string;
  role: string;
  engine: string;
  status: 'Online' | 'Ready' | 'Active';
  color: string;
  x: number; // percentage
  y: number; // percentage
  icon: React.ReactNode;
  description: string;
  details: string[];
}

export const AgentNetworkVisual: React.FC = () => {
  const [selectedAgentId, setSelectedAgentId] = useState<string>('os-kernel');
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);

  const agents: AgentNode[] = [
    {
      id: 'os-kernel',
      name: 'Agent OS Core Kernel',
      role: 'Master Orchestration & Graph Router',
      engine: 'LangGraph StateGraph + FastAPI Router',
      status: 'Active',
      color: '#2563eb',
      x: 50,
      y: 50,
      icon: <HubIcon sx={{ fontSize: 28 }} />,
      description:
        'The central nervous system of Agent OS. Dispatches state payloads, monitors asynchronous sub-agent status, evaluates QA threshold conditions, and guarantees reliable routing.',
      details: [
        'Centralized state management with immutable transitions',
        'Automatic condition checking (e.g. Score < 90 re-route)',
        'Model fallbacks & sub-second async HTTPX streaming',
      ],
    },
    {
      id: 'parser-agent',
      name: 'Document Ingestion Agent',
      role: 'Multi-Format Text & Layout Normalizer',
      engine: 'PDFMiner / PyPDF / Docx Parser',
      status: 'Online',
      color: '#0284c7',
      x: 18,
      y: 24,
      icon: <ParserIcon sx={{ fontSize: 24 }} />,
      description:
        'Ingests unstructured documents in PDF, DOCX, and TXT formats. Normalizes multi-column layouts, removes formatting artifacts, and passes pristine clean text to downstream extractors.',
      details: [
        'Multi-encoding fallback (UTF-8, Latin-1, CP1252)',
        'Header/footer de-duplication and table text extraction',
        'Clean text validation guarantees zero token corruption',
      ],
    },
    {
      id: 'extractor-agent',
      name: 'Profile Extractor Agent',
      role: 'Structured Profile & Taxonomy Mapping',
      engine: 'Groq Llama-3.3-70b + Pydantic v2',
      status: 'Online',
      color: '#0d9488',
      x: 82,
      y: 24,
      icon: <ExtractorIcon sx={{ fontSize: 24 }} />,
      description:
        'Extracts structured candidate data into typed schemas: candidate identity, technical competencies, chronological work experience, quantifiable impact, and education.',
      details: [
        'Strict Pydantic v2 schema enforcement',
        'Industry standard taxonomy mapping for 1,500+ skills',
        'Quantifiable impact metrics isolation (%, $, growth)',
      ],
    },
    {
      id: 'scoring-agent',
      name: 'ATS Match & Scoring Agent',
      role: 'Comprehensive Evaluation & Gap Detection',
      engine: 'Vector Alignment + Role Criteria Matrix',
      status: 'Online',
      color: '#7c3aed',
      x: 18,
      y: 76,
      icon: <ScoringIcon sx={{ fontSize: 24 }} />,
      description:
        'Computes dimensional scores across ATS Readiness, Hard Skill Alignment, Soft Skill Balance, and Bullet Quality. Pinpoints missing role requirements with mathematical precision.',
      details: [
        'Overall compatibility score from 0 to 100',
        'Weighted criteria: 40% hard skills, 30% impact, 30% ATS',
        'Triggers automated self-healing QA branch if score < 90',
      ],
    },
    {
      id: 'verifier-agent',
      name: 'QA Verification & Audit Agent',
      role: 'Self-Healing Hallucination & Quality Guard',
      engine: 'Automated Audit Loop (Score < 90)',
      status: 'Ready',
      color: '#e11d48',
      x: 82,
      y: 76,
      icon: <VerifierIcon sx={{ fontSize: 24 }} />,
      description:
        'Autonomous quality assurance guard. When any analysis score drops below 90, this agent automatically intervenes to re-audit suggestions, eliminate hallucinations, and refine advice.',
      details: [
        'Autonomous self-healing loop without human intervention',
        'Hallucination prevention & factual consistency verification',
        'Generates actionable rewrites before releasing final payload',
      ],
    },
    {
      id: 'job-agent',
      name: 'Autonomous Job Scout Agent',
      role: 'Market Intelligence & Opportunity Matcher',
      engine: 'Semantic Discovery & Market Indexing',
      status: 'Active',
      color: '#f59e0b',
      x: 50,
      y: 92,
      icon: <JobIcon sx={{ fontSize: 24 }} />,
      description:
        'Scours job markets, parses job descriptions, calculates candidate compatibility index, and matches applicants with top-fit roles tailored to their exact strengths.',
      details: [
        'Real-time skill gap analysis per job requisition',
        'Compensation range and role seniority estimation',
        'One-click sync with Resume Analyzer for targeted pitches',
      ],
    },
  ];

  const selectedAgent = agents.find((a) => a.id === selectedAgentId) || agents[0];

  const handleSimulate = () => {
    if (isSimulating) return;
    setIsSimulating(true);
    const flowOrder = ['parser-agent', 'extractor-agent', 'scoring-agent', 'verifier-agent', 'job-agent', 'os-kernel'];
    let step = 0;
    const interval = setInterval(() => {
      setSelectedAgentId(flowOrder[step]);
      setActiveStepIndex(step);
      step++;
      if (step >= flowOrder.length) {
        clearInterval(interval);
        setTimeout(() => setIsSimulating(false), 800);
      }
    }, 1200);
  };

  return (
    <Box sx={{ width: '100%', my: 2 }}>
      {/* Simulation Trigger Bar */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{
          mb: 2,
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
        }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Interactive Multi-Agent Topology
          </Typography>
          <Chip label="Click any node to inspect" size="small" sx={{ fontSize: '0.68rem', height: 20 }} />
        </Stack>

        <Button
          size="small"
          variant="outlined"
          startIcon={<PlayIcon />}
          onClick={handleSimulate}
          disabled={isSimulating}
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600,
            color: '#2563eb',
            borderColor: '#2563eb',
          }}
        >
          {isSimulating ? `Simulating Flow Step ${activeStepIndex + 1}/6...` : 'Simulate Agent Pipeline'}
        </Button>
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '1.2fr 0.8fr' },
          gap: 3,
          alignItems: 'stretch',
        }}
      >
        {/* Interactive SVG / Graphic Canvas */}
        <Paper
          elevation={0}
          sx={{
            position: 'relative',
            height: { xs: 380, sm: 460 },
            borderRadius: 4,
            overflow: 'hidden',
            background: 'radial-gradient(ellipse at center, #1e293b 0%, #0f172a 100%)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 20px 40px rgba(15, 23, 42, 0.25)',
            userSelect: 'none',
          }}
        >
          {/* Subtle Grid Background */}
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              backgroundImage:
                'linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px)',
              backgroundSize: '28px 28px',
              opacity: 0.8,
            }}
          />

          {/* SVG Connection Lines */}
          <svg
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
            }}
          >
            <defs>
              <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.6" />
                <stop offset="50%" stopColor="#818cf8" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#c084fc" stopOpacity="0.6" />
              </linearGradient>
            </defs>

            {/* Hub to Nodes Lines */}
            <line x1="50%" y1="50%" x2="18%" y2="24%" stroke="url(#lineGrad)" strokeWidth="2" strokeDasharray="5,5" />
            <line x1="50%" y1="50%" x2="82%" y2="24%" stroke="url(#lineGrad)" strokeWidth="2" strokeDasharray="5,5" />
            <line x1="50%" y1="50%" x2="18%" y2="76%" stroke="url(#lineGrad)" strokeWidth="2" strokeDasharray="5,5" />
            <line x1="50%" y1="50%" x2="82%" y2="76%" stroke="url(#lineGrad)" strokeWidth="2" strokeDasharray="5,5" />
            <line x1="50%" y1="50%" x2="50%" y2="92%" stroke="url(#lineGrad)" strokeWidth="2" strokeDasharray="5,5" />

            {/* Peripheral connection: Parser to Extractor */}
            <path d="M 18% 24% Q 50% 12% 82% 24%" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
            {/* Extractor to Scoring */}
            <path d="M 82% 24% Q 90% 50% 82% 76%" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
            {/* Scoring to Verifier Loop */}
            <path d="M 18% 76% Q 50% 84% 82% 76%" fill="none" stroke="rgba(244,63,94,0.4)" strokeWidth="2" strokeDasharray="3,3" />
          </svg>

          {/* Interactive Agent Nodes */}
          {agents.map((agent) => {
            const isSelected = selectedAgentId === agent.id;
            const isCenter = agent.id === 'os-kernel';

            return (
              <Box
                key={agent.id}
                onClick={() => setSelectedAgentId(agent.id)}
                sx={{
                  position: 'absolute',
                  left: `${agent.x}%`,
                  top: `${agent.y}%`,
                  transform: 'translate(-50%, -50%)',
                  cursor: 'pointer',
                  zIndex: isSelected ? 10 : 2,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    transform: 'translate(-50%, -50%) scale(1.12)',
                  },
                }}
              >
                {/* Glowing Outer Ring */}
                <Box
                  sx={{
                    width: isCenter ? 72 : 56,
                    height: isCenter ? 72 : 56,
                    borderRadius: '50%',
                    bgcolor: agent.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    boxShadow: isSelected
                      ? `0 0 28px ${agent.color}, 0 0 10px #fff`
                      : `0 4px 16px rgba(0, 0, 0, 0.4)`,
                    border: isSelected ? '3px solid #ffffff' : '2px solid rgba(255, 255, 255, 0.3)',
                    transition: 'all 0.3s ease',
                  }}
                >
                  {agent.icon}
                </Box>

                {/* Node Label */}
                <Paper
                  elevation={0}
                  sx={{
                    mt: 0.8,
                    px: 1.2,
                    py: 0.3,
                    borderRadius: 1.5,
                    bgcolor: isSelected ? 'rgba(255, 255, 255, 0.95)' : 'rgba(15, 23, 42, 0.85)',
                    color: isSelected ? '#0f172a' : '#cbd5e1',
                    border: `1px solid ${isSelected ? agent.color : 'rgba(255, 255, 255, 0.15)'}`,
                    backdropFilter: 'blur(4px)',
                    whiteSpace: 'nowrap',
                    textAlign: 'center',
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 700,
                      fontSize: { xs: '0.62rem', sm: '0.72rem' },
                      display: 'block',
                      lineHeight: 1.2,
                    }}
                  >
                    {agent.name}
                  </Typography>
                </Paper>
              </Box>
            );
          })}
        </Paper>

        {/* Selected Agent Inspector Panel */}
        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: 4,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 4px 20px rgba(15, 23, 42, 0.05)',
          }}
        >
          <Box>
            {/* Header */}
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2 }}>
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 2.5,
                  bgcolor: selectedAgent.color,
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: `0 4px 12px ${selectedAgent.color}40`,
                }}
              >
                {selectedAgent.icon}
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                  {selectedAgent.name}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                  {selectedAgent.role}
                </Typography>
              </Box>
            </Stack>

            {/* Badges */}
            <Stack direction="row" spacing={1} sx={{ mb: 2.5, flexWrap: 'wrap', gap: 0.8 }}>
              <Chip
                label={`Status: ${selectedAgent.status}`}
                size="small"
                sx={{
                  bgcolor: 'rgba(16, 185, 129, 0.1)',
                  color: '#065f46',
                  fontWeight: 700,
                  fontSize: '0.72rem',
                }}
              />
              <Chip
                label={selectedAgent.engine}
                size="small"
                sx={{
                  bgcolor: 'rgba(37, 99, 235, 0.08)',
                  color: '#2563eb',
                  fontWeight: 600,
                  fontSize: '0.72rem',
                }}
              />
            </Stack>

            {/* Description */}
            <Typography variant="body2" sx={{ color: '#334155', lineHeight: 1.6, mb: 2.5 }}>
              {selectedAgent.description}
            </Typography>

            {/* Capabilities List */}
            <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', letterSpacing: '0.04em', display: 'block', mb: 1 }}>
              KEY ARCHITECTURAL HIGHLIGHTS
            </Typography>
            <Stack spacing={1}>
              {selectedAgent.details.map((detail, idx) => (
                <Stack key={idx} direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
                  <CheckIcon sx={{ fontSize: 16, color: '#10b981', mt: 0.3 }} />
                  <Typography variant="body2" sx={{ color: '#475569', fontSize: '0.82rem', lineHeight: 1.4 }}>
                    {detail}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </Box>

          {/* Footer note */}
          <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
              ⚡ Coordinated via asynchronous graph pipelines with LangGraph &amp; sub-second LLM inference.
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};
