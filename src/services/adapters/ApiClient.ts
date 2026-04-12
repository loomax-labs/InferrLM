import * as SecureStore from 'expo-secure-store';

const ACCESS_KEY = 'inferra_access_token';
const REFRESH_KEY = 'inferra_refresh_token';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.inferrlm.app';

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
    return await SecureStore.getItemAsync(ACCESS_KEY);
  } catch {
    return null;
  }
}

async function getRefreshToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(REFRESH_KEY);
  } catch {
    return null;
  }
}

export async function storeTokens(access: string, refresh: string): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_KEY, access, { keychainService: 'inferra_auth' });
  await SecureStore.setItemAsync(REFRESH_KEY, refresh, { keychainService: 'inferra_auth' });
}

export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(ACCESS_KEY);
  await SecureStore.deleteItemAsync(REFRESH_KEY);
}

async function refreshAccessToken(): Promise<string | null> {
  const refresh = await getRefreshToken();
  if (!refresh) return null;

  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refresh }),
    });

    if (!res.ok) {
      await clearTokens();
      return null;
    }

    const data = await res.json();
    await storeTokens(data.accessToken, data.refreshToken);
    return data.accessToken;
  } catch {
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

  const url = `${API_URL}${path}`;
  const reqHeaders: Record<string, string> = { ...headers };

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

  let res = await fetch(url, fetchOpts);

  if (res.status === 401 && auth) {
    const newToken = await serialRefresh();
    if (newToken) {
      reqHeaders['Authorization'] = `Bearer ${newToken}`;
      res = await fetch(url, { ...fetchOpts, headers: reqHeaders });
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
    const err: any = new Error(parsed.message || `request_failed_${res.status}`);
    err.status = res.status;
    err.body = parsed;
    throw err;
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
