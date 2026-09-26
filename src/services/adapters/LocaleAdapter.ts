import { getLocales } from 'expo-localization';

import {
  AppLanguage,
  DeviceLocaleInput,
  languageFromDeviceLocale,
} from '../../i18n/languages';

const readDeviceLocales = (): DeviceLocaleInput[] => {
  try {
    const locales = getLocales();
    if (!locales || locales.length === 0) {
      return [];
    }
    return locales.map(locale => ({
      languageTag: locale.languageTag,
      languageCode: locale.languageCode,
      languageScriptCode: locale.languageScriptCode,
      regionCode: locale.regionCode,
    }));
  } catch {
    return [];
  }
};

export const getDeviceLanguage = (): AppLanguage => {
  const locales = readDeviceLocales();
  if (locales.length === 0) {
    return 'en';
  }
  return languageFromDeviceLocale(locales[0]);
};

export const getDeviceLocaleInputs = (): DeviceLocaleInput[] => readDeviceLocales();
