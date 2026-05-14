import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enTranslations from './locales/en.json';
import viTranslations from './locales/vi.json';

// Force Vietnamese for entire app
localStorage.setItem('i18nextLng', 'vi');

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: enTranslations,
      },
      vi: {
        translation: viTranslations,
      },
    },
    lng: 'vi',
    fallbackLng: 'vi',
    debug: false,
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
