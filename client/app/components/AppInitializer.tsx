'use client';

import React, { useState, useEffect } from 'react';
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
  const [isInitialRender, setIsInitialRender] = useState(true);

  // Only show loading on initial render, not on subsequent context updates
  useEffect(() => {
    if (isInitialRender) {
      const timer = setTimeout(() => {
        setIsInitialRender(false);
      }, 100); // Very short delay to prevent flash
      return () => clearTimeout(timer);
    }
  }, [isInitialRender]);

  // For auth page and account pages, don't block rendering - let them handle their own loading state
  const isAuthPage =
    typeof window !== 'undefined' && window.location.pathname === '/auth';
  const isAccountPage =
    typeof window !== 'undefined' &&
    window.location.pathname.startsWith('/account');

  // Only wait for critical contexts on initial load, not on every context update
  const isCriticalLoading =
    isInitialRender && (isAuthLoading || isThemeLoading || isLanguageLoading);

  // For auth and account pages, only show loading if auth is still loading
  const shouldShowLoading =
    isAuthPage || isAccountPage ? isAuthLoading : isCriticalLoading;

  if (shouldShowLoading) {
    return <LoadingPage />;
  }

  return <>{children}</>;
};
