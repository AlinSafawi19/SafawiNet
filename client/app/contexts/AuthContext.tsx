'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { buildApiUrl, API_CONFIG } from '../config/api';

interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  isVerified: boolean;
  twoFactorEnabled: boolean;
  recoveryEmail: string | null;
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
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string; messageKey?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; message?: string; messageKey?: string }>;
  logout: () => Promise<void>;
  checkAuthStatus: () => void;
  refreshToken: () => Promise<boolean>;
  authenticatedFetch: (url: string, options?: RequestInit) => Promise<Response>;
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

  const checkAuthStatus = async () => {
    try {
      // Check if user is logged in by calling the /users/me endpoint
      const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.USERS.ME), {
        method: 'GET',
        credentials: 'include', // Include cookies for session management
      });

      if (response.ok) {
        const userData = await response.json();
        
        // Check if the response has a nested user property or is the user data directly
        const finalUserData = userData.user || userData;
        
        setUser(finalUserData);
      } else if (response.status === 401) {
        // Token might be expired, try to refresh it
        const refreshSuccess = await refreshToken();
        if (!refreshSuccess) {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      setUser(null);
    } finally {
      // Set loading to false after auth check is complete
      // This ensures that even if user is null, we know the auth state
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; message?: string; messageKey?: string }> => {
    try {
      const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.AUTH.LOGIN), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for session management
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        const { user: userData } = data;
        
        // Set user in state (no localStorage needed with cookie-based auth)
        setUser(userData);
        return { success: true };
      } else {
        const errorData = await response.json();
        // Map server error messages to translation keys
        const messageKey = mapServerErrorToTranslationKey(errorData.message);
        return { 
          success: false, 
          message: messageKey ? undefined : errorData.message,
          messageKey: messageKey || undefined
        };
      }
    } catch (error) {
      return { 
        success: false, 
        messageKey: 'auth.messages.generalError'
      };
    }
  };

  const register = async (name: string, email: string, password: string): Promise<{ success: boolean; message?: string; messageKey?: string }> => {
    try {
      const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.AUTH.REGISTER), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for session management
        body: JSON.stringify({ name, email, password }),
      });

      if (response.ok) {
        // Get the success message from the server response
        const responseData = await response.json();
        // Map server success messages to translation keys
        const messageKey = mapServerMessageToTranslationKey(responseData.message);
        return { 
          success: true, 
          message: messageKey ? undefined : responseData.message,
          messageKey: messageKey || undefined
        };
      } else {
        const errorData = await response.json();
        // Map server error messages to translation keys
        const messageKey = mapServerErrorToTranslationKey(errorData.message);
        return { 
          success: false, 
          message: messageKey ? undefined : errorData.message,
          messageKey: messageKey || undefined
        };
      }
    } catch (error) {
      return { 
        success: false, 
        messageKey: 'auth.messages.generalError'
      };
    }
  };

  // Helper function to map server error messages to translation keys
  const mapServerErrorToTranslationKey = (serverMessage: string): string | null => {
    const errorMapping: { [key: string]: string } = {
      'User with this email already exists': 'auth.messages.userAlreadyExists',
      'Account temporarily locked due to too many failed attempts': 'auth.messages.accountLocked',
      'Invalid credentials': 'auth.messages.invalidCredentials',
      'Invalid or expired verification token': 'auth.messages.invalidVerificationToken',
      'Invalid 2FA code': 'auth.messages.invalidTwoFactorCode',
      'Invalid or expired password reset token': 'auth.messages.invalidPasswordResetToken',
      'Invalid refresh token': 'auth.messages.invalidRefreshToken',
      'User not found': 'auth.messages.userNotFound',
      '2FA is already enabled': 'auth.messages.twoFactorAlreadyEnabled',
      '2FA setup not found. Please run setup first.': 'auth.messages.twoFactorSetupNotFound',
      'Invalid TOTP code': 'auth.messages.invalidTOTPCode',
      '2FA is not enabled': 'auth.messages.twoFactorNotEnabled',
      'Invalid code': 'auth.messages.invalidCode',
      'Recovery already in progress. Please wait or check your email.': 'auth.messages.recoveryInProgress',
      'Invalid or expired recovery token': 'auth.messages.invalidRecoveryToken',
      'Email address is already in use by another account': 'auth.messages.emailAlreadyInUse',
      'No recovery staging found or new email not set': 'auth.messages.noRecoveryStaging',
      'No refresh token provided': 'auth.messages.noRefreshTokenProvided',
      'User is already verified': 'auth.messages.userAlreadyVerified',
      'Session not found': 'auth.messages.sessionNotFound',
      'Cannot delete current session': 'auth.messages.cannotDeleteCurrentSession',
      'Notification not found': 'auth.messages.notificationNotFound'
    };
    
    return errorMapping[serverMessage] || null;
  };

  // Helper function to map server success messages to translation keys
  const mapServerMessageToTranslationKey = (serverMessage: string): string | null => {
    const messageMapping: { [key: string]: string } = {
      'User registered successfully. Please check your email to verify your account.': 'auth.messages.registrationSuccess',
      'If an account with this email exists, a password reset link has been sent.': 'auth.messages.passwordResetEmailSent',
      'Password reset successfully. Please log in with your new password.': 'auth.messages.passwordResetSuccess',
      'Email verified successfully': 'auth.messages.emailVerified',
      'Verification email sent successfully': 'auth.messages.verificationEmailSent',
      'Two-factor authentication enabled successfully': 'auth.messages.twoFactorEnabled',
      'Two-factor authentication disabled successfully': 'auth.messages.twoFactorDisabled',
      'Recovery token sent to your recovery email. Please check your inbox.': 'auth.messages.recoveryTokenSent',
      'If the recovery email is registered, you will receive a recovery token shortly.': 'auth.messages.recoveryEmailNotFound',
      'Recovery confirmed. Please verify your new email address to complete the process.': 'auth.messages.recoveryConfirmed',
      'Account recovery completed successfully. Your email has been updated and all sessions have been invalidated.': 'auth.messages.recoveryCompleted',
      'Token refreshed successfully': 'auth.messages.tokenRefreshed',
      'Logged out successfully': 'auth.messages.loggedOut'
    };
    
    return messageMapping[serverMessage] || null;
  };

  const refreshToken = async (): Promise<boolean> => {
    // Prevent multiple simultaneous refresh attempts
    if (isRefreshing) {
      return false;
    }

    try {
      setIsRefreshing(true);
      const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.AUTH.REFRESH), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for session management
      });

      if (response.ok) {
        // Token refreshed successfully, check auth status again
        await checkAuthStatus();
        return true;
      } else {
        // Refresh failed, user needs to login again
        setUser(null);
        return false;
      }
    } catch (error) {
      setUser(null);
      return false;
    } finally {
      setIsRefreshing(false);
    }
  };

  // Enhanced refresh token function that can be called automatically
  const autoRefreshToken = async (): Promise<boolean> => {
    if (isRefreshing) {
      // Wait for current refresh to complete
      while (isRefreshing) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return user !== null; // Return current state after refresh completes
    }
    return await refreshToken();
  };

  // Utility function for making authenticated API calls with automatic token refresh
  const authenticatedFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
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
  };

  const logout = async () => {
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
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Set up automatic token refresh timer
  useEffect(() => {
    if (!user) return;

    // Refresh token every 14 minutes (assuming 15-minute token lifetime)
    const refreshInterval = setInterval(async () => {
      if (user) {
        await autoRefreshToken();
      }
    }, 14 * 60 * 1000); // 14 minutes

    return () => clearInterval(refreshInterval);
  }, [user]);

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    register,
    logout,
    checkAuthStatus,
    refreshToken,
    authenticatedFetch,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
