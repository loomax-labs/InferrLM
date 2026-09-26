import { useLocale } from './LocaleProvider';
import { isCjkLanguage } from './languages';

export const useCjkChrome = (): boolean => {
  const { language } = useLocale();
  return isCjkLanguage(language);
};

export const cjkTextStyle = (cjk: boolean) => (
  cjk ? { textTransform: 'none' as const, letterSpacing: 0 } : null
);
