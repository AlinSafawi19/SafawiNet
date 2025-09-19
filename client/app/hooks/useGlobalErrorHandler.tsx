'use client';

import { useEffect } from 'react';
import { clientLogger } from '../services/logger.service';

export const useGlobalErrorHandler = () => {
  useEffect(() => {
    // Handle unhandled JavaScript errors
    const handleError = (event: ErrorEvent) => {
      clientLogger.error(
        `Unhandled JavaScript Error: ${event.message}`,
        new Error(event.message),
        {
          component: 'GlobalErrorHandler',
          action: 'handleError',
          metadata: {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            type: 'javascript',
          },
        }
      );
    };

    // Handle unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason instanceof Error 
        ? event.reason 
        : new Error(String(event.reason));

      clientLogger.error(
        `Unhandled Promise Rejection: ${error.message}`,
        error,
        {
          component: 'GlobalErrorHandler',
          action: 'handleUnhandledRejection',
          metadata: {
            type: 'promise',
            reason: event.reason,
          },
        }
      );
    };

    // Handle resource loading errors
    const handleResourceError = (event: Event) => {
      const target = event.target as HTMLElement;
      if (target) {
        clientLogger.error(
          `Resource Loading Error: ${target.tagName}`,
          new Error(`Failed to load ${target.tagName}`),
          {
            component: 'GlobalErrorHandler',
            action: 'handleResourceError',
            metadata: {
              tagName: target.tagName,
              src: (target as any).src || (target as any).href,
              type: 'resource',
            },
          }
        );
      }
    };

    // Add event listeners
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleResourceError, true);

    // Cleanup
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleResourceError, true);
    };
  }, []);
};
