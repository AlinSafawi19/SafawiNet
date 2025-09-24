'use client';

/**
 * AuthContext - Handles user authentication state
 *
 * Key Features:
 * - Silent authentication checks (no console errors for new visitors)
 * - Prevents duplicate API calls for better performance
 * - Development-only logging for debugging
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
} from 'react';
import { buildApiUrl, API_CONFIG } from '../config/api';
import { logError, logWarning } from '../utils/errorLogger';

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
    theme: string;
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
  }) => Promise<{ success: boolean; message?: string }>;
  register: (
    name: string,
    email: string,
    password: string
  ) => Promise<{ success: boolean; message?: string; messageKey?: string }>;
  logout: () => Promise<void>;
  checkAuthStatus: () => void;
  refreshToken: () => Promise<boolean>;
  authenticatedFetch: (url: string, options?: RequestInit) => Promise<Response>;
  joinPendingVerificationRoom: (email: string) => Promise<void>;
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

  // Performance logging - only in development
  const authStartTime = useRef(Date.now());
  const authLog = (message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development' || (typeof window !== 'undefined' && window.location.search.includes('debug=performance'))) {
      const elapsed = Date.now() - authStartTime.current;
      console.log(`🔐 [AuthContext] ${message}`, data ? { ...data, elapsed: `${elapsed}ms` } : `(${elapsed}ms)`);
    }
  };

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
          // Refresh failed but server returned 200 OK
          return false;
        }
      } else {
        // Only log actual errors (shouldn't happen with new server format)
        return false;
      }
    } catch (error) {
      // Only log actual network/technical errors
      // Don't set user to null immediately - let the next auth check handle it
      return false;
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing]);

  const loginWithTokens = useCallback(
    async (tokens: {
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
    }): Promise<{ success: boolean; message?: string }> => {
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
            return { success: false, message: 'Authentication failed' };
          }

          const finalUserData = userData.user;

          // Check if user is verified before setting login state
          if (!finalUserData.isVerified) {
            return { success: false, message: 'Email verification required' };
          }

          setUser(finalUserData);

          // Broadcast login to other tabs and devices
          broadcastAuthChange('login', finalUserData);

          return { success: true, message: 'Login successful' };
        } else {
          const errorText = await response.text();
          throw new Error(
            `Failed to fetch user data: ${response.status} ${errorText}`
          );
        }
      } catch (error) {
        return { success: false, message: 'Failed to login with tokens' };
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
      localStorage.removeItem('theme');
      localStorage.removeItem('locale');

      // Clear all cached data on logout
      invalidateCache();
    }
  }, [invalidateCache]);

  // Define force logout handler before useEffect to avoid scope issues
  const handleForceLogout = useCallback(async () => {
    // Use existing logout function
    await logout();

    // Redirect to login page
    window.location.href = '/auth';
  }, [logout]);

  // Function to check for offline messages
  const checkOfflineMessages = useCallback(async () => {
    try {
      const response = await fetch(buildApiUrl('/v1/auth/offline-messages'), {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.messages && data.messages.length > 0) {
          // Process each message
          for (const message of data.messages) {
            // Handle different message types
            switch (message.event) {
              case 'forceLogout':
                handleForceLogout();
                break;

              default:
                break;
            }
          }

          // Mark all messages as processed
          try {
            const messageIds = data.messages.map((msg: any) => msg.id);
            await fetch(
              buildApiUrl('/v1/auth/offline-messages/mark-processed'),
              {
                method: 'POST',
                credentials: 'include',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ messageIds }),
              }
            );
          } catch (error) {}
        }
      }
    } catch (error) {}
  }, [handleForceLogout]);

  const checkAuthStatus = useCallback(async () => {
    // Prevent multiple calls during initialization to avoid duplicate API calls
    // This fixes the performance issue where /users/me and /v1/auth/refresh were called twice
    if (hasInitialized || isInitializingRef.current) {
      authLog('checkAuthStatus skipped - already initialized or initializing');
      return;
    }

    authLog('checkAuthStatus started');
    isInitializingRef.current = true;

    try {
      // Always check the backend for authentication status
      // HTTP-only cookies can't be read by JavaScript, so we rely on the backend
      const apiStartTime = Date.now();
      authLog('Making API call to /users/me');
      
      const response = await cachedFetch(
        buildApiUrl(API_CONFIG.ENDPOINTS.USERS.ME),
        {
          method: 'GET',
          credentials: 'include', // Include cookies for session management
        }
      );

      const apiEndTime = Date.now();
      authLog('API call to /users/me completed', { 
        status: response.status, 
        duration: `${apiEndTime - apiStartTime}ms` 
      });

      if (response.ok) {
        const userData = await response.json();
        authLog('User data received', { 
          authenticated: userData.authenticated, 
          hasUser: !!userData.user,
          isVerified: userData.user?.isVerified 
        });

        // Check if user is authenticated based on new response format
        if (!userData.authenticated || !userData.user) {
          authLog('User not authenticated - setting user to null');
          setUser(null);
          return;
        }

        const finalUserData = userData.user;

        // Check if user is verified before setting login state
        if (!finalUserData.isVerified) {
          authLog('User not verified - setting user to null');
          setUser(null);
          return;
        }

        authLog('User authenticated and verified - setting user state');
        setUser(finalUserData);

        // Check for offline messages after successful authentication - defer to avoid blocking
        setTimeout(() => {
          checkOfflineMessages();
        }, 1000); // Reduced delay for better UX
      } else {
        // Handle any non-200 responses (shouldn't happen with new server format)
        authLog('API call failed - setting user to null', { status: response.status });
        setUser(null);
      }
    } catch (error) {
      // Only log actual network/technical errors
      authLog('API call error - setting user to null', { error: error instanceof Error ? error.message : 'Unknown error' });
      setUser(null);
    } finally {
      // Set loading to false after auth check is complete
      // This ensures that even if user is null, we know the auth state
      authLog('Auth initialization completed - setting loading to false');
      setIsLoading(false);
      setHasInitialized(true);
      isInitializingRef.current = false; // Reset the ref after initialization
    }
  }, [hasInitialized, checkOfflineMessages, cachedFetch]);

  const login = async (
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

        // Check for offline messages after successful authentication
        setTimeout(() => {
          checkOfflineMessages();
        }, 1000); // Small delay to ensure user state is set

        return { success: true, user: userData };
      } else {
        // Map server error messages to translation keys
        const messageKey = responseData.message
          ? mapServerErrorToTranslationKey(responseData.message)
          : null;
        return {
          success: false,
          message: messageKey ? undefined : responseData.message,
          messageKey: messageKey || undefined,
        };
      }
    } else {
      // Handle network error
      return {
        success: false,
        message: 'Network error',
        messageKey: 'auth.networkError',
      };
    }
  };

  const loginWith2FA = async (
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
        const { user: userData } = data;

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
            return { success: false, message: 'Authentication failed' };
          }

          const finalUserData = userDataResponse.user;

          // Check if user is verified before setting login state
          if (!finalUserData.isVerified) {
            return { success: false, message: 'Email verification required' };
          }

          setUser(finalUserData);

          // Check for offline messages after successful authentication
          setTimeout(() => {
            checkOfflineMessages();
          }, 1000); // Small delay to ensure user state is set

          // Broadcast login to other tabs and devices
          broadcastAuthChange('login', finalUserData);

          return { success: true, user: finalUserData };
        } else {
          const errorText = await userResponse.text();
          throw new Error(
            `Failed to fetch user data: ${userResponse.status} ${errorText}`
          );
        }
      } else {
        const errorData = await response.json();
        const messageKey = errorData.message
          ? mapServerErrorToTranslationKey(errorData.message)
          : null;
        return {
          success: false,
          message: messageKey ? undefined : errorData.message,
          messageKey: messageKey || undefined,
        };
      }
    } catch (error) {
      return {
        success: false,
        messageKey: 'auth.messages.generalError',
      };
    }
  };

  const register = async (
    name: string,
    email: string,
    password: string
  ): Promise<{ success: boolean; message?: string; messageKey?: string }> => {
    try {
      const response = await fetch(
        buildApiUrl(API_CONFIG.ENDPOINTS.AUTH.REGISTER),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // Include cookies for session management
          body: JSON.stringify({ name, email, password }),
        }
      );

      if (response.ok) {
        // Get the success message from the server response
        const responseData = await response.json();
        // Map server success messages to translation keys
        const messageKey = mapServerMessageToTranslationKey(
          responseData.message
        );

        // Join pending verification room for cross-browser sync
        // Import socket service dynamically to avoid SSR issues
        import('../services/socket.singleton')
          .then(async ({ socketSingleton }) => {
            try {
              // Only connect if not already connected
              if (!socketSingleton.isSocketConnected()) {
                await socketSingleton.ensureReady();
              }
              await socketSingleton.joinPendingVerificationRoom(
                email.toLowerCase()
              );

              // Set up emailVerified listener immediately for this registration
              socketSingleton.on('emailVerified', async (data: any) => {
                if (data.success && data.user) {
                  // Check if we have tokens in the data
                  if (data.tokens) {
                    try {
                      await loginWithTokens(data.tokens);
                    } catch (error) {}
                  } else {
                    // Only set user if they are verified
                    if (data.user.isVerified) {
                      setUser(data.user);
                    } else {
                      return;
                    }
                  }

                  // Check if user was on auth page or verify-email page and redirect based on role
                  const currentPath = window.location.pathname;
                  if (
                    currentPath === '/auth' ||
                    currentPath.startsWith('/auth/') ||
                    currentPath === '/verify-email'
                  ) {
                    setTimeout(() => {
                      if (
                        data.user &&
                        data.user.isVerified &&
                        data.user.roles &&
                        data.user.roles.includes('ADMIN')
                      ) {
                        window.location.href = '/admin';
                      } else if (data.user && data.user.isVerified) {
                        window.location.href = '/';
                      }
                    }, 2000);
                  }
                }
              });
            } catch (error) {
              logError(
                'Socket initialization failed during registration',
                error instanceof Error ? error : new Error(String(error)),
                {
                  component: 'AuthContext',
                  action: 'register',
                  userId: user?.id,
                  metadata: { step: 'socket_init' },
                }
              );
            }
          })
          .catch((error) => {
            logError(
              'Socket service import failed during registration',
              error instanceof Error ? error : new Error(String(error)),
              {
                component: 'AuthContext',
                action: 'register',
                userId: user?.id,
                metadata: { step: 'socket_import' },
              }
            );
          });

        return {
          success: true,
          message: messageKey ? undefined : responseData.message,
          messageKey: messageKey || undefined,
        };
      } else {
        const errorData = await response.json();
        // Map server error messages to translation keys
        const messageKey = errorData.message
          ? mapServerErrorToTranslationKey(errorData.message)
          : null;
        return {
          success: false,
          message: messageKey ? undefined : errorData.message,
          messageKey: messageKey || undefined,
        };
      }
    } catch (error) {
      return {
        success: false,
        messageKey: 'auth.messages.generalError',
      };
    }
  };

  // Helper function to map server error messages to translation keys
  const mapServerErrorToTranslationKey = (
    serverMessage: string
  ): string | null => {
    const errorMapping: { [key: string]: string } = {
      'User with this email already exists': 'auth.messages.userAlreadyExists',
      'Account temporarily locked due to too many failed attempts':
        'auth.messages.accountLocked',
      'Invalid credentials': 'auth.messages.invalidCredentials',
      'Invalid or expired verification token':
        'auth.messages.invalidVerificationToken',
      'Invalid 2FA code': 'auth.messages.invalidTwoFactorCode',
      'Invalid or expired password reset token':
        'auth.messages.invalidPasswordResetToken',
      'Invalid refresh token': 'auth.messages.invalidRefreshToken',
      'User not found': 'auth.messages.userNotFound',
      '2FA is already enabled': 'auth.messages.twoFactorAlreadyEnabled',
      '2FA setup not found. Please run setup first.':
        'auth.messages.twoFactorSetupNotFound',
      'Invalid TOTP code': 'auth.messages.invalidTOTPCode',
      '2FA is not enabled': 'auth.messages.twoFactorNotEnabled',
      'Invalid code': 'auth.messages.invalidCode',
      'Email address is already in use by another account':
        'auth.messages.emailAlreadyInUse',
      'No refresh token provided': 'auth.messages.noRefreshTokenProvided',
      'User is already verified': 'auth.messages.userAlreadyVerified',
      'Session not found': 'auth.messages.sessionNotFound',
      'Cannot delete current session':
        'auth.messages.cannotDeleteCurrentSession',
      'Notification not found': 'auth.messages.notificationNotFound',
    };

    return errorMapping[serverMessage] || null;
  };

  // Helper function to map server success messages to translation keys
  const mapServerMessageToTranslationKey = (
    serverMessage: string
  ): string | null => {
    const messageMapping: { [key: string]: string } = {
      'User registered successfully. Please check your email to verify your account.':
        'auth.messages.registrationSuccess',
      'If an account with this email exists, a password reset link has been sent.':
        'auth.messages.passwordResetEmailSent',
      'Password reset successfully. Please log in with your new password.':
        'auth.messages.passwordResetSuccess',
      'Email verified successfully': 'auth.messages.emailVerified',
      'Verification email sent successfully':
        'auth.messages.verificationEmailSent',
      'Two-factor authentication enabled successfully':
        'auth.messages.twoFactorEnabled',
      'Two-factor authentication disabled successfully':
        'auth.messages.twoFactorDisabled',
      'Token refreshed successfully': 'auth.messages.tokenRefreshed',
      'Logged out successfully': 'auth.messages.loggedOut',
    };

    return messageMapping[serverMessage] || null;
  };

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

  // Utility function to join pending verification room for cross-browser sync
  const joinPendingVerificationRoom = async (email: string) => {
    try {
      const { socketSingleton } = await import('../services/socket.singleton');
      // Only connect if not already connected
      if (!socketSingleton.isSocketConnected()) {
        await socketSingleton.ensureReady();
      }
      await socketSingleton.joinPendingVerificationRoom(email.toLowerCase());
    } catch (error) {}
  };

  // Helper method to broadcast authentication changes
  const broadcastAuthChange = (type: 'login', user?: any) => {
    try {
      // Notify other devices via WebSocket (if connected)
      // This will be handled by the WebSocket service
    } catch (error) {
      // Failed to broadcast auth change
    }
  };

  useEffect(() => {
    let isMounted = true;
    authLog('AuthContext useEffect started');

    // Handle rate limiting errors from WebSocket
    const handleRateLimitError = (event: CustomEvent) => {
      const { type, message } = event.detail;
      // You can add specific handling here if needed
      // For now, we'll just log it - the error will be handled by the backend message translation
      logWarning('Rate limit exceeded', {
        component: 'AuthContext',
        action: 'handleRateLimitError',
        metadata: { type, message },
      });
    };

    const initializeAuth = async () => {
      if (isMounted) {
        authLog('Initializing auth check');
        // Use requestIdleCallback for better performance
        if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
          authLog('Using requestIdleCallback for auth check');
          requestIdleCallback(() => {
            if (isMounted) {
              checkAuthStatus();
            }
          });
        } else {
          // Fallback for browsers without requestIdleCallback
          authLog('Using setTimeout fallback for auth check');
          setTimeout(() => {
            if (isMounted) {
              checkAuthStatus();
            }
          }, 0);
        }
      }
    };

    initializeAuth();

    // Listen for WebSocket authentication broadcasts
    const handleAuthBroadcast = (data: { type: string; user?: any }) => {
      if (data.type === 'login' && data.user) {
        // Only set user if they are verified
        if (data.user.isVerified) {
          setUser(data.user);
        } else {
          // User not verified, don't set login state
          return;
        }

        // Check if user was on auth page and redirect based on role
        const currentPath = window.location.pathname;
        if (currentPath === '/auth' || currentPath.startsWith('/auth/')) {
          // Use window.location for cross-device redirects
          setTimeout(() => {
            if (
              data.user &&
              data.user.isVerified &&
              data.user.roles &&
              data.user.roles.includes('ADMIN')
            ) {
              window.location.href = '/admin';
            } else if (data.user && data.user.isVerified) {
              window.location.href = '/';
            }
            // If user is not verified, stay on auth page
          }, 2000);
        }
      }
    };

    // Add event listeners

    // Initialize socket service for auth events - use singleton to avoid duplicate connections
    const initializeAuthSocketEvents = async () => {
      try {
        const { socketSingleton } = await import(
          '../services/socket.singleton'
        );

        // Only ensure connection if user is authenticated
        if (user) {
          await socketSingleton.ensureReady();
        }

        // Listen for email verification events in pending rooms
        socketSingleton.on('emailVerified', async (data: any) => {
          if (data.success && data.user) {
            // Check if we have tokens in the data
            if (data.tokens) {
              try {
                const loginResult = await loginWithTokens(data.tokens);

                if (loginResult.success) {
                  // Successfully logged in with tokens
                } else {
                  // Fallback to setting user directly
                  if (data.user.isVerified) {
                    setUser(data.user);
                  }
                }
              } catch (error) {
                // Fallback to setting user directly
                if (data.user.isVerified) {
                  setUser(data.user);
                }
              }
            } else {
              // Only set user if they are verified
              if (data.user.isVerified) {
                setUser(data.user);
              } else {
                return;
              }
            }

            // Check if user was on auth page or verify-email page and redirect based on role
            const currentPath = window.location.pathname;
            if (
              currentPath === '/auth' ||
              currentPath.startsWith('/auth/') ||
              currentPath === '/verify-email'
            ) {
              setTimeout(() => {
                if (
                  data.user &&
                  data.user.isVerified &&
                  data.user.roles &&
                  data.user.roles.includes('ADMIN')
                ) {
                  window.location.href = '/admin';
                } else if (data.user && data.user.isVerified) {
                  window.location.href = '/';
                }
                // If user is not verified, stay on current page
              }, 2000);
            }
          }
        });

        // Auto-join pending verification rooms for users on auth page
        const currentPath = window.location.pathname;
        if (currentPath === '/auth' || currentPath.startsWith('/auth/')) {
          // Listen for email input changes to auto-join pending verification rooms
          const setupEmailListener = () => {
            const emailInputs = document.querySelectorAll(
              'input[type="text"][name="email"]'
            );
            emailInputs.forEach((input) => {
              const emailInput = input as HTMLInputElement;
              if (emailInput && !emailInput.dataset.pendingRoomListener) {
                emailInput.dataset.pendingRoomListener = 'true';

                const handleEmailChange = async () => {
                  const email = emailInput.value?.trim().toLowerCase();
                  if (email && email.includes('@') && email.includes('.')) {
                    try {
                      await socketSingleton.joinPendingVerificationRoom(email);
                    } catch (error) {
                      // Failed to join pending verification room
                    }
                  }
                };

                // Join room on input change (with debounce)
                let timeoutId: NodeJS.Timeout;
                emailInput.addEventListener('input', () => {
                  clearTimeout(timeoutId);
                  timeoutId = setTimeout(handleEmailChange, 1000); // 1 second debounce
                });

                // Also join immediately if email is already filled
                if (emailInput.value?.trim()) {
                  handleEmailChange();
                }
              }
            });
          };

          // Set up listener immediately and also on DOM changes
          setupEmailListener();

          // Use MutationObserver to catch dynamically added email inputs
          const observer = new MutationObserver(() => {
            setupEmailListener();
          });

          observer.observe(document.body, {
            childList: true,
            subtree: true,
          });
        }

        // Listen for force logout events (password change/reset)
        socketSingleton.on('forceLogout', async (data: any) => {
          // Use existing logout function
          await logout();

          // Redirect to login page
          window.location.href = '/auth';
        });

        // Also listen for custom force logout events (for timing issues)
        window.addEventListener('forceLogout', handleForceLogout);

        // Add rate limiting error listener
        window.addEventListener(
          'rateLimitExceeded',
          handleRateLimitError as EventListener
        );

        // Add a general event listener for socket events
        socketSingleton.on('connect', () => {
          // Socket connected
        });
      } catch (error) {
        // Failed to initialize socket service
      }
    };

    // Initialize socket service asynchronously
    initializeAuthSocketEvents();

    // Return cleanup function
    return () => {
      isMounted = false;
      // Clean up the custom event listeners
      window.removeEventListener('forceLogout', handleForceLogout);
      window.removeEventListener(
        'rateLimitExceeded',
        handleRateLimitError as EventListener
      );
    };
  }, [checkAuthStatus, loginWithTokens, handleForceLogout, logout, user]);

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

  const value: AuthContextType = {
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
    joinPendingVerificationRoom,
    updateUser,
    isAdmin,
    isSuperAdmin,
    hasRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
