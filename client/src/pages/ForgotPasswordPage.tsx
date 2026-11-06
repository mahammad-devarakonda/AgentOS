import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Link as MuiLink,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EmailIcon from '@mui/icons-material/Email';
import { Link as RouterLink } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AgentLogo } from '../components/AgentLogo';
import { authApi } from '../api/authApi';
import type { ForgotPasswordFormData } from '../validation/authSchemas';
import { forgotPasswordSchema } from '../validation/authSchemas';

export const ForgotPasswordPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const response = await authApi.forgotPassword(data.email);
      setSuccessMessage(
        response.message ||
          'If an account with this email exists, password reset instructions have been sent.'
      );
    } catch (err) {
      const error = err as Error;
      setErrorMessage(error.message || 'Failed to request password reset');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle at 50% 10%, #15213F 0%, #070B14 100%)',
        p: 2,
      }}
    >
      <Container maxWidth="xs">
        <Paper
          elevation={4}
          sx={{
            p: { xs: 3, sm: 5 },
            borderRadius: 3,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6), 0 0 40px rgba(0, 229, 255, 0.05)',
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
            <AgentLogo size={42} />
            <Typography variant="h5" sx={{ mt: 2, fontWeight: 700, color: 'text.primary' }}>
              Reset Password
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5, textAlign: 'center' }}>
              Enter your email address and we'll send you recovery instructions.
            </Typography>
          </Box>

          {errorMessage && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setErrorMessage(null)}>
              {errorMessage}
            </Alert>
          )}

          {successMessage ? (
            <Box sx={{ textAlign: 'center' }}>
              <Alert severity="success" sx={{ mb: 3 }}>
                {successMessage}
              </Alert>
              <Button
                component={RouterLink}
                to="/login"
                variant="outlined"
                fullWidth
                startIcon={<ArrowBackIcon />}
                sx={{ mt: 1 }}
              >
                Back to Sign In
              </Button>
            </Box>
          ) : (
            <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
              <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label="Email Address"
                type="email"
                autoComplete="email"
                autoFocus
                {...register('email')}
                error={!!errors.email}
                helperText={errors.email?.message}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                startIcon={
                  loading ? <CircularProgress size={20} color="inherit" /> : <EmailIcon />
                }
                sx={{
                  mt: 3,
                  mb: 2,
                  py: 1.5,
                  background: 'linear-gradient(90deg, #00E5FF 0%, #7C4DFF 100%)',
                  color: '#070B14',
                  fontWeight: 700,
                  fontSize: '1rem',
                }}
              >
                {loading ? 'Sending Instructions...' : 'Send Recovery Link'}
              </Button>

              <Box sx={{ textAlign: 'center', mt: 2 }}>
                <MuiLink
                  component={RouterLink}
                  to="/login"
                  sx={{
                    color: 'text.secondary',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.5,
                    fontSize: '0.875rem',
                    textDecoration: 'none',
                    '&:hover': { color: 'primary.main' },
                  }}
                >
                  <ArrowBackIcon fontSize="small" /> Back to Sign In
                </MuiLink>
              </Box>
            </Box>
          )}
        </Paper>
      </Container>
    </Box>
  );
};
