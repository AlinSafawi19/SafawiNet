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
  setLocale: (locale: Locale) => Promise<void>;
  t: (key: string) => string;
  isLoading: boolean;
  clearCache: () => void;
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

        // Check if we have a cached version and if it's still valid
        const cacheKey = `messages-${locale}`;
        const cacheVersionKey = `messages-${locale}-version`;
        const currentVersion = Date.now().toString(); // Use timestamp as version
        const cachedVersion = localStorage.getItem(cacheVersionKey);
        const cachedMessages = localStorage.getItem(cacheKey);

        // If we have cached messages and they're recent (within 1 hour), use them
        const oneHourAgo = Date.now() - 60 * 60 * 1000;
        if (
          cachedMessages &&
          cachedVersion &&
          parseInt(cachedVersion) > oneHourAgo
        ) {
          const messages = JSON.parse(cachedMessages);

          setMessages(messages);
          return;
        }

        // Always load fresh from dynamic import to get latest translations
        const messages = await import(`../../messages/${locale}.json`);

        // Cache the messages with version for future use
        localStorage.setItem(
          cacheKey,
          JSON.stringify(messages.default || messages)
        );
        localStorage.setItem(cacheVersionKey, currentVersion);

        setMessages(messages.default || messages);
      } catch (error) {
        try {
          // Fallback to English messages
          const fallbackMessages = await import(`../../messages/en.json`);

          // Cache the fallback messages
          localStorage.setItem(
            `messages-${locale}`,
            JSON.stringify(fallbackMessages.default || fallbackMessages)
          );
          localStorage.setItem(
            `messages-${locale}-version`,
            Date.now().toString()
          );
          
          setMessages(fallbackMessages.default || fallbackMessages);
        } catch (fallbackError) {
          console.error('💥 LanguageContext: Fallback failed, using empty messages', fallbackError);
          // Use empty messages object as last resort
          setMessages({});
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadMessages();
  }, [locale]);

  // Initialize locale from user preferences or localStorage
  useEffect(() => {
    const savedLocale = localStorage.getItem('locale') as Locale;

    if (user?.preferences?.language) {
      setLocaleState(user.preferences.language as Locale);
    } else {
      if (savedLocale && ['en', 'ar'].includes(savedLocale)) {
        setLocaleState(savedLocale);
      }
    }
  }, [user?.preferences?.language]);

  // Set loading to false only after messages are loaded
  useEffect(() => {
    if (Object.keys(messages).length > 0) {
      setIsLoading(false);
    }
  }, [messages]);

  // Translation function with better error handling
  const t = (key: string): string => {
    
    if (!key || typeof key !== 'string') {
      return key || '';
    }

    if (Object.keys(messages).length === 0) {
      return key;
    }

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

  // Clear translation cache
  const clearCache = () => {
    localStorage.removeItem('messages-en');
    localStorage.removeItem('messages-ar');
    localStorage.removeItem('messages-en-version');
    localStorage.removeItem('messages-ar-version');
    // Force reload of current locale
    setMessages({});

    // Reload the page to ensure fresh translations
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  // Set locale and update backend preferences
  const setLocale = async (newLocale: Locale) => {
    // Update local state immediately for responsive UI
    setLocaleState(newLocale);

    // Store in localStorage for persistence across sessions
    localStorage.setItem('locale', newLocale);

    // Update user preferences in database if user is logged in
    if (user) {
      await authenticatedFetch(
        buildApiUrl(API_CONFIG.ENDPOINTS.USERS.PREFERENCES),
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ language: newLocale }),
        }
      );
    }
  };

  const value: LanguageContextType = {
    locale,
    setLocale,
    t,
    isLoading,
    clearCache,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};
