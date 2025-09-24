'use client';

import { useState, useEffect, useRef } from 'react';
import { performanceMonitor } from '../utils/performanceMonitor';

export const PerformanceDashboard: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [metrics, setMetrics] = useState<Record<string, any>>({});
  const [renderCounts, setRenderCounts] = useState<Record<string, number>>({});
  const [apiCalls, setApiCalls] = useState<Array<{url: string, method: string, duration: number, status: number, timestamp: string}>>([]);
  const [memoryUsage, setMemoryUsage] = useState<any>(null);
  const [webVitals, setWebVitals] = useState<any>({});

  // Only show in development or when explicitly enabled
  const shouldShow = process.env.NODE_ENV === 'development' || 
    (typeof window !== 'undefined' && window.location.search.includes('debug=performance'));

  if (!shouldShow) {
    return null;
  }

  const updateMetrics = () => {
    setMetrics(performanceMonitor.getMetrics());
  };

  const updateMemoryUsage = () => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      setMemoryUsage({
        usedJSHeapSize: `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
        totalJSHeapSize: `${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
        jsHeapSizeLimit: `${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)}MB`
      });
    }
  };

  const updateWebVitals = () => {
    if (typeof window !== 'undefined' && 'performance' in window) {
      try {
        const paintEntries = performance.getEntriesByType('paint');
        const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
        const fidEntries = performance.getEntriesByType('first-input');
        
        setWebVitals({
          fcp: paintEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0,
          lcp: lcpEntries.length > 0 ? lcpEntries[lcpEntries.length - 1].startTime : 0,
          fid: fidEntries.length > 0 ? (fidEntries[0] as any).processingStart - fidEntries[0].startTime : 0
        });
      } catch (error) {
        // Silently handle deprecated API errors
        console.debug('Web Vitals update failed:', error);
      }
    }
  };

  useEffect(() => {
    // Update metrics every 5 seconds to reduce overhead
    const interval = setInterval(() => {
      updateMetrics();
      updateMemoryUsage();
      updateWebVitals();
    }, 5000);

    // Initial update
    updateMetrics();
    updateMemoryUsage();
    updateWebVitals();

    return () => clearInterval(interval);
  }, []);

  // Listen for custom performance events
  useEffect(() => {
    const handlePerformanceEvent = (event: CustomEvent) => {
      if (event.detail.type === 'api-call') {
        setApiCalls(prev => [...prev, {
          url: event.detail.url,
          method: event.detail.method,
          duration: event.detail.duration,
          status: event.detail.status,
          timestamp: new Date().toISOString()
        }].slice(-10)); // Keep only last 10 API calls
      }
      
      if (event.detail.type === 'render') {
        setRenderCounts(prev => ({
          ...prev,
          [event.detail.component]: (prev[event.detail.component] || 0) + 1
        }));
      }
    };

    window.addEventListener('performance-event', handlePerformanceEvent as EventListener);
    return () => window.removeEventListener('performance-event', handlePerformanceEvent as EventListener);
  }, []);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 bg-purple-600 text-white p-3 rounded-full shadow-lg hover:bg-purple-700 transition-colors z-50"
        title="Open Performance Dashboard"
      >
        📊
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl p-4 w-96 max-h-96 overflow-y-auto z-50">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-gray-800 dark:text-white">Performance Dashboard</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          ✕
        </button>
      </div>

      <div className="space-y-4">
        {/* Web Vitals */}
        <div>
          <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Web Vitals</h4>
          <div className="text-sm space-y-1">
            <div>FCP: {webVitals.fcp ? `${webVitals.fcp.toFixed(2)}ms` : 'N/A'}</div>
            <div>LCP: {webVitals.lcp ? `${webVitals.lcp.toFixed(2)}ms` : 'N/A'}</div>
            <div>FID: {webVitals.fid ? `${webVitals.fid.toFixed(2)}ms` : 'N/A'}</div>
          </div>
        </div>

        {/* Memory Usage */}
        {memoryUsage && (
          <div>
            <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Memory Usage</h4>
            <div className="text-sm space-y-1">
              <div>Used: {memoryUsage.usedJSHeapSize}</div>
              <div>Total: {memoryUsage.totalJSHeapSize}</div>
              <div>Limit: {memoryUsage.jsHeapSizeLimit}</div>
            </div>
          </div>
        )}

        {/* Render Counts */}
        <div>
          <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Render Counts</h4>
          <div className="text-sm space-y-1 max-h-20 overflow-y-auto">
            {Object.entries(renderCounts).map(([component, count]) => (
              <div key={component} className={count > 10 ? 'text-red-500' : ''}>
                {component}: {count}
              </div>
            ))}
          </div>
        </div>

        {/* API Calls */}
        <div>
          <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Recent API Calls</h4>
          <div className="text-sm space-y-1 max-h-20 overflow-y-auto">
            {apiCalls.slice(-5).map((call, index) => (
              <div key={index} className={call.status >= 400 ? 'text-red-500' : ''}>
                {call.method} {call.url.split('/').pop()} - {call.status} ({call.duration}ms)
              </div>
            ))}
          </div>
        </div>

        {/* Custom Metrics */}
        <div>
          <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Custom Metrics</h4>
          <div className="text-sm space-y-1 max-h-20 overflow-y-auto">
            {Object.entries(metrics).map(([key, value]) => (
              <div key={key}>
                {key}: {typeof value === 'number' ? `${value}ms` : value}
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex space-x-2">
          <button
            onClick={() => performanceMonitor.clearMetrics()}
            className="px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
          >
            Clear
          </button>
          <button
            onClick={() => {
              console.log('📊 [PerformanceDashboard] Full metrics dump:', {
                metrics: performanceMonitor.getMetrics(),
                renderCounts,
                apiCalls,
                memoryUsage,
                webVitals
              });
            }}
            className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
          >
            Log All
          </button>
        </div>
      </div>
    </div>
  );
};
