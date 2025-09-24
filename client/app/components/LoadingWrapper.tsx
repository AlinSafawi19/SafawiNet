'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LoadingPage } from './LoadingPage';

interface LoadingWrapperProps {
  children: React.ReactNode;
  showSkeleton?: boolean;
  skeletonLines?: number;
  minLoadingTime?: number; // Minimum loading time to prevent flash
}

export const LoadingWrapper: React.FC<
  LoadingWrapperProps
> = ({
  children,
  showSkeleton = false,
  skeletonLines = 3,
  minLoadingTime = 200,
}) => {
  const { isLoading } = useAuth();
  const [showContent, setShowContent] = useState(false);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    if (!isLoading) {
      const elapsed = Date.now() - startTime;
      const remainingTime = Math.max(0, minLoadingTime - elapsed);

      const timer = setTimeout(() => {
        setShowContent(true);
      }, remainingTime);

      return () => clearTimeout(timer);
    }
  }, [isLoading, startTime, minLoadingTime]);

  const loadingContent = useMemo(() => {
    if (showSkeleton) {
      return (
        <div className="p-4 space-y-4">
          <LoadingPage/>
        </div>
      );
    }

    return <LoadingPage />;
  }, [showSkeleton, skeletonLines]);

  if (isLoading || !showContent) {
    return loadingContent;
  }

  return <>{children}</>;
};

// Hook for managing loading states with better UX
export const useOptimizedLoading = (
  isLoading: boolean,
  minTime: number = 300
) => {
  const [showContent, setShowContent] = useState(!isLoading);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    if (!isLoading) {
      const elapsed = Date.now() - startTime;
      const remainingTime = Math.max(0, minTime - elapsed);

      const timer = setTimeout(() => {
        setShowContent(true);
      }, remainingTime);

      return () => clearTimeout(timer);
    } else {
      setShowContent(false);
    }
  }, [isLoading, startTime, minTime]);

  return { showContent, isLoading: isLoading || !showContent };
};
