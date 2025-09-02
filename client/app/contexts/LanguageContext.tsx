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

type Locale = 'en' | 'ar';

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
  isLoading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined
);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({
  children,
}) => {
  const { user, authenticatedFetch } = useAuth();
  const [locale, setLocaleState] = useState<Locale>('en');
  const [messages, setMessages] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);

  // Load messages based on current locale
  useEffect(() => {
    const loadMessages = async () => {
      try {
        const messages = await import(`../../messages/${locale}.json`);
        setMessages(messages.default || messages);
      } catch (error) {
        // Failed to load messages for locale
        // Fallback to English
        const fallbackMessages = await import(`../../messages/en.json`);
        setMessages(fallbackMessages.default || fallbackMessages);
      }
    };

    loadMessages();
  }, [locale]);

  // Initialize locale from user preferences or localStorage
  useEffect(() => {
    if (user?.preferences?.language) {
      setLocaleState(user.preferences.language as Locale);
    } else {
      const savedLocale = localStorage.getItem('locale') as Locale;
      if (savedLocale && ['en', 'ar'].includes(savedLocale)) {
        setLocaleState(savedLocale);
      }
    }
    // Set loading to false when we have user data or when auth is not loading
    // user can be null (not authenticated) but auth context is loaded
    if (user !== undefined) {
      setIsLoading(false);
    }
  }, [user]);

  // Translation function
  const t = (key: string): string => {
    const keys = key.split('.');
    let value: any = messages;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return key; // Return key if translation not found
      }
    }

    return typeof value === 'string' ? value : key;
  };

  // Set locale and update backend preferences
  const setLocale = async (newLocale: Locale) => {
    // Update local state immediately for responsive UI
    setLocaleState(newLocale);

    // Store in localStorage for persistence across sessions
    localStorage.setItem('locale', newLocale);

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
            body: JSON.stringify({ language: newLocale }),
          }
        );

        if (!response.ok) {
          // Failed to update language preference
          // Optionally revert the locale if the backend update fails
          // setLocaleState(locale);
        }
      } catch (error) {
        // Error updating language preference
        // Optionally revert the locale if the backend update fails
        // setLocaleState(locale);
      }
    }
  };

  const value: LanguageContextType = {
    locale,
    setLocale,
    t,
    isLoading,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};
