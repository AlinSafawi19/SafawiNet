'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useRef,
} from 'react';
import { useAuth } from './AuthContext';
import { buildApiUrl, API_CONFIG } from '../config/api';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => Promise<void>;
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

  // Performance logging
  const themeStartTime = useRef(Date.now());
  const themeLog = (message: string, data?: any) => {
    const elapsed = Date.now() - themeStartTime.current;
    console.log(`🎨 [ThemeContext] ${message}`, data ? { ...data, elapsed: `${elapsed}ms` } : `(${elapsed}ms)`);
  };

  // Initialize theme from user preferences or localStorage
  useEffect(() => {
    themeLog('Theme initialization started');
    // Set loading to false immediately for better performance
    setIsLoading(false);

    const savedTheme = localStorage.getItem('theme') as Theme;
    themeLog('Theme sources checked', { 
      userTheme: user?.preferences?.theme, 
      savedTheme,
      hasUser: !!user 
    });

    if (
      user?.preferences?.theme &&
      ['light', 'dark'].includes(user.preferences.theme)
    ) {
      themeLog('Setting theme from user preferences', { theme: user.preferences.theme });
      setThemeState(user.preferences.theme as Theme);
    } else if (savedTheme && ['light', 'dark'].includes(savedTheme)) {
      themeLog('Setting theme from localStorage', { theme: savedTheme });
      setThemeState(savedTheme);
    } else {
      themeLog('Using default theme (light)');
    }
  }, [user?.preferences?.theme]);

  // Apply theme to document
  useEffect(() => {
    themeLog('Applying theme to document', { theme, isDark: theme === 'dark' });
    const root = document.documentElement;
    setIsDark(theme === 'dark');
    root.classList.toggle('dark', theme === 'dark');
    themeLog('Theme applied to document');
  }, [theme]);

  const setTheme = async (newTheme: Theme) => {
    themeLog('setTheme called', { newTheme, currentTheme: theme });
    
    // Update local state immediately for responsive UI
    setThemeState(newTheme);
    themeLog('Theme state updated locally');

    // Store in localStorage for persistence across sessions
    localStorage.setItem('theme', newTheme);
    themeLog('Theme saved to localStorage');

    // Update user preferences in database if user is logged in
    if (user) {
      themeLog('Updating theme preference in database', { userId: user.id });
      try {
        const apiStartTime = Date.now();
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

        const apiEndTime = Date.now();
        themeLog('Theme preference API call completed', { 
          status: response.status, 
          duration: `${apiEndTime - apiStartTime}ms` 
        });

        if (!response.ok) {
          themeLog('Failed to update theme preference in database', { status: response.status });
          // Failed to update theme preference
          // Optionally revert the theme if the backend update fails
          // setThemeState(theme);
        } else {
          themeLog('Theme preference updated successfully in database');
        }
      } catch (error) {
        themeLog('Error updating theme preference', { error: error instanceof Error ? error.message : 'Unknown error' });
        // Error updating theme preference
        // Optionally revert the theme if the backend update fails
        // setThemeState(theme);
      }
    } else {
      themeLog('No user logged in - skipping database update');
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark, isLoading }}>
      {children}
    </ThemeContext.Provider>
  );
};
