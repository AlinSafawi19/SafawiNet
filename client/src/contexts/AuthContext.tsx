import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiService, UserProfile, AuthResponse } from '../services/api';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
  resendVerificationEmail: (email: string) => Promise<void>;
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
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  // Check if user is already authenticated on app load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (apiService.isAuthenticated()) {
          const userProfile = await apiService.getCurrentUser();
          setUser(userProfile);
        }
      } catch (error) {
        // User not authenticated or token expired
        apiService.clearTokens();
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
      } else if (response.tokens) {
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
      // Don't set user as authenticated until email is verified
      // setUser(response.user);
      return response; // Return the response to access the message
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await apiService.logout();
    } finally {
      setUser(null);
    }
  };

  const refreshUser = async () => {
    try {
      if (apiService.isAuthenticated()) {
        const userProfile = await apiService.getCurrentUser();
        setUser(userProfile);
      }
    } catch (error) {
      // User not authenticated or token expired
      apiService.clearTokens();
      setUser(null);
    }
  };

  const verifyEmail = async (token: string) => {
    try {
      await apiService.verifyEmail(token);
      // Refresh user data to get updated verification status
      await refreshUser();
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
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    refreshUser,
    verifyEmail,
    resendVerificationEmail,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
