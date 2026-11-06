// In-memory access token storage to prevent XSS exfiltration
let inMemoryAccessToken: string | null = null;

export const setAccessToken = (token: string | null): void => {
  inMemoryAccessToken = token;
};

export const getAccessToken = (): string | null => {
  return inMemoryAccessToken;
};

export const clearAccessToken = (): void => {
  inMemoryAccessToken = null;
};

