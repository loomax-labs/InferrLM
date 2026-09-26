export const APP_LANGUAGES = [
  'en',
  'ja',
  'ko',
  'de',
  'fr',
  'nl',
  'zh-Hans',
  'zh-Hant',
] as const;

export type AppLanguage = (typeof APP_LANGUAGES)[number];

export type LanguagePreference = 'system' | AppLanguage;

export const LANGUAGE_STORAGE_KEY = '@app_language';

export const LANGUAGE_ENDONYMS: Record<AppLanguage, string> = {
  en: 'English',
  ja: '日本語',
  ko: '한국어',
  de: 'Deutsch',
  fr: 'Français',
  nl: 'Nederlands',
  'zh-Hans': '简体中文',
  'zh-Hant': '繁體中文',
};

const LANGUAGE_SET = new Set<string>(APP_LANGUAGES);

export const CJK_LANGUAGES = new Set<AppLanguage>(['zh-Hans', 'zh-Hant', 'ja', 'ko']);

const SPEECH_TAGS: Record<AppLanguage, string> = {
  en: 'en-US',
  'zh-Hans': 'zh-CN',
  'zh-Hant': 'zh-TW',
  ja: 'ja-JP',
  ko: 'ko-KR',
  de: 'de-DE',
  fr: 'fr-FR',
  nl: 'nl-NL',
};

const INTL_TAGS: Record<AppLanguage, string> = {
  en: 'en-US',
  'zh-Hans': 'zh-CN',
  'zh-Hant': 'zh-TW',
  ja: 'ja-JP',
  ko: 'ko-KR',
  de: 'de-DE',
  fr: 'fr-FR',
  nl: 'nl-NL',
};

export const isAppLanguage = (value: string | null | undefined): value is AppLanguage => (
  !!value && LANGUAGE_SET.has(value)
);

export const isLanguagePreference = (value: string | null | undefined): value is LanguagePreference => (
  value === 'system' || isAppLanguage(value)
);

export const isCjkLanguage = (value: string | null | undefined): boolean => (
  isAppLanguage(value) && CJK_LANGUAGES.has(value)
);

export const speechTagFor = (language: AppLanguage): string => SPEECH_TAGS[language];

export const intlTagFor = (language: AppLanguage): string => INTL_TAGS[language];

const HANT_REGIONS = new Set(['tw', 'hk', 'mo']);

export const languageFromTag = (tag: string | null | undefined): AppLanguage => {
  if (!tag || !tag.trim()) {
    return 'en';
  }

  const normalized = tag.trim().replace(/_/g, '-');
  const parts = normalized.split('-').filter(Boolean);
  const language = (parts[0] || '').toLowerCase();
  const rest = parts.slice(1).map(part => part.toLowerCase());
  const script = rest.find(part => part === 'hans' || part === 'hant');
  const region = rest.find(part => part.length === 2);

  if (language === 'zh') {
    if (script === 'hant' || (region && HANT_REGIONS.has(region))) {
      return 'zh-Hant';
    }
    if (script === 'hans' || region === 'cn' || normalized.toLowerCase() === 'zh') {
      return 'zh-Hans';
    }
    return 'zh-Hans';
  }

  if (language === 'en') return 'en';
  if (language === 'ja') return 'ja';
  if (language === 'ko') return 'ko';
  if (language === 'de') return 'de';
  if (language === 'fr') return 'fr';
  if (language === 'nl') return 'nl';
  return 'en';
};

export type DeviceLocaleInput = {
  languageTag?: string | null;
  languageCode?: string | null;
  languageScriptCode?: string | null;
  regionCode?: string | null;
};

export const languageFromDeviceLocale = (locale: DeviceLocaleInput | null | undefined): AppLanguage => {
  if (!locale) {
    return 'en';
  }

  const script = locale.languageScriptCode?.toLowerCase();
  const region = locale.regionCode?.toLowerCase();
  const code = locale.languageCode?.toLowerCase();
  const tag = locale.languageTag;

  if (code === 'zh' || (tag && tag.toLowerCase().startsWith('zh'))) {
    if (script === 'hant' || (region && HANT_REGIONS.has(region))) {
      return 'zh-Hant';
    }
    if (script === 'hans' || region === 'cn') {
      return 'zh-Hans';
    }
    return languageFromTag(tag || code || '');
  }

  if (tag) {
    return languageFromTag(tag);
  }
  return languageFromTag(code);
};

export const resolveActiveLanguage = (
  stored: string | null | undefined,
  deviceLocales: DeviceLocaleInput[],
): AppLanguage => {
  if (stored == null || stored === '') {
    const first = deviceLocales[0];
    return first ? languageFromDeviceLocale(first) : 'en';
  }

  if (stored === 'system') {
    const first = deviceLocales[0];
    return first ? languageFromDeviceLocale(first) : 'en';
  }

  if (isAppLanguage(stored)) {
    return stored;
  }

  return 'en';
};

export const preferenceFromStored = (stored: string | null | undefined): LanguagePreference => {
  if (stored == null || stored === '') {
    return 'system';
  }
  if (isLanguagePreference(stored)) {
    return stored;
  }
  return 'en';
};
