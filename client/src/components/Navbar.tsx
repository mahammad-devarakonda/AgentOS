import React from 'react';
import {
  AppBar,
  Avatar,
  Box,
  Chip,
  Container,
  IconButton,
  Menu,
  MenuItem,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import WorkspacesIcon from '@mui/icons-material/Workspaces';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import { AgentLogo } from './AgentLogo';
import { useAppDispatch, useAppSelector } from '../store';
import { logoutUser } from '../store/slices/authSlice';
import { useColorMode } from '../theme/ThemeContext';

export const Navbar: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user, workspace } = useAppSelector((state) => state.auth);
  const { mode, toggleColorMode } = useColorMode();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleOpenUserMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseUserMenu = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleCloseUserMenu();
    dispatch(logoutUser());
  };

  return (
    <AppBar
      position="static"
      color="default"
      elevation={1}
      sx={{
        borderBottom: 1,
        borderColor: 'divider',
      }}
    >
      <Container maxWidth="xl">
        <Toolbar disableGutters sx={{ justifyContent: 'space-between' }}>
          <AgentLogo size={32} />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>

            {user && (
              <>
                {workspace && (
                  <Chip
                    icon={<WorkspacesIcon sx={{ fontSize: 16 }} />}
                    label={workspace.name}
                    variant="outlined"
                    size="small"
                    color="primary"
                    sx={{
                      display: { xs: 'none', sm: 'flex' },
                      fontWeight: 500,
                    }}
                  />
                )}

                <IconButton onClick={handleOpenUserMenu} sx={{ p: 0.5 }}>
                  <Avatar
                    sx={{
                      bgcolor: 'secondary.main',
                      width: 36,
                      height: 36,
                      fontSize: '0.95rem',
                      fontWeight: 600,
                    }}
                  >
                    {user.full_name ? user.full_name[0].toUpperCase() : 'U'}
                  </Avatar>
                </IconButton>
                <Menu
                  sx={{ mt: '45px' }}
                  id="menu-appbar"
                  anchorEl={anchorEl}
                  anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                  keepMounted
                  transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                  open={Boolean(anchorEl)}
                  onClose={handleCloseUserMenu}
                  slotProps={{
                    paper: {
                      sx: {
                        minWidth: 220,
                        p: 1,
                      },
                    },
                  }}
                >
                  <Box sx={{ px: 2, py: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {user.full_name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {user.email}
                    </Typography>
                  </Box>
                  <MenuItem>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      Theme
                    </Typography>

                    <Tooltip title={`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`}>
                      <IconButton onClick={toggleColorMode} color="inherit" size="small">
                        {mode === 'dark' ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
                      </IconButton>
                    </Tooltip>
                  </MenuItem>

                  <MenuItem onClick={handleLogout} sx={{ color: 'error.main', mt: 1, borderRadius: 1 }}>
                    <LogoutIcon fontSize="small" sx={{ mr: 1.5 }} />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      Sign Out
                    </Typography>
                  </MenuItem>
                </Menu>
              </>
            )}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
};
