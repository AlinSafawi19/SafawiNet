// Performance monitoring utilities
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, any> = new Map();
  private startTimes: Map<string, number> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  // Start timing a performance metric
  startTiming(key: string): void {
    this.startTimes.set(key, Date.now());
    console.log(`⏱️ [PerformanceMonitor] Started timing: ${key}`);
  }

  // End timing and log the result
  endTiming(key: string, additionalData?: any): number {
    const startTime = this.startTimes.get(key);
    if (!startTime) {
      console.warn(`⚠️ [PerformanceMonitor] No start time found for key: ${key}`);
      return 0;
    }

    const duration = Date.now() - startTime;
    this.metrics.set(key, duration);
    this.startTimes.delete(key);

    console.log(`⏱️ [PerformanceMonitor] ${key} completed in ${duration}ms`, additionalData || '');
    
    // Log warnings for slow operations
    if (duration > 1000) {
      console.warn(`⚠️ [PerformanceMonitor] Slow operation detected: ${key} took ${duration}ms`);
    }

    return duration;
  }

  // Log a performance metric
  logMetric(key: string, value: any, unit: string = ''): void {
    this.metrics.set(key, value);
    console.log(`📊 [PerformanceMonitor] ${key}: ${value}${unit}`);
  }

  // Get all metrics
  getMetrics(): Record<string, any> {
    return Object.fromEntries(this.metrics);
  }

  // Get a specific metric
  getMetric(key: string): any {
    return this.metrics.get(key);
  }

  // Clear all metrics
  clearMetrics(): void {
    this.metrics.clear();
    this.startTimes.clear();
    console.log('🧹 [PerformanceMonitor] All metrics cleared');
  }

  // Log component render performance
  logComponentRender(componentName: string, renderCount: number, elapsed: number): void {
    console.log(`🔄 [PerformanceMonitor] ${componentName} rendered ${renderCount} times in ${elapsed}ms`);
    
    if (renderCount > 10) {
      console.warn(`⚠️ [PerformanceMonitor] ${componentName} has high render count: ${renderCount}`);
    }
    
    if (elapsed > 1000) {
      console.warn(`⚠️ [PerformanceMonitor] ${componentName} took long to render: ${elapsed}ms`);
    }
  }

  // Log API call performance
  logApiCall(url: string, method: string, duration: number, status: number): void {
    console.log(`🌐 [PerformanceMonitor] API ${method} ${url} - ${status} in ${duration}ms`);
    
    if (duration > 2000) {
      console.warn(`⚠️ [PerformanceMonitor] Slow API call: ${method} ${url} took ${duration}ms`);
    }
    
    if (status >= 400) {
      console.warn(`⚠️ [PerformanceMonitor] API error: ${method} ${url} returned ${status}`);
    }
  }

  // Log bundle size information
  logBundleInfo(): void {
    if (typeof window !== 'undefined' && 'performance' in window) {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      console.log('📦 [PerformanceMonitor] Bundle Performance:', {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        totalTime: navigation.loadEventEnd - navigation.fetchStart,
        transferSize: navigation.transferSize,
        encodedBodySize: navigation.encodedBodySize,
        decodedBodySize: navigation.decodedBodySize
      });
    }
  }

  // Log Web Vitals
  logWebVitals(): void {
    if (typeof window !== 'undefined' && 'performance' in window) {
      const paintEntries = performance.getEntriesByType('paint');
      
      paintEntries.forEach(entry => {
        console.log(`🎨 [PerformanceMonitor] Paint: ${entry.name} - ${entry.startTime.toFixed(2)}ms`);
      });

      // Log LCP (Largest Contentful Paint)
      const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
      if (lcpEntries.length > 0) {
        const lcp = lcpEntries[lcpEntries.length - 1];
        console.log(`🎯 [PerformanceMonitor] LCP: ${lcp.startTime.toFixed(2)}ms`);
      }

      // Log FID (First Input Delay)
      const fidEntries = performance.getEntriesByType('first-input');
      if (fidEntries.length > 0) {
        const fid = fidEntries[0];
        console.log(`👆 [PerformanceMonitor] FID: ${fid.processingStart - fid.startTime}ms`);
      }
    }
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();

// Hook for easy use in components
export const usePerformanceMonitor = (componentName: string) => {
  const startTime = useRef(Date.now());
  const renderCount = useRef(0);

  useEffect(() => {
    renderCount.current += 1;
    const elapsed = Date.now() - startTime.current;
    
    performanceMonitor.logComponentRender(componentName, renderCount.current, elapsed);
  });

  return {
    startTiming: (key: string) => performanceMonitor.startTiming(`${componentName}-${key}`),
    endTiming: (key: string, data?: any) => performanceMonitor.endTiming(`${componentName}-${key}`, data),
    logMetric: (key: string, value: any, unit?: string) => performanceMonitor.logMetric(`${componentName}-${key}`, value, unit),
    log: (message: string, data?: any) => {
      const elapsed = Date.now() - startTime.current;
      console.log(`📊 [${componentName}] ${message}`, data ? { ...data, elapsed: `${elapsed}ms` } : `(${elapsed}ms)`);
    }
  };
};

// Import useRef and useEffect for the hook
import { useRef, useEffect } from 'react';
