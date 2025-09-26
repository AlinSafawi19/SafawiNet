'use client';

import React from 'react';
import { useGlobalLoading } from '../contexts/GlobalLoadingContext';
import { LoadingPage } from './LoadingPage';

interface LoadingWrapperProps {
  children: React.ReactNode;
}

export const LoadingWrapper: React.FC<LoadingWrapperProps> = ({
  children,
}) => {
  const { isAnyLoading } = useGlobalLoading();

  if (isAnyLoading) {
    return <LoadingPage />;
  }

  return <>{children}</>;
};

