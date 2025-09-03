'use client';

import React from 'react';
import { LoadingPage } from './LoadingPage';

interface LoadingWrapperProps {
  children: React.ReactNode;
  isLoading: boolean;
}

export const LoadingWrapper: React.FC<LoadingWrapperProps> = ({ 
  children, 
  isLoading 
}) => {
  if (isLoading) {
    return <LoadingPage />;
  }

  return <>{children}</>;
};
