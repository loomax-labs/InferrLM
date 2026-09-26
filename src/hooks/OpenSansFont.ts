import { useMemo } from 'react';
import { Fonts, fontWeights } from '../constants/fonts';
import { useCjkChrome } from '../i18n/chrome';

type FontWeight = keyof typeof fontWeights;

export const OpenSansFont = () => {
  const cjk = useCjkChrome();
  const face = (name: string) => (cjk ? {} : { fontFamily: name });

  const getOpenSansFont = useMemo(() => {
    return (weight: FontWeight = 'normal') => {
      if (cjk) {
        return {};
      }
      const fontFamily = Fonts.openSans[fontWeights[weight]];
      return { fontFamily };
    };
  }, [cjk]);

  return {
    getOpenSansFont,
    fonts: {
      light: face('OpenSans-Light'),
      regular: face('OpenSans-Regular'),
      medium: face('OpenSans-Medium'),
      semibold: face('OpenSans-SemiBold'),
      bold: face('OpenSans-Bold'),
      extrabold: face('OpenSans-ExtraBold'),
    }
  };
}; 
