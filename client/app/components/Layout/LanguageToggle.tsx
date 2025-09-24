'use client';

import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

interface LanguageToggleProps {
  variant?: 'mobile' | 'desktop';
}

const LanguageToggle = ({ variant }: LanguageToggleProps) => {
  const { locale, setLocale, t, isLoading } = useLanguage();

  const toggleLanguage = async () => {
    if (isLoading) return;
    
    try {
      const newLocale = locale === 'en' ? 'ar' : 'en';
      await setLocale(newLocale);
    } catch (error) {
      console.error('Failed to toggle language:', error);
      // Revert the language state if the backend call failed
      setLocale(locale);
    }
  };

  return (
    <button
      type='button'
      onClick={toggleLanguage}
      disabled={isLoading}
      className={`flex items-center space-x-2 hover:text-purple-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
        variant === 'mobile'
          ? 'border border-gray-300 rounded-lg px-3 py-2'
          : ''
      }`}
      aria-label={t('header.actions.toggleLanguage')}
    >
      <span className="text-sm font-medium">
        {isLoading ? '...' : (locale === 'en' ? 'AR' : 'EN')}
      </span>
    </button>
  );
};

export default LanguageToggle;
