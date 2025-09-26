'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { LoadingWrapper } from './LoadingWrapper';

interface AppInitializerProps {
  children: React.ReactNode;
}

export const AppInitializer: React.FC<AppInitializerProps> = ({ children }) => {
    
    // Use Next.js usePathname hook to get reactive pathname
    const pathname = usePathname();
    const { isLoading: isAuthLoading } = useAuth();
    const { isLoading: isLanguageLoading } = useLanguage();
    
    // Track route changes to show loader for navigation
    const [isNavigating, setIsNavigating] = useState(false);
    const [previousPathname, setPreviousPathname] = useState(pathname);
    
    useEffect(() => {
      if (pathname !== previousPathname) {
        setIsNavigating(true);
        setPreviousPathname(pathname);
        
        // Reset navigation state after minimum time
        const timer = setTimeout(() => {
          setIsNavigating(false);
        }, 200); // Minimum 200ms for smooth navigation
        
        return () => clearTimeout(timer);
      }
    }, [pathname, previousPathname]);
    
    // Memoize page type checks based on current pathname
    const isAuthPage = useMemo(
      () => pathname === '/auth',
      [pathname]
    );
    const isAccountPage = useMemo(
      () => pathname.startsWith('/account'),
      [pathname]
    );

    // Only wait for critical contexts on initial load, not on every context update
    const isCriticalLoading = useMemo(
      () => isAuthLoading || isLanguageLoading,
      [isAuthLoading, isLanguageLoading]
    );

    // Show loading for smooth navigation experience
    // This ensures consistent UX during route changes
    const shouldShowLoading = useMemo(
      () => {
        // Show loading if we're navigating between routes
        if (isNavigating) {
          return true;
        }
        // Show loading for auth/account pages or when contexts are loading
        if (isAuthPage || isAccountPage) {
          return true;
        }
        // For other pages, show loading if contexts are still loading
        return isCriticalLoading;
      },
      [isNavigating, isAuthPage, isAccountPage, isCriticalLoading]
    );

    if (shouldShowLoading) {
      return <LoadingWrapper minLoadingTime={100}>{children}</LoadingWrapper>;
    }

    return <>{children}</>;
  };

AppInitializer.displayName = 'AppInitializer';
