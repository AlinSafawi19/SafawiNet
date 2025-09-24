'use client';

import React from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { AuthProvider } from '../contexts/AuthContext';
import { LanguageProvider } from '../contexts/LanguageContext';

interface OptimizedContextProviderProps {
  children: React.ReactNode;
}

export const OptimizedContextProvider: React.FC<
  OptimizedContextProviderProps
> = ({ children }) => {
  return (
    <ErrorBoundary>
      <AuthProvider>
          <LanguageProvider>{children}</LanguageProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
};
