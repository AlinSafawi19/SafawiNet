'use client';

import { buildApiUrl, API_CONFIG } from '../config/api';
import { clearCacheByPattern } from '../hooks/useOptimizedFetch';

interface ApiResponse<T = any> {
  data: T;
  status: number;
  success: boolean;
  error?: string;
}

interface ApiCallOptions extends RequestInit {
  component?: string;
  action?: string;
  userId?: string;
  metadata?: Record<string, any>;
  cacheTime?: number;
  retry?: number;
  timeout?: number;
}

class OptimizedApiService {
  private baseUrl: string;
  private defaultTimeout: number = 10000; // 10 seconds

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async makeRequest<T = any>(
    endpoint: string,
    options: ApiCallOptions = {}
  ): Promise<ApiResponse<T>> {
    const {
      component = 'OptimizedApiService',
      action = 'request',
      userId,
      metadata = {},
      cacheTime = 30000,
      retry = 3,
      timeout = this.defaultTimeout,
      ...fetchOptions
    } = options;

    const url = `${this.baseUrl}${endpoint}`;
    const startTime = Date.now();

    // Create abort controller for timeout
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        credentials: 'include',
        signal: abortController.signal,
      });

      clearTimeout(timeoutId);

      const duration = Date.now() - startTime;
      const responseData = await this.parseResponse(response);

      // Log performance metrics
      this.logPerformance(component, action, {
        url,
        status: response.status,
        duration,
        endpoint,
        userId,
        metadata,
      });

      return {
        data: responseData,
        status: response.status,
        success: response.ok,
        error: response.ok ? undefined : responseData.error || 'Unknown error',
      };
    } catch (error: any) {
      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;

      // Retry logic for network errors
      if (retry > 0 && this.shouldRetry(error)) {
        await this.delay(1000 * (4 - retry)); // Exponential backoff
        return this.makeRequest(endpoint, { ...options, retry: retry - 1 });
      }

      this.logError(component, action, {
        url,
        duration,
        endpoint,
        error: error.message,
        userId,
        metadata,
      });

      return {
        data: null as T,
        status: 0,
        success: false,
        error: error.message || 'Network error',
      };
    }
  }

  private shouldRetry(error: any): boolean {
    // Retry on network errors, timeouts, and 5xx errors
    return (
      error.name === 'AbortError' ||
      error.name === 'TypeError' ||
      (error.status >= 500 && error.status < 600)
    );
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async parseResponse(response: Response): Promise<any> {
    const contentType = response.headers.get('content-type');

    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }

    return await response.text();
  }

  private logPerformance(component: string, action: string, metadata: any) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${component}] ${action}`, metadata);
    }
  }

  private logError(component: string, action: string, metadata: any) {
    if (process.env.NODE_ENV === 'development') {
      console.error(`[${component}] ${action}`, metadata);
    }
  }

  // Public API methods
  async get<T = any>(
    endpoint: string,
    options: ApiCallOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T = any>(
    endpoint: string,
    data?: any,
    options: ApiCallOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T = any>(
    endpoint: string,
    data?: any,
    options: ApiCallOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      ...options,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T = any>(
    endpoint: string,
    options: ApiCallOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { ...options, method: 'DELETE' });
  }

  // Cache management
  invalidateCache(pattern?: string) {
    if (pattern) {
      clearCacheByPattern(pattern);
    } else {
      clearCacheByPattern(''); // Clear all
    }
  }

  // Batch requests for better performance
  async batch<T = any>(
    requests: Array<{ endpoint: string; options?: ApiCallOptions }>
  ): Promise<ApiResponse<T>[]> {
    const promises = requests.map(({ endpoint, options }) =>
      this.makeRequest<T>(endpoint, options)
    );

    return Promise.all(promises);
  }
}

// Create singleton instance
export const optimizedApi = new OptimizedApiService(API_CONFIG.BASE_URL);
