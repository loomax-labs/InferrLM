import fs from 'fs';
import path from 'path';

import {
  languageFromDeviceLocale,
  languageFromTag,
  preferenceFromStored,
  resolveActiveLanguage,
} from '../languages';

describe('locale mapping', () => {
  it('maps zh-CN to zh-Hans', () => {
    expect(languageFromTag('zh-CN')).toBe('zh-Hans');
    expect(languageFromDeviceLocale({
      languageTag: 'zh-CN',
      languageCode: 'zh',
      regionCode: 'CN',
    })).toBe('zh-Hans');
  });

  it('maps zh-TW, zh-HK, and zh-MO to zh-Hant', () => {
    expect(languageFromTag('zh-TW')).toBe('zh-Hant');
    expect(languageFromTag('zh-HK')).toBe('zh-Hant');
    expect(languageFromTag('zh-MO')).toBe('zh-Hant');
    expect(languageFromDeviceLocale({
      languageTag: 'zh-TW',
      languageCode: 'zh',
      languageScriptCode: 'Hant',
      regionCode: 'TW',
    })).toBe('zh-Hant');
  });

  it('maps an unknown tag to English', () => {
    expect(languageFromTag('xx-YY')).toBe('en');
    expect(languageFromTag('')).toBe('en');
    expect(languageFromTag(null)).toBe('en');
    expect(resolveActiveLanguage('system', [])).toBe('en');
    expect(resolveActiveLanguage(null, [])).toBe('en');
  });

  it('rejects a tampered storage value and still resolves English', () => {
    expect(preferenceFromStored('not-a-language')).toBe('en');
    expect(resolveActiveLanguage('pirate', [{ languageTag: 'zh-CN', languageCode: 'zh' }])).toBe('en');
    expect(resolveActiveLanguage('en-GB', [{ languageTag: 'en-GB', languageCode: 'en' }])).toBe('en');
  });

  it('lets a saved choice win over the device language', () => {
    expect(resolveActiveLanguage('ja', [{ languageTag: 'zh-CN', languageCode: 'zh' }])).toBe('ja');
    expect(resolveActiveLanguage('system', [{ languageTag: 'de-DE', languageCode: 'de' }])).toBe('de');
  });

  it('keeps catalog keys aligned with English when a locale file is present', () => {
    const dir = path.join(__dirname, '../locales');
    const en = JSON.parse(fs.readFileSync(path.join(dir, 'en.json'), 'utf8')) as unknown;
    const flatten = (value: unknown, prefix = ''): string[] => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return prefix ? [prefix] : [];
      }
      return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) => (
        flatten(child, prefix ? `${prefix}.${key}` : key)
      ));
    };
    const enKeys = flatten(en).sort();
    const files = fs.readdirSync(dir).filter(name => name.endsWith('.json') && name !== 'en.json');
    for (const file of files) {
      const catalog = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')) as unknown;
      expect(flatten(catalog).sort()).toEqual(enKeys);
    }
  });
});
