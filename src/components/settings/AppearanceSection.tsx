import React from 'react';
import SettingsSection from './SettingsSection';
import ThemeOption from './ThemeOption';
import { useT } from '../../i18n';
import { useLocale } from '../../i18n/LocaleProvider';
import { APP_LANGUAGES, LANGUAGE_ENDONYMS, LanguagePreference } from '../../i18n/languages';

type ThemeOptionType = 'system' | 'light' | 'dark';

type AppearanceSectionProps = {
  selectedTheme: ThemeOptionType;
  onThemeChange: (theme: ThemeOptionType) => void;
};

const AppearanceSection = ({ selectedTheme, onThemeChange }: AppearanceSectionProps) => {
  const t = useT();
  const { preference, setPreference } = useLocale();

  return (
    <SettingsSection title={t('settings.appearance')}>
      <ThemeOption
        title={t('settings.languageSystem')}
        description={t('settings.languageSystemDescription')}
        value="system"
        icon="translate"
        onSelect={(value) => setPreference(value as LanguagePreference)}
        selectedTheme={preference}
      />
      {APP_LANGUAGES.map((code) => (
        <ThemeOption
          key={code}
          title={LANGUAGE_ENDONYMS[code]}
          value={code}
          icon="web"
          showDivider
          onSelect={(value) => setPreference(value as LanguagePreference)}
          selectedTheme={preference}
        />
      ))}
      <ThemeOption
        title={t('settings.themeSystem')}
        description={t('settings.themeSystemDescription')}
        value="system"
        icon="cellphone"
        showDivider
        onSelect={(value) => onThemeChange(value as ThemeOptionType)}
        selectedTheme={selectedTheme}
      />
      <ThemeOption
        title={t('settings.themeLight')}
        description={t('settings.themeLightDescription')}
        value="light"
        icon="white-balance-sunny"
        showDivider
        onSelect={(value) => onThemeChange(value as ThemeOptionType)}
        selectedTheme={selectedTheme}
      />
      <ThemeOption
        title={t('settings.themeDark')}
        description={t('settings.themeDarkDescription')}
        value="dark"
        icon="moon-waning-crescent"
        showDivider
        onSelect={(value) => onThemeChange(value as ThemeOptionType)}
        selectedTheme={selectedTheme}
      />
    </SettingsSection>
  );
};

export default AppearanceSection;
