import React, { useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Button,
  Chip,
  Container,
  Stack,
  useTheme,
  IconButton,
  Menu,
  MenuItem,
  useMediaQuery,
} from '@mui/material';
import {
  Hub as HubIcon,
  Description as ResumeIcon,
  TravelExplore as JobIcon,
  DashboardRounded as DashboardIcon,
  HistoryRounded as HistoryIcon,
  Menu as MenuIcon,
  AutoAwesomeRounded as LLMIcon,
} from '@mui/icons-material';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { systemApi, type SystemModelInfo } from '../../services/api';

export const Navbar: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileAnchor, setMobileAnchor] = React.useState<null | HTMLElement>(null);
  const [modelInfo, setModelInfo] = React.useState<SystemModelInfo | null>(null);

  useEffect(() => {
    systemApi.getActiveModel().then((data) => {
      setModelInfo(data);
    });
  }, []);

  const navItems = [
    { label: 'Dashboard', path: '/', icon: <DashboardIcon fontSize="small" /> },
    { label: 'Resume Analyzer', path: '/resume-analyzer', icon: <ResumeIcon fontSize="small" /> },
    { label: 'Job Search Agent', path: '/job-search', icon: <JobIcon fontSize="small" /> },
    { label: 'Execution History', path: '/conversations', icon: <HistoryIcon fontSize="small" /> },
  ];

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        backgroundColor: 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${theme.palette.divider}`,
        color: theme.palette.text.primary,
        zIndex: theme.zIndex.drawer + 1,
      }}
    >
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{ minHeight: { xs: 64, md: 70 }, justifyContent: 'space-between' }}>
          {/* Brand Logo */}
          <Box
            onClick={() => navigate('/')}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 50%, #4338ca 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
              }}
            >
              <HubIcon fontSize="medium" />
            </Box>
            <Box>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 800,
                    fontSize: '1.25rem',
                    letterSpacing: '-0.03em',
                    background: 'linear-gradient(90deg, #1e293b 0%, #2563eb 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  AgentOS
                </Typography>
                <Chip
                  label="v1.0"
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    bgcolor: 'rgba(37, 99, 235, 0.08)',
                    color: '#2563eb',
                    border: '1px solid rgba(37, 99, 235, 0.2)',
                  }}
                />
              </Stack>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontSize: '0.72rem' }}>
                Multi-Agent Career Operating System
              </Typography>
            </Box>
          </Box>

          {/* Desktop Navigation Links */}
          {!isMobile && (
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Button
                    key={item.path}
                    component={NavLink}
                    to={item.path}
                    startIcon={item.icon}
                    sx={{
                      px: 2,
                      py: 0.8,
                      borderRadius: 2,
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? '#2563eb' : '#475569',
                      bgcolor: isActive ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
                      '&:hover': {
                        bgcolor: isActive ? 'rgba(37, 99, 235, 0.12)' : 'rgba(0, 0, 0, 0.04)',
                        color: '#2563eb',
                      },
                    }}
                  >
                    {item.label}
                  </Button>
                );
              })}
            </Stack>
          )}

          {/* Right Status Indicator & Actions */}
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            {/* Active LLM Indicator */}
            <Chip
              icon={<LLMIcon sx={{ fontSize: '13px !important', color: '#2563eb !important' }} />}
              label={`LLM: ${modelInfo?.model || 'llama-3.3-70b-versatile'}`}
              size="small"
              variant="outlined"
              sx={{
                borderColor: 'rgba(37, 99, 235, 0.3)',
                color: '#1d4ed8',
                bgcolor: 'rgba(37, 99, 235, 0.08)',
                fontWeight: 700,
                fontSize: '0.60rem',
                display: { xs: 'none', sm: 'inline-flex' },
                boxShadow: '0 1px 2px rgba(37, 99, 235, 0.05)',
              }}
            />

            {/* Mobile Menu Toggle */}
            {isMobile && (
              <>
                <IconButton
                  onClick={(e) => setMobileAnchor(e.currentTarget)}
                  sx={{ color: 'text.primary', border: '1px solid', borderColor: 'divider' }}
                >
                  <MenuIcon />
                </IconButton>
                <Menu
                  anchorEl={mobileAnchor}
                  open={Boolean(mobileAnchor)}
                  onClose={() => setMobileAnchor(null)}
                  slotProps={{
                    paper: {
                      sx: { width: 220, mt: 1.5, borderRadius: 2, boxShadow: '0 8px 24px rgba(0,0,0,0.1)' },
                    },
                  }}
                >
                  {navItems.map((item) => (
                    <MenuItem
                      key={item.path}
                      onClick={() => {
                        navigate(item.path);
                        setMobileAnchor(null);
                      }}
                      selected={location.pathname === item.path}
                      sx={{ gap: 1.5, py: 1.2 }}
                    >
                      {item.icon}
                      <Typography variant="body2" sx={{ fontWeight: location.pathname === item.path ? 700 : 500 }}>
                        {item.label}
                      </Typography>
                    </MenuItem>
                  ))}
                </Menu>
              </>
            )}
          </Stack>
        </Toolbar>
      </Container>
    </AppBar>
  );
};
