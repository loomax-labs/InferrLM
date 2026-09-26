import { normalizeApiUrl, pickApiOrigin, resolveApiUrl } from '../apiUrl';

describe('apiUrl', () => {
  it('adds /api when missing', () => {
    expect(normalizeApiUrl('https://api.inferrlm.app')).toBe('https://api.inferrlm.app/api');
    expect(normalizeApiUrl('https://api.inferrlm.app/')).toBe('https://api.inferrlm.app/api');
  });

  it('keeps an existing /api suffix', () => {
    expect(normalizeApiUrl('https://api.inferrlm.app/api')).toBe('https://api.inferrlm.app/api');
  });

  it('upgrades cleartext api.inferrlm.app to https', () => {
    expect(normalizeApiUrl('http://api.inferrlm.app')).toBe('https://api.inferrlm.app/api');
  });

  it('uses production api in release mode', () => {
    expect(pickApiOrigin(false)).toBe('https://api.inferrlm.app');
    expect(resolveApiUrl('https://api.inferrlm.app')).toBe('https://api.inferrlm.app/api');
  });

  it('uses localhost in dev on ios', () => {
    expect(pickApiOrigin(true)).toMatch(/^http:\/\/localhost:3001$/);
    expect(resolveApiUrl('http://localhost:3001')).toBe('http://localhost:3001/api');
  });

  it('honors EXPO_PUBLIC_API_URL_DEV in dev', () => {
    const prev = process.env.EXPO_PUBLIC_API_URL_DEV;
    process.env.EXPO_PUBLIC_API_URL_DEV = 'http://192.168.1.10:3001';
    expect(pickApiOrigin(true)).toBe('http://192.168.1.10:3001');
    process.env.EXPO_PUBLIC_API_URL_DEV = prev;
  });
});
