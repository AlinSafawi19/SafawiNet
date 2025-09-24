'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { OptimizedLoadingWrapper } from './OptimizedLoadingWrapper';

interface AppInitializerProps {
  children: React.ReactNode;
}

export const AppInitializer: React.FC<AppInitializerProps> = ({ children }) => {
  const { isLoading: isAuthLoading } = useAuth();
  const { isLoading: isLanguageLoading } = useLanguage();
  const [isInitialRender, setIsInitialRender] = useState(true);

  // Performance logging
  const appStartTime = useRef(Date.now());
  const appLog = (message: string, data?: any) => {
    const elapsed = Date.now() - appStartTime.current;
    console.log(`🚀 [AppInitializer] ${message}`, data ? { ...data, elapsed: `${elapsed}ms` } : `(${elapsed}ms)`);
  };

  // Only show loading on initial render, not on subsequent context updates
  useEffect(() => {
    appLog('AppInitializer useEffect started', { isInitialRender });
    if (isInitialRender) {
      appLog('Setting initial render timer');
      const timer = setTimeout(() => {
        appLog('Initial render timer completed - setting isInitialRender to false');
        setIsInitialRender(false);
      }, 100); // Very short delay to prevent flash
      return () => clearTimeout(timer);
    }
  }, [isInitialRender]);

  // Memoize page type checks to prevent re-renders
  const isAuthPage = useMemo(() => 
    typeof window !== 'undefined' && window.location.pathname === '/auth', 
    []
  );
  const isAccountPage = useMemo(() => 
    typeof window !== 'undefined' && window.location.pathname.startsWith('/account'), 
    []
  );

  // Only wait for critical contexts on initial load, not on every context update
  const isCriticalLoading = useMemo(() => 
    isInitialRender && (isAuthLoading || isLanguageLoading),
    [isInitialRender, isAuthLoading, isLanguageLoading]
  );

  // For auth and account pages, only show loading if auth is still loading
  const shouldShowLoading = useMemo(() => 
    isAuthPage || isAccountPage ? isAuthLoading : isCriticalLoading,
    [isAuthPage, isAccountPage, isAuthLoading, isCriticalLoading]
  );

  // Only log when values change significantly - reduce logging frequency
  const prevState = useRef({ isAuthLoading, isLanguageLoading, isInitialRender });
  useEffect(() => {
    const currentState = { isAuthLoading, isLanguageLoading, isInitialRender };
    const hasChanged = Object.keys(currentState).some(key => 
      prevState.current[key as keyof typeof currentState] !== currentState[key as keyof typeof currentState]
    );
    
    if (hasChanged) {
      appLog('AppInitializer state changed', { 
        isAuthPage, 
        isAccountPage,
        isAuthLoading, 
        isLanguageLoading, 
        isInitialRender,
        isCriticalLoading,
        shouldShowLoading
      });
      prevState.current = currentState;
    }
  }, [isAuthPage, isAccountPage, isAuthLoading, isLanguageLoading, isInitialRender, isCriticalLoading, shouldShowLoading]);

  if (shouldShowLoading) {
    appLog('Showing loading wrapper', { 
      showSkeleton: isAuthPage || isAccountPage,
      skeletonLines: isAuthPage ? 2 : 4 
    });
    return (
      <OptimizedLoadingWrapper
        showSkeleton={isAuthPage || isAccountPage}
        skeletonLines={isAuthPage ? 2 : 4}
        minLoadingTime={100}
      >
        {children}
      </OptimizedLoadingWrapper>
    );
  }

  appLog('Rendering children directly');
  return <>{children}</>;
};
