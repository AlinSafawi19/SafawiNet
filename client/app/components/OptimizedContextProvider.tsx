'use client';

import React, { Suspense } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { AuthProvider } from '../contexts/AuthContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import { LanguageProvider } from '../contexts/LanguageContext';

// Lightweight loading component
const ContextLoadingFallback = () => (
  <div className="min-h-screen bg-site dark:bg-dark-bg flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
  </div>
);

interface OptimizedContextProviderProps {
  children: React.ReactNode;
}

export const OptimizedContextProvider: React.FC<OptimizedContextProviderProps> = ({ children }) => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider>
          <LanguageProvider>
            {children}
          </LanguageProvider>
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
};