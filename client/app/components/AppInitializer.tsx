'use client';

import React, { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { LoadingWrapper } from './LoadingWrapper';

interface AppInitializerProps {
  children: React.ReactNode;
}

export const AppInitializer: React.FC<AppInitializerProps> = React.memo(({ children }) => {
  const { isLoading: isAuthLoading } = useAuth();
  const { isLoading: isLanguageLoading } = useLanguage();

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
    isAuthLoading || isLanguageLoading,
    [isAuthLoading, isLanguageLoading]
  );

  // For auth and account pages, only show loading if auth is still loading
  const shouldShowLoading = useMemo(() => 
    isAuthPage || isAccountPage ? isAuthLoading : isCriticalLoading,
    [isAuthPage, isAccountPage, isAuthLoading, isCriticalLoading]
  );


  if (shouldShowLoading) {
    return (
      <LoadingWrapper
        showSkeleton={isAuthPage || isAccountPage}
        skeletonLines={isAuthPage ? 2 : 4}
        minLoadingTime={100}
      >
        {children}
      </LoadingWrapper>
    );
  }

  return <>{children}</>;
}, (prevProps, nextProps) => {
  // Custom comparison: only re-render if children actually change
  return prevProps.children === nextProps.children;
});

AppInitializer.displayName = 'AppInitializer';
