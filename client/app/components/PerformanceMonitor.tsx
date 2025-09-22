'use client';

import React, { useEffect } from 'react';
import { usePerformanceMonitor } from '../hooks/usePerformanceMonitor';

interface PerformanceMonitorProps {
  children: React.ReactNode;
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  children,
}) => {
  // Only enable performance monitoring when explicitly requested via URL parameter
  const shouldMonitor = typeof window !== 'undefined' && 
    window.location.search.includes('debug=performance');
    
  const { getPerformanceScore, getMetrics } = usePerformanceMonitor({
    enableApiMonitoring: shouldMonitor,
    enableRenderMonitoring: shouldMonitor,
    enableWebVitals: shouldMonitor,
    logToConsole: shouldMonitor,
  });

  useEffect(() => {
    // Only run performance monitoring if explicitly enabled
    if (!shouldMonitor) return;

    // Log performance metrics after page load
    const timer = setTimeout(() => {
      const score = getPerformanceScore();
      const metrics = getMetrics();

      console.log('🚀 Performance Score:', score);
      console.log('📊 Performance Metrics:', metrics);

      // Warn about performance issues
      if (score < 70) {
        console.warn(
          '⚠️ Performance score is below 70. Consider optimization.'
        );
      }

      if (metrics.renderCount > 50) {
        console.warn('⚠️ High render count detected. Consider memoization.');
      }

      if (metrics.pageLoadTime > 3000) {
        console.warn('⚠️ Slow page load time detected.');
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [getPerformanceScore, getMetrics, shouldMonitor]);

  return <>{children}</>;
};
