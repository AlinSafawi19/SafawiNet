'use client';

import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { LoadingPage } from './LoadingPage';

interface AppInitializerProps {
  children: React.ReactNode;
}

export const AppInitializer: React.FC<AppInitializerProps> = ({ children }) => {
  const { isLoading: isAuthLoading } = useAuth();
  const { isLoading: isThemeLoading } = useTheme();
  const { isLoading: isLanguageLoading } = useLanguage();

  // Wait until all contexts are initialized before rendering children
  const isInitializing = isAuthLoading || isThemeLoading || isLanguageLoading;

  if (isInitializing) {
    return <LoadingPage />;
  }

  return <>{children}</>;
};

