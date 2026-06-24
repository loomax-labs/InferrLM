import * as SecureStore from 'expo-secure-store';
import { logger } from '../../utils/logger';
import { AUTH_SECURE_STORE_OPTIONS } from '../AuthStorage';

const ACCESS_KEY = 'inferra_access_token';
const REFRESH_KEY = 'inferra_refresh_token';

const RAW_API_URL = process.env.EXPO_PUBLIC_API_URL;

function normalizeApiUrl(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

function normalizePath(path: string): string {
  return path.startsWith('/') ? path : `/${path}`;
}

const API_URL = normalizeApiUrl(RAW_API_URL);

function isAuthTracePath(path: string): boolean {
  return path.startsWith('/auth') || path.startsWith('/me');
}

function maskEmail(email?: string): string | undefined {
  if (!email || !email.includes('@')) {
    return undefined;
  }
  const [name, domain] = email.split('@');
  const head = name.slice(0, 2);
  return `${head}***@${domain}`;
}

function summarizeBody(body: any): Record<string, unknown> | undefined {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return undefined;
  }

  return {
    email: typeof body.email === 'string' ? maskEmail(body.email) : undefined,
    hasPassword: typeof body.password === 'string',
    hasDisplayName: typeof body.displayName === 'string' && body.displayName.length > 0,
    hasIdToken: typeof body.idToken === 'string' && body.idToken.length > 0,
    hasIdentityToken: typeof body.identityToken === 'string' && body.identityToken.length > 0,
    hasRefreshToken: typeof body.refreshToken === 'string' && body.refreshToken.length > 0,
  };
}

function summarizeErrorBody(body: any): Record<string, unknown> | undefined {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return undefined;
  }

  return {
    error: typeof body.error === 'string' ? body.error : undefined,
    message: typeof body.message === 'string' ? body.message : undefined,
    details: Array.isArray(body.details) ? body.details : undefined,
  };
}

let refreshPromise: Promise<string | null> | null = null;

type RequestOpts = {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
  auth?: boolean;
  formData?: boolean;
};

async function getAccessToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(ACCESS_KEY, AUTH_SECURE_STORE_OPTIONS);
  } catch {
    return null;
  }
}

async function getRefreshToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(REFRESH_KEY, AUTH_SECURE_STORE_OPTIONS);
  } catch {
    return null;
  }
}

export async function storeTokens(access: string, refresh: string): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_KEY, access, AUTH_SECURE_STORE_OPTIONS);
  await SecureStore.setItemAsync(REFRESH_KEY, refresh, AUTH_SECURE_STORE_OPTIONS);
}

export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(ACCESS_KEY, AUTH_SECURE_STORE_OPTIONS);
  await SecureStore.deleteItemAsync(REFRESH_KEY, AUTH_SECURE_STORE_OPTIONS);
}

async function refreshAccessToken(): Promise<string | null> {
  const refresh = await getRefreshToken();
  if (!refresh) {
    logger.warn('auth_refresh_missing', 'auth', {
      endpoint: '/auth/refresh',
      params: { apiUrl: API_URL },
    });
    return null;
  }

  try {
    logger.info('auth_refresh_start', 'auth', {
      endpoint: '/auth/refresh',
      params: { apiUrl: API_URL, hasRefreshToken: true },
    });

    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refresh }),
    });

    if (!res.ok) {
      logger.warn('auth_refresh_fail', 'auth', {
        endpoint: '/auth/refresh',
        status: res.status,
      });
      await clearTokens();
      return null;
    }

    const data = await res.json();
    await storeTokens(data.accessToken, data.refreshToken);
    logger.info('auth_refresh_ok', 'auth', {
      endpoint: '/auth/refresh',
      status: res.status,
      params: {
        hasAccessToken: typeof data.accessToken === 'string' && data.accessToken.length > 0,
        hasRefreshToken: typeof data.refreshToken === 'string' && data.refreshToken.length > 0,
      },
    });
    return data.accessToken;
  } catch (error: any) {
    logger.error('auth_refresh_error', 'auth', {
      endpoint: '/auth/refresh',
      params: {
        message: error?.message,
      },
    });
    return null;
  }
}

/*
  Serialises concurrent refresh calls so only one
  refresh request flies at a time. Subsequent callers
  await the same promise.
*/
async function serialRefresh(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export async function apiRequest<T = any>(path: string, opts: RequestOpts = {}): Promise<T> {
  const { method = 'GET', body, headers = {}, auth = true, formData = false } = opts;

  const normalizedPath = normalizePath(path);
  const url = `${API_URL}${normalizedPath}`;
  const reqHeaders: Record<string, string> = { ...headers };
  const traceAuth = isAuthTracePath(normalizedPath);

  if (auth) {
    const token = await getAccessToken();
    if (token) {
      reqHeaders['Authorization'] = `Bearer ${token}`;
    }
  }

  if (!formData && body && !reqHeaders['Content-Type']) {
    reqHeaders['Content-Type'] = 'application/json';
  }

  const fetchOpts: RequestInit = {
    method,
    headers: reqHeaders,
    body: formData ? body : body ? JSON.stringify(body) : undefined,
  };

  if (traceAuth) {
    logger.info('auth_http_start', 'auth', {
      endpoint: normalizedPath,
      params: {
        method,
        url,
        auth,
        hasAuthHeader: !!reqHeaders['Authorization'],
        body: summarizeBody(body),
      },
    });
  }

  let res = await fetch(url, fetchOpts);

  if (traceAuth) {
    logger.info('auth_http_status', 'auth', {
      endpoint: normalizedPath,
      status: res.status,
      params: { method, retried: false },
    });
  }

  if (res.status === 401 && auth) {
    const newToken = await serialRefresh();
    if (newToken) {
      reqHeaders['Authorization'] = `Bearer ${newToken}`;
      if (traceAuth) {
        logger.warn('auth_http_retry', 'auth', {
          endpoint: normalizedPath,
          status: res.status,
          params: { method },
        });
      }
      res = await fetch(url, { ...fetchOpts, headers: reqHeaders });
      if (traceAuth) {
        logger.info('auth_http_status', 'auth', {
          endpoint: normalizedPath,
          status: res.status,
          params: { method, retried: true },
        });
      }
    }
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { message: text || res.statusText };
    }
    if (traceAuth) {
      logger.error('auth_http_fail', 'auth', {
        endpoint: normalizedPath,
        status: res.status,
        params: {
          method,
          url,
          body: summarizeBody(body),
          response: summarizeErrorBody(parsed),
        },
      });
    }
    const err: any = new Error(parsed.message || `request_failed_${res.status}`);
    err.status = res.status;
    err.body = parsed;
    throw err;
  }

  if (traceAuth) {
    logger.info('auth_http_ok', 'auth', {
      endpoint: normalizedPath,
      status: res.status,
      params: { method, url },
    });
  }

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return res.json();
  }
  return res.text() as any;
}

export const api = {
  get: <T = any>(path: string, opts?: Omit<RequestOpts, 'method'>) =>
    apiRequest<T>(path, { ...opts, method: 'GET' }),

  post: <T = any>(path: string, body?: any, opts?: Omit<RequestOpts, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...opts, method: 'POST', body }),

  patch: <T = any>(path: string, body?: any, opts?: Omit<RequestOpts, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...opts, method: 'PATCH', body }),

  delete: <T = any>(path: string, opts?: Omit<RequestOpts, 'method'>) =>
    apiRequest<T>(path, { ...opts, method: 'DELETE' }),
};
