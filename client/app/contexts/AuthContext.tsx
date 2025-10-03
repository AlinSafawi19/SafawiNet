'use client';

/**
 * AuthContext - Handles user authentication state
 *
 * Key Features:
 * - Silent authentication checks (no console errors for new visitors)
 * - Prevents duplicate API calls for better performance
 * - Graceful handling of 401/400 responses (normal for unauthenticated users)
 * - Cookie-first approach to avoid unnecessary API calls and console errors
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import { buildApiUrl, API_CONFIG } from '../config/api';

interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  isVerified: boolean;
  twoFactorEnabled: boolean;
  notificationPreferences: any | null;
  preferences: {
    language: string;
  } | null;
  roles: string[];
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (
    email: string,
    password: string
  ) => Promise<{
    success: boolean;
    message?: string;
    messageKey?: string;
    user?: User;
    requiresTwoFactor?: boolean;
  }>;
  loginWith2FA: (
    userId: string,
    code: string
  ) => Promise<{
    success: boolean;
    message?: string;
    messageKey?: string;
    user?: User;
  }>;
  loginWithTokens: (tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }) => Promise<{ success: boolean; message?: string; messageKey?: string }>;
  register: (
    name: string,
    email: string,
    password: string,
    confirmPassword: string
  ) => Promise<{ success: boolean; message?: string; messageKey?: string }>;
  logout: () => Promise<void>;
  checkAuthStatus: () => void;
  refreshToken: () => Promise<boolean>;
  authenticatedFetch: (url: string, options?: RequestInit) => Promise<Response>;
  updateUser: (updatedUser: User) => void;
  isAdmin: () => boolean;
  isSuperAdmin: () => boolean;
  hasRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasInitialized, setHasInitialized] = useState(false);
  const isInitializingRef = useRef(false);

  // Cache for API responses to prevent duplicate calls
  const apiCache = useRef<Map<string, { data: any; timestamp: number }>>(
    new Map()
  );
  const CACHE_DURATION = 30000; // 30 seconds cache

  // Cached fetch function to prevent duplicate API calls
  const cachedFetch = useCallback(
    async (url: string, options: RequestInit = {}): Promise<Response> => {
      const cacheKey = `${url}-${JSON.stringify(options)}`;
      const cached = apiCache.current.get(cacheKey);
      const now = Date.now();

      // Return cached data if it's still valid
      if (cached && now - cached.timestamp < CACHE_DURATION) {
        return new Response(JSON.stringify(cached.data), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Make the actual request
      const response = await fetch(url, options);

      // Cache successful responses
      if (response.ok) {
        const data = await response.clone().json();
        apiCache.current.set(cacheKey, { data, timestamp: now });
      }

      return response;
    },
    []
  );

  const refreshToken = useCallback(async (): Promise<boolean> => {
    // Prevent multiple simultaneous refresh attempts
    if (isRefreshing) {
      return false;
    }

    try {
      setIsRefreshing(true);

      const response = await fetch(
        buildApiUrl(API_CONFIG.ENDPOINTS.AUTH.REFRESH),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // Include cookies for session management
        }
      );

      if (response.ok) {
        const refreshData = await response.json();

        if (refreshData.success) {
          // Token refreshed successfully, but don't call /users/me again
          // The user will remain in their current state, and the next API call
          // will use the refreshed token automatically
          return true;
        } else {
          console.warn(
            '❌ AuthContext: Token refresh failed but server returned 200 OK'
          );
          // Refresh failed but server returned 200 OK
          return false;
        }
      } else {
        console.warn(
          '❌ AuthContext: Token refresh failed with non-200 status',
          {
            status: response.status,
          }
        );
        return false;
      }
    } catch (error) {
      console.error('💥 AuthContext: Token refresh error caught', error);
      // Don't set user to null immediately - let the next auth check handle it
      return false;
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing]);

  const loginWithTokens = useCallback(
    async (_tokens: {
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
    }): Promise<{
      success: boolean;
      message?: string;
      messageKey?: string;
    }> => {
      try {
        // Note: Server should have already set HTTP-only cookies
        // We just need to fetch user data to verify the login worked

        // Fetch user data to set the user state
        const response = await fetch(
          buildApiUrl(API_CONFIG.ENDPOINTS.USERS.ME),
          {
            method: 'GET',
            credentials: 'include',
          }
        );

        if (response.ok) {
          const userData = await response.json();

          // Check if user is authenticated based on new response format
          if (!userData.authenticated || !userData.user) {
            return { success: false, messageKey: 'auth.messages.userNotFound' };
          }

          const finalUserData = userData.user;

          // Check if user is verified before setting login state
          if (!finalUserData.isVerified) {
            return {
              success: false,
              messageKey: 'auth.messages.emailVerificationRequired',
            };
          }

          setUser(finalUserData);

          return { success: true, messageKey: 'auth.messages.loginSuccess' };
        } else {
          const errorText = await response.text();
          throw new Error(
            `Failed to fetch user data: ${response.status} ${errorText}`
          );
        }
      } catch (error) {
        return { success: false, messageKey: 'auth.messages.generalError' };
      }
    },
    []
  );

  // Cache invalidation function
  const invalidateCache = useCallback((pattern?: string) => {
    if (pattern) {
      // Invalidate specific cache entries matching pattern
      for (const [key] of apiCache.current) {
        if (key.includes(pattern)) {
          apiCache.current.delete(key);
        }
      }
    } else {
      // Invalidate all cache
      apiCache.current.clear();
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      // Call the logout endpoint to invalidate the session on the server
      await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.AUTH.LOGOUT), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for session management
      });
    } catch (error) {
      // Silent fail on logout
    } finally {
      // Clear user state (cookies are handled by the server)
      setUser(null);

      // Clear user-specific localStorage data
      localStorage.removeItem('locale');

      // Clear all cached data on logout
      invalidateCache();
    }
  }, [invalidateCache]);

  const checkAuthStatus = useCallback(async () => {
    // Prevent multiple calls during initialization to avoid duplicate API calls
    // This fixes the performance issue where /users/me and /v1/auth/refresh were called twice
    if (hasInitialized || isInitializingRef.current) {
      return;
    }

    isInitializingRef.current = true;

    try {
      // Always check the backend for authentication status
      // HTTP-only cookies can't be read by JavaScript, so we rely on the backend

      const response = await cachedFetch(
        buildApiUrl(API_CONFIG.ENDPOINTS.USERS.ME),
        {
          method: 'GET',
          credentials: 'include', // Include cookies for session management
        }
      );

      if (response.ok) {
        const userData = await response.json();

        // Check if user is authenticated based on new response format
        if (!userData.authenticated || !userData.user) {
          setUser(null);
          return;
        }

        const finalUserData = userData.user;

        // Check if user is verified before setting login state
        if (!finalUserData.isVerified) {
          setUser(null);
          return;
        }

        setUser(finalUserData);
      } else {
        // Handle any non-200 responses (shouldn't happen with new server format)
        setUser(null);
      }
    } catch (error) {
      setUser(null);
    } finally {
      // Set loading to false after auth check is complete
      // This ensures that even if user is null, we know the auth state
      // Batch state updates to prevent multiple re-renders
      React.startTransition(() => {
        setIsLoading(false);
        setHasInitialized(true);
      });
      isInitializingRef.current = false; // Reset the ref after initialization
    }
  }, [hasInitialized, cachedFetch]);

  const login = useCallback(
    async (
      email: string,
      password: string
    ): Promise<{
      success: boolean;
      message?: string;
      messageKey?: string;
      user?: User;
    }> => {
      const response = await cachedFetch(
        buildApiUrl(API_CONFIG.ENDPOINTS.AUTH.LOGIN),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ email, password }),
        }
      );

      if (response.ok) {
        const responseData = await response.json();

        // Handle the actual response structure from the backend
        if (responseData.user) {
          const {
            user: userData,
            requiresTwoFactor,
            requiresVerification,
          } = responseData;

          // Check if user is verified before setting login state
          if (requiresVerification) {
            // User is not verified, don't set login state
            return {
              success: false,
              messageKey: 'auth.messages.emailVerificationRequired',
              user: userData, // Still return user data for the form to check
            };
          }

          // Check if 2FA is required
          if (requiresTwoFactor) {
            // User needs to enter 2FA code
            return {
              success: false,
              messageKey: 'auth.messages.twoFactorRequired',
              user: userData, // Return user data for 2FA form
              requiresTwoFactor: true,
            } as any;
          }

          // User is verified and no 2FA required, set login state
          setUser(userData);

          return { success: true, user: userData };
        } else {
          console.warn(
            '❌ AuthContext: Login failed - no user data in response',
            {
              responseData,
            }
          );

          return {
            success: false,
            message: responseData.message,
            messageKey: 'auth.messages.generalError',
          };
        }
      } else {
        console.warn('❌ AuthContext: Login failed with non-200 status', {
          status: response.status,
        });

        // Parse the actual error response from the server
        try {
          const errorData = await response.json();

          return {
            success: false,
            message: errorData.message || 'Login failed',
            messageKey: errorData.message
              ? undefined
              : 'auth.messages.generalError',
          };
        } catch (parseError) {
          console.error(
            '💥 AuthContext: Failed to parse error response',
            parseError
          );
          return {
            success: false,
            message: 'Network error',
            messageKey: 'auth.networkError',
          };
        }
      }
    },
    [cachedFetch]
  );

  const loginWith2FA = useCallback(
    async (
      userId: string,
      code: string
    ): Promise<{
      success: boolean;
      message?: string;
      messageKey?: string;
      user?: User;
    }> => {
      try {
        const response = await fetch(
          buildApiUrl(API_CONFIG.ENDPOINTS.AUTH.TWO_FACTOR_LOGIN),
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ userId, code }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          const { user: _userData } = data;

          // Fetch user data to set the user state (tokens are set as cookies by the server)
          const userResponse = await fetch(
            buildApiUrl(API_CONFIG.ENDPOINTS.USERS.ME),
            {
              method: 'GET',
              credentials: 'include',
            }
          );

          if (userResponse.ok) {
            const userDataResponse = await userResponse.json();

            // Check if user is authenticated based on new response format
            if (!userDataResponse.authenticated || !userDataResponse.user) {
              return {
                success: false,
                messageKey: 'auth.messages.userNotFound',
              };
            }

            const finalUserData = userDataResponse.user;

            // Check if user is verified before setting login state
            if (!finalUserData.isVerified) {
              return {
                success: false,
                messageKey: 'auth.messages.emailVerificationRequired',
              };
            }

            setUser(finalUserData);
            return { success: true, user: finalUserData };
          } else {
            const errorText = await userResponse.text();
            throw new Error(
              `Failed to fetch user data: ${userResponse.status} ${errorText}`
            );
          }
        } else {
          const errorData = await response.json();
          return {
            success: false,
            message: errorData.message,
            messageKey: 'auth.messages.generalError',
          };
        }
      } catch (error) {
        return {
          success: false,
          messageKey: 'auth.messages.generalError',
        };
      }
    },
    []
  );

  const register = useCallback(
    async (
      name: string,
      email: string,
      password: string,
      confirmPassword: string
    ): Promise<{ success: boolean; message?: string; messageKey?: string }> => {
      const requestData = { name, email, password, confirmPassword };

      try {
        const response = await fetch(
          buildApiUrl(API_CONFIG.ENDPOINTS.AUTH.REGISTER),
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include', // Include cookies for session management
            body: JSON.stringify(requestData),
          }
        );

        if (response.ok) {
          // Get the success message from the server response
          const responseData = await response.json();

          return {
            success: true,
            message: responseData.message,
            messageKey: 'auth.messages.registrationSuccess',
          };
        } else {
          console.warn(
            '❌ AuthContext: Registration failed with non-200 status',
            {
              status: response.status,
            }
          );
          const errorData = await response.json();
          return {
            success: false,
            message: errorData.message,
            messageKey: 'auth.messages.registrationFailed',
          };
        }
      } catch (error) {
        console.error('💥 AuthContext: Registration error caught', error);
        return {
          success: false,
          messageKey: 'auth.messages.generalError',
        };
      }
    },
    []
  );

  // Enhanced refresh token function that can be called automatically
  const autoRefreshToken = useCallback(async (): Promise<boolean> => {
    if (isRefreshing) {
      // Wait for current refresh to complete
      while (isRefreshing) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      return user !== null; // Return current state after refresh completes
    }
    return await refreshToken();
  }, [isRefreshing, refreshToken, user]);

  // Utility function for making authenticated API calls with automatic token refresh and caching
  const authenticatedFetch = useCallback(
    async (url: string, options: RequestInit = {}): Promise<Response> => {
      // Make the initial request with caching
      let response = await cachedFetch(url, {
        ...options,
        credentials: 'include',
      });

      // If we get a 401, try to refresh the token and retry the request
      if (response.status === 401) {
        const refreshSuccess = await autoRefreshToken();
        if (refreshSuccess) {
          // Invalidate cache for this URL and retry
          invalidateCache(url);
          response = await cachedFetch(url, {
            ...options,
            credentials: 'include',
          });
        }
      }

      return response;
    },
    [autoRefreshToken, cachedFetch, invalidateCache]
  );

  useEffect(() => {
    let isMounted = true;

    // Prevent multiple initializations
    if (hasInitialized) {
      return;
    }

    const initializeAuth = async () => {
      if (isMounted && !hasInitialized) {
        // Use requestIdleCallback for better performance
        if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
          requestIdleCallback(() => {
            if (isMounted && !hasInitialized) {
              checkAuthStatus();
            }
          });
        } else {
          // Fallback for browsers without requestIdleCallback
          setTimeout(() => {
            if (isMounted && !hasInitialized) {
              checkAuthStatus();
            }
          }, 0);
        }
      }
    };

    initializeAuth();

    // Add event listeners

    // Return cleanup function
    return () => {
      isMounted = false;
    };
  }, [checkAuthStatus, hasInitialized]);

  // Set up automatic token refresh timer
  useEffect(() => {
    if (!user) return;

    // Refresh token every 14 minutes (assuming 15-minute token lifetime)
    const refreshInterval = setInterval(async () => {
      if (user) {
        await autoRefreshToken();
      }
    }, 14 * 60 * 1000); // 14 minutes

    return () => {
      clearInterval(refreshInterval);
    };
  }, [user, autoRefreshToken]);

  const updateUser = useCallback(
    (updatedUser: User) => {
      setUser(updatedUser);
      // Invalidate user-related cache when user data changes
      invalidateCache('/users/me');
    },
    [invalidateCache]
  );

  // Role checking functions
  const isAdmin = useCallback(() => {
    return user?.roles?.includes('ADMIN') || false;
  }, [user]);

  const isSuperAdmin = useCallback(() => {
    return user?.roles?.includes('SUPERADMIN') || false;
  }, [user]);

  const hasRole = useCallback(
    (role: string) => {
      return user?.roles?.includes(role) || false;
    },
    [user]
  );

  const value: AuthContextType = useMemo(
    () => ({
      user,
      isLoading,
      login,
      loginWith2FA,
      loginWithTokens,
      register,
      logout,
      checkAuthStatus,
      refreshToken,
      authenticatedFetch,
      updateUser,
      isAdmin,
      isSuperAdmin,
      hasRole,
    }),
    [
      user,
      isLoading,
      login,
      loginWith2FA,
      loginWithTokens,
      register,
      logout,
      checkAuthStatus,
      refreshToken,
      authenticatedFetch,
      updateUser,
      isAdmin,
      isSuperAdmin,
      hasRole,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
