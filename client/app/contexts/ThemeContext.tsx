'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import { buildApiUrl, API_CONFIG } from '../config/api';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const { user, authenticatedFetch } = useAuth();
  const [theme, setThemeState] = useState<Theme>('light');
  const [isDark, setIsDark] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize theme from user preferences or localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (
      user?.preferences?.theme &&
      ['light', 'dark'].includes(user.preferences.theme)
    ) {
      setThemeState(user.preferences.theme as Theme);
    } else if (savedTheme && ['light', 'dark'].includes(savedTheme)) {
      setThemeState(savedTheme);
    }
    // Set loading to false when we have user data or when auth is not loading
    // user can be null (not authenticated) but auth context is loaded
    if (user !== undefined) {
      setIsLoading(false);
    }
  }, [user?.preferences?.theme, user]);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    setIsDark(theme === 'dark');
    root.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const setTheme = async (newTheme: Theme) => {
    // Update local state immediately for responsive UI
    setThemeState(newTheme);

    // Store in localStorage for persistence across sessions
    localStorage.setItem('theme', newTheme);

    // Update user preferences in database if user is logged in
    if (user) {
      try {
        const response = await authenticatedFetch(
          buildApiUrl(API_CONFIG.ENDPOINTS.USERS.PREFERENCES),
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ theme: newTheme }),
          }
        );

        if (!response.ok) {
          // Failed to update theme preference
          // Optionally revert the theme if the backend update fails
          // setThemeState(theme);
        }
      } catch (error) {
        // Error updating theme preference
        // Optionally revert the theme if the backend update fails
        // setThemeState(theme);
      }
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark, isLoading }}>
      {children}
    </ThemeContext.Provider>
  );
};
