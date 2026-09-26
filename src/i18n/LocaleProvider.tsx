import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { getDeviceLocaleInputs } from '../services/adapters/LocaleAdapter';
import { applyLanguage } from './index';
import {
  AppLanguage,
  LANGUAGE_STORAGE_KEY,
  LanguagePreference,
  preferenceFromStored,
  resolveActiveLanguage,
} from './languages';
import { pushDownloadNotificationCopy } from './notificationCopy';

type LocaleContextType = {
  language: AppLanguage;
  preference: LanguagePreference;
  setPreference: (preference: LanguagePreference) => Promise<void>;
};

const LocaleContext = createContext<LocaleContextType>({
  language: 'en',
  preference: 'system',
  setPreference: async () => {},
});

export const LocaleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [preference, setPreferenceState] = useState<LanguagePreference>('system');
  const [language, setLanguage] = useState<AppLanguage>('en');

  const applyResolved = useCallback(async (nextPreference: LanguagePreference) => {
    const deviceLocales = nextPreference === 'system' || nextPreference === 'en'
      ? getDeviceLocaleInputs()
      : [];
    const resolved = nextPreference === 'system'
      ? resolveActiveLanguage('system', deviceLocales)
      : nextPreference;
    setLanguage(resolved);
    try {
      await applyLanguage(resolved);
      await pushDownloadNotificationCopy();
    } catch {
      // A catalog or notification failure must not block launch.
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadPreference() {
      let stored: string | null = null;
      let failed = false;
      try {
        stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
      } catch {
        failed = true;
      }

      if (!mounted) {
        return;
      }

      if (failed) {
        setPreferenceState('en');
        await applyResolved('en');
        return;
      }

      const next = preferenceFromStored(stored);
      setPreferenceState(next);
      await applyResolved(next);
    }

    loadPreference();

    return () => {
      mounted = false;
    };
  }, [applyResolved]);

  const setPreference = useCallback(async (next: LanguagePreference) => {
    setPreferenceState(next);
    await applyResolved(next);
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, next);
    } catch {
      // Keep the in-memory choice if storage fails.
    }
  }, [applyResolved]);

  const value = useMemo(() => ({
    language,
    preference,
    setPreference,
  }), [language, preference, setPreference]);

  return (
    <LocaleContext.Provider value={value}>
      {children}
    </LocaleContext.Provider>
  );
};

export const useLocale = () => useContext(LocaleContext);
