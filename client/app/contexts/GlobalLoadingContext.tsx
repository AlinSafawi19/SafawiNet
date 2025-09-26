'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { usePathname } from 'next/navigation';

interface GlobalLoadingContextType {
  isAppInitializing: boolean;
  isRouteTransitioning: boolean;
  isAnyLoading: boolean;
  setAppInitializing: (loading: boolean) => void;
  setRouteTransitioning: (loading: boolean) => void;
}

const GlobalLoadingContext = createContext<GlobalLoadingContextType | undefined>(undefined);

export const useGlobalLoading = () => {
  const context = useContext(GlobalLoadingContext);
  if (context === undefined) {
    throw new Error('useGlobalLoading must be used within a GlobalLoadingProvider');
  }
  return context;
};

interface GlobalLoadingProviderProps {
  children: ReactNode;
}

export const GlobalLoadingProvider: React.FC<GlobalLoadingProviderProps> = ({ children }) => {
  const [isAppInitializing, setIsAppInitializing] = useState(true);
  const [isRouteTransitioning, setIsRouteTransitioning] = useState(false);
  const pathname = usePathname();

  // Track previous pathname to detect route changes
  const [previousPathname, setPreviousPathname] = useState<string | null>(null);

  // Combined loading state
  const isAnyLoading = isAppInitializing || isRouteTransitioning;

  // Handle route transitions
  useEffect(() => {
    if (previousPathname && previousPathname !== pathname) {
      // Route change detected
      setIsRouteTransitioning(true);
      
      // Set a minimum transition time for smooth UX
      const transitionTimer = setTimeout(() => {
        setIsRouteTransitioning(false);
      }, 150);

      return () => clearTimeout(transitionTimer);
    }
    
    setPreviousPathname(pathname);
  }, [pathname, previousPathname]);

  // Set app initialization to false after a short delay
  useEffect(() => {
    const initTimer = setTimeout(() => {
      setIsAppInitializing(false);
    }, 100);

    return () => clearTimeout(initTimer);
  }, []);

  const setAppInitializing = useCallback((loading: boolean) => {
    setIsAppInitializing(loading);
  }, []);

  const setRouteTransitioning = useCallback((loading: boolean) => {
    setIsRouteTransitioning(loading);
  }, []);

  const value: GlobalLoadingContextType = {
    isAppInitializing,
    isRouteTransitioning,
    isAnyLoading,
    setAppInitializing,
    setRouteTransitioning,
  };

  return (
    <GlobalLoadingContext.Provider value={value}>
      {children}
    </GlobalLoadingContext.Provider>
  );
};
