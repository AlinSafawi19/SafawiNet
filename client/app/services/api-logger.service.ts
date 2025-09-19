import { logError, logInfo, logWarning } from '../utils/errorLogger';

interface ApiCallOptions extends RequestInit {
  component?: string;
  action?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  status: number;
  success: boolean;
}

class ApiLoggerService {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async request<T = any>(
    endpoint: string,
    options: ApiCallOptions = {}
  ): Promise<ApiResponse<T>> {
    const {
      component = 'ApiLoggerService',
      action = 'request',
      userId,
      metadata = {},
      ...fetchOptions
    } = options;

    const url = `${this.baseUrl}${endpoint}`;
    const startTime = Date.now();

    // Log API request
    logInfo('API Request', {
      component,
      action,
      userId,
      metadata: {
        ...metadata,
        url,
        method: fetchOptions.method || 'GET',
        endpoint,
      },
    });

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        credentials: 'include', // Always include cookies for authentication
      });

      const duration = Date.now() - startTime;
      const responseData = await this.parseResponse(response);

      // Log API response
      if (response.ok) {
        logInfo('API Response Success', {
          component,
          action,
          userId,
          metadata: {
            ...metadata,
            url,
            status: response.status,
            duration,
            endpoint,
          },
        });
      } else {
        logWarning('API Response Error', {
          component,
          action,
          userId,
          metadata: {
            ...metadata,
            url,
            status: response.status,
            duration,
            endpoint,
            error: responseData.error,
          },
        });
      }

      return {
        data: responseData,
        status: response.status,
        success: response.ok,
        error: response.ok ? undefined : responseData.error || 'Unknown error',
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      logError('API Request Failed', error instanceof Error ? error : new Error(String(error)), {
        component,
        action,
        userId,
        metadata: {
          ...metadata,
          url,
          method: fetchOptions.method || 'GET',
          duration,
          endpoint,
        },
      });

      return {
        status: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  private async parseResponse(response: Response): Promise<any> {
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      try {
        return await response.json();
      } catch (error) {
        return { error: 'Failed to parse JSON response' };
      }
    }
    
    return await response.text();
  }

  // Convenience methods for common HTTP methods
  async get<T = any>(endpoint: string, options: Omit<ApiCallOptions, 'method'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T = any>(endpoint: string, data?: any, options: Omit<ApiCallOptions, 'method' | 'body'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T = any>(endpoint: string, data?: any, options: Omit<ApiCallOptions, 'method' | 'body'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T = any>(endpoint: string, data?: any, options: Omit<ApiCallOptions, 'method' | 'body'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T = any>(endpoint: string, options: Omit<ApiCallOptions, 'method'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

// Create singleton instance
export const apiLogger = new ApiLoggerService(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001');

// Export the class for testing
export { ApiLoggerService };
