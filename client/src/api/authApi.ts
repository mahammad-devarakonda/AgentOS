import { apiClient } from './client';
import type { AuthResponse, TokenRefreshResponse, User, Workspace } from '../types/auth';
import type { LoginFormData, RegisterFormData } from '../validation/authSchemas';

export interface MeResponse {
  user: User;
  workspace: Workspace;
}

export interface MessageResponse {
  message: string;
  detail?: string;
}

export const authApi = {
  register: (data: RegisterFormData): Promise<AuthResponse> => {
    return apiClient<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
      skipAuth: true,
    });
  },

  login: (data: LoginFormData): Promise<AuthResponse> => {
    return apiClient<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
      skipAuth: true,
    });
  },

  refresh: (): Promise<TokenRefreshResponse> => {
    return apiClient<TokenRefreshResponse>('/auth/refresh', {
      method: 'POST',
      skipAuth: true,
    });
  },

  logout: (): Promise<MessageResponse> => {
    return apiClient<MessageResponse>('/auth/logout', {
      method: 'POST',
    });
  },

  getMe: (): Promise<MeResponse> => {
    return apiClient<MeResponse>('/auth/me', {
      method: 'GET',
    });
  },

  forgotPassword: (email: string): Promise<MessageResponse> => {
    return apiClient<MessageResponse>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
      skipAuth: true,
    });
  },
};
