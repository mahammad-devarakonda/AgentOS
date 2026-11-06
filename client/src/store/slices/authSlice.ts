import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { authApi } from '../../api/authApi';
import { clearAccessToken, setAccessToken } from '../../api/tokenStorage';
import type { AuthResponse, AuthState, User, Workspace } from '../../types/auth';
import type { LoginFormData, RegisterFormData } from '../../validation/authSchemas';

const initialState: AuthState = {
  user: null,
  workspace: null,
  isAuthenticated: false,
  loading: false,
  initialized: false,
  error: null,
};

// Async thunk: Register
export const registerUser = createAsyncThunk<
  AuthResponse,
  RegisterFormData,
  { rejectValue: string }
>('auth/register', async (formData, { rejectWithValue }) => {
  try {
    const data = await authApi.register(formData);
    setAccessToken(data.access_token);
    return data;
  } catch (error) {
    const err = error as Error;
    return rejectWithValue(err.message || 'Registration failed');
  }
});

// Async thunk: Login
export const loginUser = createAsyncThunk<
  AuthResponse,
  LoginFormData,
  { rejectValue: string }
>('auth/login', async (formData, { rejectWithValue }) => {
  try {
    const data = await authApi.login(formData);
    setAccessToken(data.access_token);
    return data;
  } catch (error) {
    const err = error as Error;
    return rejectWithValue(err.message || 'Login failed');
  }
});

// Async thunk: Refresh Token & Hydrate Session
export const refreshAuth = createAsyncThunk<
  { user: User; workspace: Workspace; access_token: string },
  void,
  { rejectValue: string }
>('auth/refresh', async (_, { rejectWithValue }) => {
  try {
    const refreshData = await authApi.refresh();
    setAccessToken(refreshData.access_token);
    const meData = await authApi.getMe();
    return {
      user: meData.user,
      workspace: meData.workspace,
      access_token: refreshData.access_token,
    };
  } catch (error) {
    clearAccessToken();
    const err = error as Error;
    return rejectWithValue(err.message || 'Failed to refresh session');
  }
});

// Async thunk: Get Current User
export const fetchCurrentUser = createAsyncThunk<
  { user: User; workspace: Workspace },
  void,
  { rejectValue: string }
>('auth/getMe', async (_, { rejectWithValue }) => {
  try {
    const data = await authApi.getMe();
    return data;
  } catch (error) {
    const err = error as Error;
    return rejectWithValue(err.message || 'Failed to fetch current user');
  }
});

// Async thunk: Logout
export const logoutUser = createAsyncThunk<void, void>(
  'auth/logout',
  async () => {
    try {
      await authApi.logout();
    } finally {
      clearAccessToken();
    }
  }
);

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    resetAuth: (state) => {
      clearAccessToken();
      state.user = null;
      state.workspace = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.initialized = true;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Register
    builder.addCase(registerUser.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(registerUser.fulfilled, (state, action: PayloadAction<AuthResponse>) => {
      state.loading = false;
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.workspace = action.payload.workspace;
      state.error = null;
    });
    builder.addCase(registerUser.rejected, (state, action) => {
      state.loading = false;
      state.isAuthenticated = false;
      state.error = action.payload || 'Registration failed';
    });

    // Login
    builder.addCase(loginUser.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(loginUser.fulfilled, (state, action: PayloadAction<AuthResponse>) => {
      state.loading = false;
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.workspace = action.payload.workspace;
      state.error = null;
    });
    builder.addCase(loginUser.rejected, (state, action) => {
      state.loading = false;
      state.isAuthenticated = false;
      state.error = action.payload || 'Login failed';
    });

    // Refresh Auth
    builder.addCase(refreshAuth.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(refreshAuth.fulfilled, (state, action) => {
      state.loading = false;
      state.initialized = true;
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.workspace = action.payload.workspace;
      state.error = null;
    });
    builder.addCase(refreshAuth.rejected, (state) => {
      state.loading = false;
      state.initialized = true;
      state.isAuthenticated = false;
      state.user = null;
      state.workspace = null;
    });

    // Fetch Current User
    builder.addCase(fetchCurrentUser.fulfilled, (state, action) => {
      state.user = action.payload.user;
      state.workspace = action.payload.workspace;
      state.isAuthenticated = true;
    });

    // Logout
    builder.addCase(logoutUser.fulfilled, (state) => {
      state.user = null;
      state.workspace = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.initialized = true;
      state.error = null;
    });
  },
});

export const { clearError, resetAuth } = authSlice.actions;
export default authSlice.reducer;
