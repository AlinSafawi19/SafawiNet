'use client';

import { useEffect, useRef } from 'react';
import { performanceMonitor } from '../utils/performanceMonitor';

export const GlobalPerformanceMonitor: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const startTime = useRef(Date.now());

  useEffect(() => {
    // Log initial page load performance
    const logInitialPerformance = () => {
      const elapsed = Date.now() - startTime.current;
      console.log('🚀 [GlobalPerformanceMonitor] Initial page load completed', { elapsed: `${elapsed}ms` });
      
      // Log bundle info
      performanceMonitor.logBundleInfo();
      
      // Log Web Vitals
      performanceMonitor.logWebVitals();
      
      // Log overall performance summary
      console.log('📊 [GlobalPerformanceMonitor] Performance Summary:', {
        totalLoadTime: `${elapsed}ms`,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      });
    };

    // Log performance after a short delay to ensure everything is loaded
    const timer = setTimeout(logInitialPerformance, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Monitor for performance issues
  useEffect(() => {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'measure') {
            console.log(`📏 [GlobalPerformanceMonitor] Custom measure: ${entry.name} - ${entry.duration.toFixed(2)}ms`);
          }
          
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            console.log('🧭 [GlobalPerformanceMonitor] Navigation timing:', {
              domContentLoaded: navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart,
              loadComplete: navEntry.loadEventEnd - navEntry.loadEventStart,
              totalTime: navEntry.loadEventEnd - navEntry.fetchStart
            });
          }
        }
      });

      observer.observe({ entryTypes: ['measure', 'navigation'] });

      return () => observer.disconnect();
    } catch (error) {
      // Silently handle deprecated API errors
      console.debug('Performance observer setup failed:', error);
    }
  }, []);

  // Monitor for memory usage (if available)
  useEffect(() => {
    if ('memory' in performance) {
      const logMemoryUsage = () => {
        const memory = (performance as any).memory;
        console.log('💾 [GlobalPerformanceMonitor] Memory usage:', {
          usedJSHeapSize: `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
          totalJSHeapSize: `${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
          jsHeapSizeLimit: `${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)}MB`
        });
      };

      // Log memory usage every 30 seconds
      const interval = setInterval(logMemoryUsage, 30000);
      logMemoryUsage(); // Log immediately

      return () => clearInterval(interval);
    }
  }, []);

  return <>{children}</>;
};
