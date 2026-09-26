const WITHHELD_IN_CHINA = new Set(['gemini', 'claude']);

const BLOCKED_HOST_SUFFIXES = [
  'openai.com',
  'chatgpt.com',
  'oaistatic.com',
  'oaiusercontent.com',
  'anthropic.com',
  'claude.ai',
  'generativelanguage.googleapis.com',
  'ai.google.dev',
  'gemini.google.com',
  'aistudio.google.com',
];

type RegionReader = () => string | null;

const defaultRegionReader = (): string | null => {
  if (process.env.NODE_ENV === 'test') {
    return null;
  }
  try {
    const localization = require('expo-localization') as { region?: string | null };
    return typeof localization.region === 'string' ? localization.region : null;
  } catch {
    return null;
  }
};

let regionReader: RegionReader = defaultRegionReader;

export function setRegionReader(reader: RegionReader | null): void {
  regionReader = reader ?? defaultRegionReader;
}

export function isMainlandChina(): boolean {
  return (regionReader() || '').toUpperCase() === 'CN';
}

export function providerBase(provider: string): string {
  const marker = '_clone_';
  const index = provider.indexOf(marker);
  return index === -1 ? provider : provider.slice(0, index);
}

export function isRemoteProviderOffered(provider: string): boolean {
  if (!isMainlandChina()) {
    return true;
  }
  return !WITHHELD_IN_CHINA.has(providerBase(provider));
}

export function hostnameOf(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) {
    return null;
  }
  try {
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    return new URL(withProtocol).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function isBlockedServiceHost(url: string): boolean {
  const host = hostnameOf(url);
  if (!host) {
    return false;
  }
  return BLOCKED_HOST_SUFFIXES.some(suffix => host === suffix || host.endsWith(`.${suffix}`));
}

export function isBlockedProviderUrl(url: string): boolean {
  return isMainlandChina() && isBlockedServiceHost(url);
}

export function rejectBlockedEndpoint(url: string): void {
  if (!isMainlandChina()) {
    return;
  }
  if (!url.trim() || isBlockedServiceHost(url)) {
    throw new Error('Set an API address in Settings.');
  }
}

export function userFacingApiName(): string {
  return isMainlandChina() ? 'API' : 'OpenAI API';
}

export function errorProviderName(provider: string): string {
  const base = providerBase(provider);
  if (isMainlandChina()) {
    return base === 'chatgpt' ? 'Compatible API' : 'Remote API';
  }
  if (base === 'gemini') return 'Gemini';
  if (base === 'chatgpt') return 'OpenAI';
  if (base === 'claude') return 'Claude';
  return 'OpenAI';
}

export function chinaPickerName(provider: string, fallback: string): string {
  if (!isRemoteProviderOffered(provider)) {
    return 'Select a Model';
  }
  if (isMainlandChina() && providerBase(provider) === 'chatgpt') {
    return 'Compatible API';
  }
  return fallback;
}

export function localApiWording(text: string): string {
  if (!isMainlandChina() || !text) {
    return text;
  }
  const withoutBlockedUrls = text.replace(/https?:\/\/[^\s"'<>)]+/gi, (url) => (
    isBlockedServiceHost(url) ? '' : url
  ));
  return withoutBlockedUrls
    .replace(/OpenAI([-\s]+)([Cc])ompatible/g, (_match, _sep, letter: string) => (
      letter === 'C' ? 'Compatible' : 'compatible'
    ))
    .replace(/OpenAI API/g, 'chat API')
    .replace(/\bOpenAI\b/g, 'chat API')
    .replace(/\bChatGPT\b/g, 'chat API')
    .replace(/openai/gi, 'chat-api')
    .replace(/chatgpt/gi, 'chat-api');
}
