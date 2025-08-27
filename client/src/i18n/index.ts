import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import language resources
import en from './locales/en.json';
import ar from './locales/ar.json';

const resources = {
  en: {
    translation: en,
  },
  ar: {
    translation: ar,
  },
};

// Language detection options
const detectionOptions = {
  order: ['localStorage', 'navigator', 'htmlTag'],
  caches: ['localStorage'],
  lookupLocalStorage: 'i18nextLng',
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    debug: process.env.NODE_ENV === 'development',
    
    // Language detection
    detection: detectionOptions,
    
    // Interpolation
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    
    // React i18next options
    react: {
      useSuspense: false,
    },
    
    // Default namespace
    defaultNS: 'translation',
    
    // Supported languages
    supportedLngs: ['en', 'ar'],
    
    // Load language
    load: 'languageOnly',
  });

export default i18n;
