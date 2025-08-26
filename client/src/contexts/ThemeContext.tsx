import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { apiService } from '../services/api';

type Theme = 'light' | 'dark' | 'auto';

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [theme, setThemeState] = useState<Theme>('light');
  const [isDark, setIsDark] = useState(false);

  // Get system preference
  const getSystemTheme = (): boolean => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  };

  // Apply theme to document
  const applyTheme = (theme: Theme) => {
    const root = document.documentElement;
    let shouldBeDark = false;

    if (theme === 'auto') {
      shouldBeDark = getSystemTheme();
    } else {
      shouldBeDark = theme === 'dark';
    }

    setIsDark(shouldBeDark);

    if (shouldBeDark) {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
  };

  // Initialize theme
  useEffect(() => {
    let initialTheme: Theme = 'light';

    if (isAuthenticated && user?.preferences?.theme) {
      // Use user preference from database
      initialTheme = user.preferences.theme;
    } else {
      // Use localStorage for non-authenticated users
      const savedTheme = localStorage.getItem('theme') as Theme;
      if (savedTheme && ['light', 'dark', 'auto'].includes(savedTheme)) {
        initialTheme = savedTheme;
      }
    }

    setThemeState(initialTheme);
    applyTheme(initialTheme);
  }, [isAuthenticated, user?.preferences?.theme]);

  // Listen for system theme changes
  useEffect(() => {
    if (theme === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme(theme);
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  // Update theme
  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme);
    applyTheme(newTheme);

    if (isAuthenticated) {
      // Update user preferences in database
      try {
        await apiService.updatePreferences({ theme: newTheme });
      } catch (error) {
        console.error('Failed to update theme preference:', error);
      }
    } else {
      // Store in localStorage for non-authenticated users
      localStorage.setItem('theme', newTheme);
    }
  };

  // Toggle between light and dark
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  };

  const value: ThemeContextType = {
    theme,
    isDark,
    toggleTheme,
    setTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
