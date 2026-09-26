import { useMemo } from 'react';
import i18n from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';

import en from './locales/en.json';
import { bundledCatalogs } from './optionalCatalogs';
import {
  AppLanguage,
  intlTagFor,
  isAppLanguage,
  isCjkLanguage,
  speechTagFor,
} from './languages';

type Catalog = Record<string, unknown>;

const resources: Record<string, { translation: Catalog }> = {
  en: { translation: en as Catalog },
};

for (const [code, catalog] of Object.entries(bundledCatalogs)) {
  if (catalog) {
    resources[code] = { translation: catalog };
  }
}

const lookup = (catalog: Catalog, key: string): string | undefined => {
  const value = key.split('.').reduce<unknown>((node, part) => {
    if (!node || typeof node !== 'object') {
      return undefined;
    }
    return (node as Record<string, unknown>)[part];
  }, catalog);
  return typeof value === 'string' ? value : undefined;
};

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    returnNull: false,
    parseMissingKeyHandler: (key) => lookup(en as Catalog, key) ?? '',
    react: { useSuspense: false },
  });
}

export type Translate = (key: string, options?: Record<string, unknown>) => string;

export const t: Translate = (key, options) => i18n.t(key, options);

export const useT = (): Translate => {
  const { t: translate } = useTranslation();
  return useMemo(() => ((key, options) => translate(key, options)), [translate]);
};

export const getActiveLanguage = (): AppLanguage => {
  const current = i18n.resolvedLanguage || i18n.language;
  return isAppLanguage(current) ? current : 'en';
};

export const applyLanguage = async (language: AppLanguage): Promise<void> => {
  if (i18n.language === language) {
    return;
  }
  await i18n.changeLanguage(language);
};

export const speechLocale = (): string => speechTagFor(getActiveLanguage());

export const formatLocaleDate = (date: Date, options?: Intl.DateTimeFormatOptions): string => (
  new Intl.DateTimeFormat(intlTagFor(getActiveLanguage()), options).format(date)
);

export const formatLocaleNumber = (value: number, options?: Intl.NumberFormatOptions): string => (
  new Intl.NumberFormat(intlTagFor(getActiveLanguage()), options).format(value)
);

export { isCjkLanguage };

// REVIEW: counsel has not approved translations.
// terms.* keeps the same duties and limits as the English source.
export const TERMS_REVIEW = 'REVIEW: counsel has not approved translations.';
