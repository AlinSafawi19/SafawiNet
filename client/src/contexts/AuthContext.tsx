import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiService, UserProfile, AuthResponse } from '../services/api';

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
  resendVerificationEmail: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  // Check if user is already authenticated on app load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const authenticated = await apiService.isAuthenticated();
        if (authenticated) {
          const userProfile = await apiService.getCurrentUser();
          setUser(userProfile);
        }
      } catch (error) {
        // User not authenticated or token expired
        console.log('User not authenticated:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await apiService.login({ email, password });
      
      // Handle different login responses
      if (response.requiresVerification) {
        // User exists but needs email verification
        // Don't set user as authenticated, just store user info for verification
        setUser(response.user);
        // Don't set tokens, user needs to verify email first
        throw new Error('Please verify your email address before logging in. Check your inbox for a verification link.');
      } else if (response.requiresTwoFactor) {
        // User needs 2FA
        setUser(response.user);
        // Don't set tokens, user needs to complete 2FA first
        throw new Error('Two-factor authentication required');
      } else if (response.user) {
        // Full login successful - user is verified and authenticated
        setUser(response.user);
      }
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await apiService.register({ name, email, password });
      
      // Handle different registration responses
      if (response.requiresVerification) {
        // User registered but needs email verification
        setUser(response.user);
        // Return the response instead of throwing an error
        return response;
      } else if (response.user) {
        // Registration successful and user is verified
        setUser(response.user);
        return response;
      }
      
      return response;
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await apiService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
    }
  };

  const verifyEmail = async (token: string) => {
    try {
      await apiService.verifyEmail(token);
      // After successful verification, check if user is now authenticated
      const authenticated = await apiService.isAuthenticated();
      if (authenticated) {
        const userProfile = await apiService.getCurrentUser();
        setUser(userProfile);
      }
    } catch (error) {
      throw error;
    }
  };

  const resendVerificationEmail = async (email: string) => {
    try {
      await apiService.resendVerificationEmail(email);
    } catch (error) {
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    verifyEmail,
    resendVerificationEmail,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
