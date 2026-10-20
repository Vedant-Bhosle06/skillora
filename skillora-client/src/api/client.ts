import axios, { AxiosError } from 'axios';
import { tokenStore } from '@/auth/tokenStore';

// Error type every API call rejects with. It never holds the original axios
// error, because that carries the request config (and the Authorization header).
export class ApiError extends Error {
  status: number; // 0 = network error / no response
  data?: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;

  if (axios.isAxiosError(err)) {
    const status = err.response?.status ?? 0;
    const data = err.response?.data as unknown;
    const serverMessage =
      data && typeof data === 'object' && typeof (data as { error?: unknown }).error === 'string'
        ? (data as { error: string }).error
        : null;

    let message: string;
    if (serverMessage) message = serverMessage;
    else if (err.code === 'ECONNABORTED') message = 'The server took too long to respond.';
    else if (status === 0) message = 'Cannot reach the server. Check that the API is running.';
    else if (status === 429) message = 'Too many requests — wait a minute and try again.';
    else message = `Request failed (${status})`;

    return new ApiError(message, status, data);
  }

  return new ApiError('Something went wrong.', 0);
}

const rawBase = import.meta.env.VITE_API_BASE_URL;
if (!rawBase) {
  throw new Error('VITE_API_BASE_URL is not set. Create skillora-client/.env (see README).');
}
if (import.meta.env.PROD && !rawBase.startsWith('https:')) {
  console.warn('VITE_API_BASE_URL is not https: the token would travel in clear text.');
}

export const api = axios.create({
  baseURL: `${rawBase.replace(/\/+$/, '')}/api`,
  // Generous: a sleeping free-tier API can take about a minute to answer the first request.
  timeout: 75000,
});

let onUnauthorized: (() => void) | null = null;

/** Called on any 401 outside /auth/* (expired, revoked or tampered token). */
export function setUnauthorizedHandler(fn: (() => void) | null): void {
  onUnauthorized = fn;
}

api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.set('Authorization', `Bearer ${token}`);
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err: AxiosError) => {
    const apiErr = toApiError(err);
    const url = err.config?.url ?? '';
    if (apiErr.status === 401 && !url.startsWith('/auth/')) onUnauthorized?.();
    return Promise.reject(apiErr);
  },
);
