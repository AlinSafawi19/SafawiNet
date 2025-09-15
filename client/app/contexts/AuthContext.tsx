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

  const refreshToken = useCallback(async (): Promise<boolean> => {
    // Prevent multiple simultaneous refresh attempts
    if (isRefreshing) {
      console.log('🔄 AuthContext - Refresh already in progress, skipping');
      return false;
    }

    try {
      console.log('🔄 AuthContext - Starting token refresh');
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

      console.log('🔄 AuthContext - Refresh response status:', response.status);

      if (response.ok) {
        console.log('🔄 AuthContext - Token refreshed successfully');
        // Token refreshed successfully, but don't call /users/me again
        // The user will remain in their current state, and the next API call
        // will use the refreshed token automatically
        return true;
      } else if (response.status === 400) {
        console.log(
          '🔄 AuthContext - 400 response (no refresh token available)'
        );
        // This is normal for new visitors with no refresh token
        // 400 responses won't show as errors in console for better UX
        // Don't set user to null immediately - let the next auth check handle it
        return false;
      } else {
        console.log(
          '🔄 AuthContext - Refresh failed with status:',
          response.status
        );
        // Only log actual errors (not 400s)
        // Don't set user to null immediately - let the next auth check handle it
        return false;
      }
    } catch (error) {
      console.error('🔄 AuthContext - Refresh error:', error);
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
        // Set cookies for the tokens - use names that match the backend JWT guard
        document.cookie = `accessToken=${tokens.accessToken}; path=/; max-age=${tokens.expiresIn}; secure; samesite=strict`;
        document.cookie = `refreshToken=${
          tokens.refreshToken
        }; path=/; max-age=${tokens.expiresIn * 2}; secure; samesite=strict`;

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
          const finalUserData = userData.user || userData;

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
    }
  }, []);

  // Define force logout handler before useEffect to avoid scope issues
  const handleForceLogout = useCallback(
    async (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log(
        '🚪 Force logout event received via custom event:',
        customEvent.detail
      );

      // Use existing logout function
      await logout();

      // Redirect to login page
      window.location.href = '/auth';
    },
    [logout]
  );

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
        console.log('📬 Offline messages retrieved:', data);

        if (data.messages && data.messages.length > 0) {
          console.log(`📬 Processing ${data.messages.length} offline messages`);

          // Process each message
          for (const message of data.messages) {
            console.log('📬 Processing offline message:', message);

            // Handle different message types
            switch (message.event) {
              case 'forceLogout':
                console.log('🚪 Processing offline force logout');
                handleForceLogout(
                  new CustomEvent('forceLogout', { detail: message.payload })
                );
                break;

              default:
                console.log('📬 Unknown offline message type:', message.event);
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
            console.log('✅ Offline messages marked as processed');
          } catch (error) {
            console.error(
              '❌ Failed to mark offline messages as processed:',
              error
            );
          }
        } else {
          console.log('📬 No offline messages found');
        }
      } else {
        console.log('📬 No offline messages or error fetching messages');
      }
    } catch (error) {
      console.error('❌ Error checking offline messages:', error);
    }
  }, [handleForceLogout]);

  const checkAuthStatus = useCallback(async () => {
    // Prevent multiple calls during initialization to avoid duplicate API calls
    // This fixes the performance issue where /users/me and /v1/auth/refresh were called twice
    if (hasInitialized || isInitializingRef.current) {
      return;
    }

    isInitializingRef.current = true;

    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 Checking authentication status...');
      }

      // Always check the backend for authentication status
      // HTTP-only cookies can't be read by JavaScript, so we rely on the backend
      const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.USERS.ME), {
        method: 'GET',
        credentials: 'include', // Include cookies for session management
      });

      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 /users/me response:', {
          status: response.status,
          ok: response.ok,
        });
      }

      if (response.ok) {
        const userData = await response.json();

        // Check if the response has a nested user property or is the user data directly
        const finalUserData = userData.user || userData;

        if (process.env.NODE_ENV === 'development') {
          console.log('🔍 User data received:', finalUserData);
        }

        // Check if user is verified before setting login state
        if (!finalUserData.isVerified) {
          if (process.env.NODE_ENV === 'development') {
            console.log('🔍 User not verified, logging out');
          }
          setUser(null);
          return;
        }

        console.log('🔍 Setting user state in checkAuthStatus:', finalUserData);
        setUser(finalUserData);

        // Check for offline messages after successful authentication - defer to avoid blocking
        setTimeout(() => {
          checkOfflineMessages();
        }, 2000); // Increased delay to not block initial render
      } else if (response.status === 401) {
        // Token might be expired, try to refresh it silently
        if (process.env.NODE_ENV === 'development') {
          console.log('🔍 401 response, attempting token refresh...');
        }
        const refreshSuccess = await refreshToken();
        if (!refreshSuccess) {
          // This is normal for new visitors - no need to log as error
          if (process.env.NODE_ENV === 'development') {
            console.log('🔍 Token refresh failed, user not authenticated');
          }
          setUser(null);
        }
      } else if (response.status === 403) {
        // Forbidden - user might be logged out due to session issues
        if (process.env.NODE_ENV === 'development') {
          console.log('🔍 403 response, user session may be invalid');
        }
        setUser(null);
      } else {
        // Only log actual errors (not 401s or 403s)
        if (process.env.NODE_ENV === 'development') {
          console.log('🔍 Unexpected response status:', response.status);
        }
        setUser(null);
      }
    } catch (error) {
      // Only log actual network/technical errors
      if (process.env.NODE_ENV === 'development') {
        console.error('🔍 Error checking auth status:', error);
      }
      setUser(null);
    } finally {
      // Set loading to false after auth check is complete
      // This ensures that even if user is null, we know the auth state
      setIsLoading(false);
      setHasInitialized(true);
      isInitializingRef.current = false; // Reset the ref after initialization
    }
  }, [hasInitialized, refreshToken, checkOfflineMessages]);

  const login = async (
    email: string,
    password: string
  ): Promise<{
    success: boolean;
    message?: string;
    messageKey?: string;
    user?: User;
  }> => {
    try {
      console.log('🔐 AuthContext - Starting login process for:', email);

      const response = await fetch(
        buildApiUrl(API_CONFIG.ENDPOINTS.AUTH.LOGIN),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // Include cookies for session management
          body: JSON.stringify({ email, password }),
        }
      );

      console.log('🔐 AuthContext - Login response status:', response.status);
      console.log('🔐 AuthContext - Login response ok:', response.ok);

      if (response.ok) {
        const data = await response.json();
        console.log('🔐 AuthContext - Login response data:', data);

        const {
          user: userData,
          requiresTwoFactor,
          requiresVerification,
        } = data;

        // Check if user is verified before setting login state
        if (requiresVerification) {
          console.log('🔐 AuthContext - User requires verification');
          // User is not verified, don't set login state
          return {
            success: false,
            messageKey: 'auth.messages.emailVerificationRequired',
            user: userData, // Still return user data for the form to check
          };
        }

        // Check if 2FA is required
        if (requiresTwoFactor) {
          console.log('🔐 AuthContext - User requires 2FA');
          // User needs to enter 2FA code
          return {
            success: false,
            messageKey: 'auth.messages.twoFactorRequired',
            user: userData, // Return user data for 2FA form
            requiresTwoFactor: true,
          } as any;
        }

        console.log('🔐 AuthContext - Setting user state:', userData);
        // User is verified and no 2FA required, set login state
        setUser(userData);

        // Check for offline messages after successful authentication
        setTimeout(() => {
          checkOfflineMessages();
        }, 1000); // Small delay to ensure user state is set

        console.log('🔐 AuthContext - Login successful, returning success');
        return { success: true, user: userData };
      } else {
        const errorData = await response.json();
        console.log('🔐 AuthContext - Login failed with error:', errorData);
        // Map server error messages to translation keys
        const messageKey = mapServerErrorToTranslationKey(errorData.message);
        return {
          success: false,
          message: messageKey ? undefined : errorData.message,
          messageKey: messageKey || undefined,
        };
      }
    } catch (error) {
      console.error('🔐 AuthContext - Login error:', error);
      return {
        success: false,
        messageKey: 'auth.messages.generalError',
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
          const finalUserData = userDataResponse.user || userDataResponse;

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
        const messageKey = mapServerErrorToTranslationKey(errorData.message);
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
        import('../services/socket.service')
          .then(async ({ initializeSocketService }) => {
            console.log(
              '🔌 Initializing socket service for pending verification room...'
            );
            const socketService = await initializeSocketService();
            console.log('🔌 Socket service initialized, connecting...');
            try {
              await socketService.connect(); // Connect anonymously and wait for connection
              console.log(
                '🔌 Socket connected, joining pending verification room for:',
                email.toLowerCase()
              );
              console.log(
                '🔌 Socket connection state:',
                socketService.isSocketConnected()
              );

              await socketService.joinPendingVerificationRoom(
                email.toLowerCase()
              );
              console.log(
                '✅ Successfully joined pending verification room for:',
                email.toLowerCase()
              );

              // Set up listener for pending verification room joined confirmation
              socketService.on('pendingVerificationRoomJoined', (data: any) => {
                console.log(
                  '🎉 Confirmed: Joined pending verification room:',
                  data
                );
              });

              // Set up emailVerified listener immediately for this registration
              socketService.on('emailVerified', async (data: any) => {
                console.log(
                  '🔔 Registration socket received emailVerified event:',
                  data
                );
                console.log('🔔 Current user state before processing:', user);
                console.log(
                  '🔔 Socket connection state:',
                  socketService.isSocketConnected()
                );

                if (data.success && data.user) {
                  // Check if we have tokens in the data
                  if (data.tokens) {
                    console.log(
                      '🔑 Registration: Tokens received, attempting login...'
                    );
                    console.log('🔑 Registration: Token data:', {
                      accessToken: data.tokens.accessToken
                        ? 'PRESENT'
                        : 'MISSING',
                      refreshToken: data.tokens.refreshToken
                        ? 'PRESENT'
                        : 'MISSING',
                      expiresIn: data.tokens.expiresIn,
                    });
                    try {
                      const loginResult = await loginWithTokens(data.tokens);
                      if (loginResult.success) {
                        console.log(
                          '✅ Registration: User successfully logged in via pending verification room'
                        );
                      } else {
                        console.log(
                          '❌ Registration: Failed to login with tokens:',
                          loginResult.message
                        );
                      }
                    } catch (error) {
                      console.error(
                        '❌ Registration: Error during token-based login:',
                        error
                      );
                    }
                  } else {
                    console.log(
                      '⚠️ Registration: No tokens received, setting user state only'
                    );
                    // Only set user if they are verified
                    if (data.user.isVerified) {
                      setUser(data.user);
                      console.log(
                        '✅ Registration: User state updated with verified user'
                      );
                    } else {
                      console.log(
                        '❌ Registration: User not verified, not setting login state'
                      );
                      return;
                    }
                  }

                  // Check if user was on auth page or verify-email page and redirect based on role
                  const currentPath = window.location.pathname;
                  console.log('📍 Registration: Current path:', currentPath);
                  if (
                    currentPath === '/auth' ||
                    currentPath.startsWith('/auth/') ||
                    currentPath === '/verify-email'
                  ) {
                    console.log(
                      '🔄 Registration: Scheduling redirect in 2 seconds...'
                    );
                    setTimeout(() => {
                      if (
                        data.user &&
                        data.user.isVerified &&
                        data.user.roles &&
                        data.user.roles.includes('ADMIN')
                      ) {
                        console.log(
                          '👑 Registration: Redirecting admin to /admin'
                        );
                        window.location.href = '/admin';
                      } else if (data.user && data.user.isVerified) {
                        console.log('🏠 Registration: Redirecting user to /');
                        window.location.href = '/';
                      }
                    }, 2000);
                  } else {
                    console.log(
                      'ℹ️ Registration: Not on auth/verify-email page, no redirect needed'
                    );
                  }
                }
              });
            } catch (error) {
              console.error('❌ Failed to connect socket or join room:', error);
            }
          })
          .catch((error) => {
            console.error('❌ Failed to import socket service:', error);
          });

        return {
          success: true,
          message: messageKey ? undefined : responseData.message,
          messageKey: messageKey || undefined,
        };
      } else {
        const errorData = await response.json();
        // Map server error messages to translation keys
        const messageKey = mapServerErrorToTranslationKey(errorData.message);
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

  // Utility function for making authenticated API calls with automatic token refresh
  const authenticatedFetch = useCallback(
    async (url: string, options: RequestInit = {}): Promise<Response> => {
      // Make the initial request
      let response = await fetch(url, {
        ...options,
        credentials: 'include',
      });

      // If we get a 401, try to refresh the token and retry the request
      if (response.status === 401) {
        const refreshSuccess = await autoRefreshToken();
        if (refreshSuccess) {
          // Retry the original request with the new token
          response = await fetch(url, {
            ...options,
            credentials: 'include',
          });
        }
      }

      return response;
    },
    [autoRefreshToken]
  );

  // Utility function to join pending verification room for cross-browser sync
  const joinPendingVerificationRoom = async (email: string) => {
    try {
      console.log(
        '🔗 AuthContext: Joining pending verification room for:',
        email
      );
      const { initializeSocketService } = await import(
        '../services/socket.service'
      );
      const socketService = await initializeSocketService();
      await socketService.connect();
      await socketService.joinPendingVerificationRoom(email.toLowerCase());
      console.log(
        '✅ AuthContext: Successfully joined pending verification room for:',
        email
      );
    } catch (error) {
      console.error(
        '❌ AuthContext: Failed to join pending verification room:',
        error
      );
    }
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

    const initializeAuth = async () => {
      if (isMounted) {
        await checkAuthStatus();
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

    // Lazy load socket service only when needed - defer to avoid blocking initial render
    const initializeSocketService = async () => {
      // Only initialize socket service after a delay to not block initial page load
      setTimeout(async () => {
        try {
          const { initializeSocketService } = await import('../services/socket.service');
          console.log(
            '🌐 Setting up global socket listener for pending verification rooms...'
          );
          const socketService = await initializeSocketService();
          console.log(
            '🌐 Socket service initialized for global listener, connecting...'
          );
          
          // Connect anonymously to listen for verification events
          await socketService.connect();
          console.log(
            '🌐 Global socket connected, setting up emailVerified listener...'
          );

          // Set up connection monitoring
          socketService.on('connect', () => {
            console.log('🌐 Global socket reconnected');
          });

          socketService.on('disconnect', () => {
            console.log('🌐 Global socket disconnected');
          });

          // Listen for email verification events in pending rooms
          socketService.on('emailVerified', async (data: any) => {
            console.log('🔔 Socket received emailVerified event:', data);
            console.log('🔔 Current user state before processing:', user);
            console.log(
              '🔔 Socket connection state:',
              socketService.isSocketConnected()
            );

            if (data.success && data.user) {
              // Check if we have tokens in the data
              if (data.tokens) {
                console.log('🔑 Tokens received, attempting login...');
                console.log('🔑 Token data:', {
                  accessToken: data.tokens.accessToken ? 'PRESENT' : 'MISSING',
                  refreshToken: data.tokens.refreshToken ? 'PRESENT' : 'MISSING',
                  expiresIn: data.tokens.expiresIn,
                });
                try {
                  const loginResult = await loginWithTokens(data.tokens);
                  if (loginResult.success) {
                    console.log(
                      '✅ User successfully logged in via pending verification room'
                    );
                  } else {
                    console.log(
                      '❌ Failed to login with tokens:',
                      loginResult.message
                    );
                  }
                } catch (error) {
                  console.error('❌ Error during token-based login:', error);
                }
              } else {
                console.log('⚠️ No tokens received, setting user state only');
                // Only set user if they are verified
                if (data.user.isVerified) {
                  setUser(data.user);
                  console.log('✅ User state updated with verified user');
                } else {
                  console.log('❌ User not verified, not setting login state');
                  // User not verified, don't set login state
                  return;
                }
              }

              // Check if user was on auth page or verify-email page and redirect based on role
              const currentPath = window.location.pathname;
              console.log('📍 Current path:', currentPath);
              if (
                currentPath === '/auth' ||
                currentPath.startsWith('/auth/') ||
                currentPath === '/verify-email'
              ) {
                console.log('🔄 Scheduling redirect in 2 seconds...');
                setTimeout(() => {
                  if (
                    data.user &&
                    data.user.isVerified &&
                    data.user.roles &&
                    data.user.roles.includes('ADMIN')
                  ) {
                    console.log('👑 Redirecting admin to /admin');
                    window.location.href = '/admin';
                  } else if (data.user && data.user.isVerified) {
                    console.log('🏠 Redirecting user to /');
                    window.location.href = '/';
                  }
                  // If user is not verified, stay on current page
                }, 2000);
              } else {
                console.log(
                  'ℹ️ Not on auth/verify-email page, no redirect needed'
                );
              }
            } else {
              // Email verification event received but data is invalid
            }
          });

          // Auto-join pending verification rooms for users on auth page
          const currentPath = window.location.pathname;
          if (currentPath === '/auth' || currentPath.startsWith('/auth/')) {
            console.log(
              '🔍 On auth page, setting up auto-join for pending verification rooms...'
            );

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
                      console.log(
                        '📧 Email entered on auth page, joining pending verification room for:',
                        email
                      );
                      try {
                        await socketService.joinPendingVerificationRoom(email);
                        console.log(
                          '✅ Successfully joined pending verification room for:',
                          email
                        );
                      } catch (error) {
                        console.error(
                          '❌ Failed to join pending verification room:',
                          error
                        );
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

          // Test if the connection is working

          // Test if we can receive any events
          socketService.on('connect', () => {
            console.log('🔌 WebSocket connected in AuthContext');
          });

          socketService.on('disconnect', () => {
            console.log('🔌 WebSocket disconnected in AuthContext');
          });

          // Test if we can receive the pending verification room joined event
          socketService.on('pendingVerificationRoomJoined', (data: any) => {
            // Pending verification room joined event received
          });

          // Listen for force logout events (password change/reset)
          socketService.on('forceLogout', async (data: any) => {
            console.log('🚪 Force logout event received via socket:', data);

            // Use existing logout function
            await logout();

            // Redirect to login page
            window.location.href = '/auth';
          });

          // Also listen for custom force logout events (for timing issues)
          window.addEventListener('forceLogout', handleForceLogout);

          // Test WebSocket communication by emitting a test event
          setTimeout(() => {
            if (socketService.isSocketConnected()) {
              // Try to emit a test event to see if the connection is working
              const socket = socketService.getSocket();
              if (socket) {
                socket.emit('test', { message: 'Testing WebSocket connection' });
              }
            }
          }, 2000);
        } catch (error) {
          console.error('❌ Failed to initialize socket service:', error);
        }
      }, 3000); // Delay socket initialization by 3 seconds to not block initial render
    };

    // Initialize socket service asynchronously
    initializeSocketService();

    // Return cleanup function
    return () => {
      isMounted = false;
      // Clean up the custom event listener
      window.removeEventListener('forceLogout', handleForceLogout);
    };
  }, [checkAuthStatus, loginWithTokens, user, handleForceLogout, logout]);

  // Set up automatic token refresh timer
  useEffect(() => {
    if (!user) return;

    console.log(
      '⏰ AuthContext - Setting up automatic refresh timer for user:',
      user.email
    );

    // Refresh token every 14 minutes (assuming 15-minute token lifetime)
    const refreshInterval = setInterval(async () => {
      if (user) {
        console.log(
          '⏰ AuthContext - Automatic refresh triggered for user:',
          user.email
        );
        await autoRefreshToken();
      }
    }, 14 * 60 * 1000); // 14 minutes

    return () => {
      console.log('⏰ AuthContext - Clearing refresh timer');
      clearInterval(refreshInterval);
    };
  }, [user, autoRefreshToken]);

  const updateUser = useCallback((updatedUser: User) => {
    setUser(updatedUser);
  }, []);

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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
