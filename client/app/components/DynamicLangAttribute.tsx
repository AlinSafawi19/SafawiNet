'use client';

import { useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const DynamicLangAttribute: React.FC = () => {
  const { locale } = useLanguage();

  useEffect(() => {
    // Update the HTML lang attribute when locale changes
    document.documentElement.lang = locale;
  }, [locale]);

  // This component doesn't render anything visible
  return null;
};

export default DynamicLangAttribute;
