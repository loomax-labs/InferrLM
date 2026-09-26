import de from './locales/de.json';
import fr from './locales/fr.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';
import nl from './locales/nl.json';
import zhHans from './locales/zh-Hans.json';
import zhHant from './locales/zh-Hant.json';

type Catalog = Record<string, unknown>;

export const bundledCatalogs: Record<string, Catalog> = {
  ja: ja as Catalog,
  ko: ko as Catalog,
  de: de as Catalog,
  fr: fr as Catalog,
  nl: nl as Catalog,
  'zh-Hans': zhHans as Catalog,
  'zh-Hant': zhHant as Catalog,
};
