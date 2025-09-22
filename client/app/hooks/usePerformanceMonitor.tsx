'use client';

import { useEffect, useRef, useCallback } from 'react';

interface PerformanceMetrics {
  pageLoadTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  firstInputDelay: number;
  cumulativeLayoutShift: number;
  apiResponseTimes: Map<string, number>;
  renderCount: number;
}

interface PerformanceMonitorOptions {
  enableApiMonitoring?: boolean;
  enableRenderMonitoring?: boolean;
  enableWebVitals?: boolean;
  logToConsole?: boolean;
}

export const usePerformanceMonitor = (
  options: PerformanceMonitorOptions = {}
) => {
  const {
    enableApiMonitoring = true,
    enableRenderMonitoring = true,
    enableWebVitals = true,
    logToConsole = process.env.NODE_ENV === 'development',
  } = options;

  const metricsRef = useRef<PerformanceMetrics>({
    pageLoadTime: 0,
    firstContentfulPaint: 0,
    largestContentfulPaint: 0,
    firstInputDelay: 0,
    cumulativeLayoutShift: 0,
    apiResponseTimes: new Map(),
    renderCount: 0,
  });

  const renderCountRef = useRef(0);

  // Monitor render count
  useEffect(() => {
    if (enableRenderMonitoring) {
      renderCountRef.current += 1;
      metricsRef.current.renderCount = renderCountRef.current;

      if (logToConsole) {
        console.log(`[Performance] Render count: ${renderCountRef.current}`);
      }
    }
  });

  // Monitor Web Vitals
  useEffect(() => {
    if (!enableWebVitals || typeof window === 'undefined') return;

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        switch (entry.entryType) {
          case 'navigation':
            if (entry instanceof PerformanceNavigationTiming) {
              metricsRef.current.pageLoadTime =
                entry.loadEventEnd - entry.loadEventStart;
            }
            break;
          case 'paint':
            if (entry.name === 'first-contentful-paint') {
              metricsRef.current.firstContentfulPaint = entry.startTime;
            }
            break;
          case 'largest-contentful-paint':
            metricsRef.current.largestContentfulPaint = entry.startTime;
            break;
          case 'first-input':
            metricsRef.current.firstInputDelay =
              (entry as any).processingStart - entry.startTime;
            break;
          case 'layout-shift':
            if (!(entry as any).hadRecentInput) {
              metricsRef.current.cumulativeLayoutShift += (entry as any).value;
            }
            break;
        }
      }
    });

    try {
      observer.observe({
        entryTypes: [
          'navigation',
          'paint',
          'largest-contentful-paint',
          'first-input',
          'layout-shift',
        ],
      });
    } catch (error) {
      // Some browsers don't support all entry types
      console.warn('Performance monitoring partially unavailable:', error);
    }

    return () => observer.disconnect();
  }, [enableWebVitals, logToConsole]);

  // Monitor API response times
  const trackApiCall = useCallback(
    (endpoint: string, startTime: number) => {
      if (!enableApiMonitoring) return;

      const endTime = performance.now();
      const duration = endTime - startTime;

      metricsRef.current.apiResponseTimes.set(endpoint, duration);

      if (logToConsole) {
        console.log(`[Performance] API ${endpoint}: ${duration.toFixed(2)}ms`);
      }
    },
    [enableApiMonitoring, logToConsole]
  );

  // Get current metrics
  const getMetrics = useCallback(() => {
    return { ...metricsRef.current };
  }, []);

  // Reset metrics
  const resetMetrics = useCallback(() => {
    metricsRef.current = {
      pageLoadTime: 0,
      firstContentfulPaint: 0,
      largestContentfulPaint: 0,
      firstInputDelay: 0,
      cumulativeLayoutShift: 0,
      apiResponseTimes: new Map(),
      renderCount: 0,
    };
    renderCountRef.current = 0;
  }, []);

  // Get performance score
  const getPerformanceScore = useCallback(() => {
    const metrics = metricsRef.current;
    let score = 100;

    // Deduct points for slow metrics
    if (metrics.pageLoadTime > 3000) score -= 20;
    else if (metrics.pageLoadTime > 2000) score -= 10;

    if (metrics.firstContentfulPaint > 1800) score -= 20;
    else if (metrics.firstContentfulPaint > 1200) score -= 10;

    if (metrics.largestContentfulPaint > 2500) score -= 20;
    else if (metrics.largestContentfulPaint > 2000) score -= 10;

    if (metrics.firstInputDelay > 100) score -= 15;
    else if (metrics.firstInputDelay > 50) score -= 5;

    if (metrics.cumulativeLayoutShift > 0.25) score -= 15;
    else if (metrics.cumulativeLayoutShift > 0.1) score -= 5;

    // Deduct points for excessive renders
    if (metrics.renderCount > 50) score -= 10;
    else if (metrics.renderCount > 30) score -= 5;

    return Math.max(0, Math.min(100, score));
  }, []);

  return {
    trackApiCall,
    getMetrics,
    resetMetrics,
    getPerformanceScore,
  };
};

// Hook for monitoring specific component performance
export const useComponentPerformance = (componentName: string) => {
  const startTimeRef = useRef<number>(0);
  const { trackApiCall } = usePerformanceMonitor();

  const startTiming = useCallback(() => {
    startTimeRef.current = performance.now();
  }, []);

  const endTiming = useCallback(
    (action: string) => {
      if (startTimeRef.current > 0) {
        const duration = performance.now() - startTimeRef.current;
        trackApiCall(`${componentName}:${action}`, startTimeRef.current);
        startTimeRef.current = 0;
        return duration;
      }
      return 0;
    },
    [componentName, trackApiCall]
  );

  return { startTiming, endTiming };
};
