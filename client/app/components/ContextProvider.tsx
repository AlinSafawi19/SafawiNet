'use client';

import React from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { AuthProvider } from '../contexts/AuthContext';
import { LanguageProvider } from '../contexts/LanguageContext';

interface ContextProviderProps {
  children: React.ReactNode;
}

export const ContextProvider: React.FC<
  ContextProviderProps
> = ({ children }) => {
  return (
    <ErrorBoundary>
      <AuthProvider>
          <LanguageProvider>{children}</LanguageProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
};
