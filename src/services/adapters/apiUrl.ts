import { Platform } from 'react-native';

export const PRODUCTION_API_ORIGIN = 'https://api.inferrlm.app';

export function normalizeApiUrl(value: string): string {
  let trimmed = value.trim().replace(/\/+$/, '');
  if (/^http:\/\/api\.inferrlm\.app/i.test(trimmed)) {
    trimmed = trimmed.replace(/^http:/i, 'https:');
  }
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

export function pickApiOrigin(isDev = __DEV__): string {
  if (!isDev) {
    return PRODUCTION_API_ORIGIN;
  }

  const override = process.env.EXPO_PUBLIC_API_URL_DEV?.trim();
  if (override) {
    return override.replace(/\/+$/, '');
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3001';
  }

  return 'http://localhost:3001';
}

export function resolveApiUrl(raw?: string): string {
  const base = raw ?? pickApiOrigin();
  if (!base.trim()) {
    return '';
  }
  return normalizeApiUrl(base);
}
