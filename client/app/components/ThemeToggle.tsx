'use client';

import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { HiSun, HiMoon } from 'react-icons/hi2';

interface ThemeToggleProps {
  variant?: 'default' | 'mobile';
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ variant = 'default' }) => {
  const { theme, setTheme } = useTheme();
  const { t } = useLanguage();

  const toggleTheme = async () => {
    try {
      await setTheme(theme === 'light' ? 'dark' : 'light');
    } catch (error) {
      // Failed to toggle theme
    }
  };

  if (variant === 'mobile') {
    return (
      <button
        onClick={toggleTheme}
        className="flex items-center transition-colors hover:text-purple-500 text-white border border-gray-300 rounded-lg px-3 py-2"
        aria-label={t('accessibility.toggleTheme')}
      >
        {theme === 'light'
          ? HiMoon({ className: 'w-5 h-5' })
          : HiSun({ className: 'w-5 h-5' })}
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center transition-colors hover:text-purple-500"
      aria-label={t('accessibility.toggleTheme')}
    >
      {theme === 'light'
        ? HiMoon({ className: 'w-6 h-6' })
        : HiSun({ className: 'w-6 h-6' })}
    </button>
  );
};

export default ThemeToggle;
