'use client';

import React, { Suspense } from 'react';
import { LoadingPage } from './LoadingPage';

interface SuspenseWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const SuspenseWrapper: React.FC<SuspenseWrapperProps> = ({
  children,
  fallback = <LoadingPage />,
}) => {
  return <Suspense fallback={fallback}>{children}</Suspense>;
};

// Optimized loading component for smaller UI elements
export const SmallLoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <div
      className={`animate-spin rounded-full border-2 border-gray-300 border-t-purple-500 ${sizeClasses[size]}`}
    />
  );
};

// Skeleton loader for better perceived performance
export const SkeletonLoader: React.FC<{
  className?: string;
  lines?: number;
}> = ({ className = '', lines = 1 }) => {
  return (
    <div className={`animate-pulse ${className}`}>
      {Array.from({ length: lines }).map((_, index) => {
        const widthVariants = ['w-3/4', 'w-4/5', 'w-5/6', 'w-11/12'];
        const randomWidth = widthVariants[index % widthVariants.length];
        return (
          <div
            key={index}
            className={`h-4 bg-gray-200 rounded mb-2 ${randomWidth}`}
          />
        );
      })}
    </div>
  );
};
