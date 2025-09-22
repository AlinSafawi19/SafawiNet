'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { buildApiUrl } from '../config/api';

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseOptimizedFetchOptions {
  enabled?: boolean;
  cacheTime?: number;
  staleTime?: number;
  retry?: number;
  retryDelay?: number;
}

// Global cache and request deduplication
const globalCache = new Map<
  string,
  { data: any; timestamp: number; staleTime: number }
>();
const pendingRequests = new Map<string, Promise<any>>();

export const useOptimizedFetch = <T = any,>(
  url: string,
  options: RequestInit = {},
  fetchOptions: UseOptimizedFetchOptions = {}
) => {
  const {
    enabled = true,
    cacheTime = 300000, // 5 minutes
    staleTime = 30000, // 30 seconds
    retry = 3,
    retryDelay = 1000,
  } = fetchOptions;

  const [state, setState] = useState<FetchState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const retryCountRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(
    async (isRetry = false) => {
      if (!enabled) return;

      const cacheKey = `${url}-${JSON.stringify(options)}`;
      const now = Date.now();
      const cached = globalCache.get(cacheKey);

      // Check if we have valid cached data
      if (cached && now - cached.timestamp < cached.staleTime) {
        setState((prev) => ({
          ...prev,
          data: cached.data,
          loading: false,
          error: null,
        }));
        return;
      }

      // Check if there's already a pending request for this URL
      if (pendingRequests.has(cacheKey)) {
        try {
          const data = await pendingRequests.get(cacheKey);
          setState((prev) => ({ ...prev, data, loading: false, error: null }));
          return;
        } catch (error) {
          // If pending request failed, continue with new request
        }
      }

      // Create abort controller for this request
      abortControllerRef.current = new AbortController();

      const requestPromise = (async () => {
        try {
          setState((prev) => ({ ...prev, loading: true, error: null }));

          const fullUrl = url.startsWith('http') ? url : buildApiUrl(url);
          const response = await fetch(fullUrl, {
            ...options,
            credentials: 'include',
            signal: abortControllerRef.current?.signal,
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const data = await response.json();

          // Cache the successful response
          globalCache.set(cacheKey, {
            data,
            timestamp: now,
            staleTime: staleTime,
          });

          setState((prev) => ({ ...prev, data, loading: false, error: null }));
          retryCountRef.current = 0;

          return data;
        } catch (error: any) {
          if (error.name === 'AbortError') {
            return; // Request was aborted, don't update state
          }

          const errorMessage = error.message || 'An error occurred';

          // Retry logic
          if (retryCountRef.current < retry && !isRetry) {
            retryCountRef.current++;
            setTimeout(() => {
              fetchData(true);
            }, retryDelay * retryCountRef.current);
            return;
          }

          setState((prev) => ({
            ...prev,
            loading: false,
            error: errorMessage,
          }));
          throw error;
        } finally {
          // Remove from pending requests
          pendingRequests.delete(cacheKey);
        }
      })();

      // Store the pending request
      pendingRequests.set(cacheKey, requestPromise);

      return requestPromise;
    },
    [url, options, enabled, staleTime, retry, retryDelay]
  );

  // Refetch function
  const refetch = useCallback(() => {
    const cacheKey = `${url}-${JSON.stringify(options)}`;
    globalCache.delete(cacheKey); // Clear cache to force fresh fetch
    retryCountRef.current = 0;
    return fetchData();
  }, [fetchData, url, options]);

  // Invalidate cache function
  const invalidate = useCallback(() => {
    const cacheKey = `${url}-${JSON.stringify(options)}`;
    globalCache.delete(cacheKey);
  }, [url, options]);

  useEffect(() => {
    fetchData();

    return () => {
      // Abort ongoing request on cleanup
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData]);

  return {
    ...state,
    refetch,
    invalidate,
  };
};

// Utility function to clear all cache
export const clearAllCache = () => {
  globalCache.clear();
  pendingRequests.clear();
};

// Utility function to clear cache by pattern
export const clearCacheByPattern = (pattern: string) => {
  for (const [key] of globalCache) {
    if (key.includes(pattern)) {
      globalCache.delete(key);
    }
  }

  for (const [key] of pendingRequests) {
    if (key.includes(pattern)) {
      pendingRequests.delete(key);
    }
  }
};
