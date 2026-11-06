import { getAccessToken, setAccessToken, clearAccessToken } from './tokenStorage';

const BASE_URL = '/api/v1';

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { skipAuth = false, headers = {}, ...customConfig } = options;

  const reqHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string>),
  };

  const token = getAccessToken();
  if (token && !skipAuth) {
    reqHeaders['Authorization'] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    ...customConfig,
    headers: reqHeaders,
    credentials: 'include', // Ensures HttpOnly cookies are sent and received
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, config);

  // If 401 and not already refreshing or skipping auth, attempt token rotation
  if (response.status === 401 && !skipAuth && endpoint !== '/auth/refresh' && endpoint !== '/auth/login') {
    try {
      const refreshResponse = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        setAccessToken(refreshData.access_token);

        // Retry original request with newly issued access token
        reqHeaders['Authorization'] = `Bearer ${refreshData.access_token}`;
        const retryResponse = await fetch(`${BASE_URL}${endpoint}`, {
          ...customConfig,
          headers: reqHeaders,
          credentials: 'include',
        });

        if (!retryResponse.ok) {
          const errData = await retryResponse.json().catch(() => ({}));
          throw new Error(errData.detail || 'Request failed after refresh');
        }

        return retryResponse.json() as Promise<T>;
      } else {
        clearAccessToken();
      }
    } catch {
      clearAccessToken();
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    let errorMessage = 'An unexpected error occurred';
    if (typeof errorData.detail === 'string') {
      errorMessage = errorData.detail;
    } else if (Array.isArray(errorData.detail)) {
      errorMessage = errorData.detail.map((d: { msg?: string }) => d.msg).join(', ');
    }
    throw new Error(errorMessage);
  }

  return response.json() as Promise<T>;
}

