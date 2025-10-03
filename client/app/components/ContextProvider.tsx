'use client';

import React from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { AuthProvider } from '../contexts/AuthContext';
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
        <AuthProvider>{children}</AuthProvider>
      </GlobalLoadingProvider>
    </ErrorBoundary>
  );
};
