'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; message?: string }>;
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

  const checkAuthStatus = async () => {
    try {
      // Check if user is logged in by calling the /users/me endpoint
      const response = await fetch('http://localhost:3000/users/me', {
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
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await fetch('http://localhost:3000/v1/auth/login', {
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
        return { success: false, message: errorData.message || 'Login failed' };
      }
    } catch (error) {
      return { success: false, message: 'An unexpected error occurred during login.' };
    }
  };

  const register = async (name: string, email: string, password: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await fetch('http://localhost:3000/v1/auth/register', {
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
        return { success: true, message: responseData.message };
      } else {
        const errorData = await response.json();
        return { success: false, message: errorData.message || 'Registration failed' };
      }
    } catch (error) {
      return { success: false, message: 'An unexpected error occurred during registration.' };
    }
  };

  const refreshToken = async (): Promise<boolean> => {
    // Prevent multiple simultaneous refresh attempts
    if (isRefreshing) {
      return false;
    }

    try {
      setIsRefreshing(true);
      const response = await fetch('http://localhost:3000/v1/auth/refresh', {
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
      await fetch('http://localhost:3000/v1/auth/logout', {
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
