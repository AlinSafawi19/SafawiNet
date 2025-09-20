'use client';

import { useGlobalErrorHandler } from '../hooks/useGlobalErrorHandler';

interface GlobalErrorHandlerProps {
  children: React.ReactNode;
}

export const GlobalErrorHandler: React.FC<GlobalErrorHandlerProps> = ({
  children,
}) => {
  useGlobalErrorHandler();
  return <>{children}</>;
};
