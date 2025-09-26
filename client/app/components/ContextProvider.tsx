'use client';

import React from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { AuthProvider } from '../contexts/AuthContext';
import { LanguageProvider } from '../contexts/LanguageContext';
import { GlobalLoadingProvider } from '../contexts/GlobalLoadingContext';

interface ContextProviderProps {
  children: React.ReactNode;
}

export const ContextProvider: React.FC<ContextProviderProps> = ({
  children,
}) => {
  return (
    <ErrorBoundary>
      <GlobalLoadingProvider>
        <AuthProvider>
          <LanguageProvider>{children}</LanguageProvider>
        </AuthProvider>
      </GlobalLoadingProvider>
    </ErrorBoundary>
  );
};
