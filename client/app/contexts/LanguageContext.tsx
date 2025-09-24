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
  const [isInitialized, setIsInitialized] = useState(false);

  // Performance logging
  const languageStartTime = useRef(Date.now());
  const languageLog = (message: string, data?: any) => {
    const elapsed = Date.now() - languageStartTime.current;
    console.log(`🌐 [LanguageContext] ${message}`, data ? { ...data, elapsed: `${elapsed}ms` } : `(${elapsed}ms)`);
  };

  // Load messages based on current locale
  useEffect(() => {
    const loadMessages = async () => {
      languageLog('Loading messages for locale', { locale });
      try {
        const loadStartTime = Date.now();
        
        // Check if we have a cached version and if it's still valid
        const cacheKey = `messages-${locale}`;
        const cacheVersionKey = `messages-${locale}-version`;
        const currentVersion = Date.now().toString(); // Use timestamp as version
        const cachedVersion = localStorage.getItem(cacheVersionKey);
        const cachedMessages = localStorage.getItem(cacheKey);
        
        // If we have cached messages and they're recent (within 1 hour), use them
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        if (cachedMessages && cachedVersion && parseInt(cachedVersion) > oneHourAgo) {
          const messages = JSON.parse(cachedMessages);
          const loadEndTime = Date.now();
          
          languageLog('Messages loaded from cache', { 
            locale, 
            duration: `${loadEndTime - loadStartTime}ms`,
            messageCount: Object.keys(messages).length 
          });
          setMessages(messages);
          return;
        }
        
        // Always load fresh from dynamic import to get latest translations
        const messages = await import(`../../messages/${locale}.json`);
        const loadEndTime = Date.now();
        
        // Cache the messages with version for future use
        localStorage.setItem(cacheKey, JSON.stringify(messages.default || messages));
        localStorage.setItem(cacheVersionKey, currentVersion);
        
        languageLog('Messages loaded successfully', { 
          locale, 
          duration: `${loadEndTime - loadStartTime}ms`,
          messageCount: Object.keys(messages.default || messages).length 
        });
        setMessages(messages.default || messages);
      } catch (error) {
        languageLog('Failed to load messages for locale, falling back to English', { 
          locale, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
        // Failed to load messages for locale
        // Fallback to English
        const fallbackStartTime = Date.now();
        const fallbackMessages = await import(`../../messages/en.json`);
        const fallbackEndTime = Date.now();
        
        // Cache the fallback messages
        localStorage.setItem(`messages-${locale}`, JSON.stringify(fallbackMessages.default || fallbackMessages));
        localStorage.setItem(`messages-${locale}-version`, Date.now().toString());
        
        languageLog('Fallback messages loaded', { 
          duration: `${fallbackEndTime - fallbackStartTime}ms`,
          messageCount: Object.keys(fallbackMessages.default || fallbackMessages).length 
        });
        setMessages(fallbackMessages.default || fallbackMessages);
      }
    };

    loadMessages();
  }, [locale]);

  // Initialize locale from user preferences or localStorage
  useEffect(() => {
    languageLog('Language initialization started');

    const savedLocale = localStorage.getItem('locale') as Locale;
    languageLog('Language sources checked', { 
      userLanguage: user?.preferences?.language, 
      savedLocale,
      hasUser: !!user 
    });

    if (user?.preferences?.language) {
      languageLog('Setting locale from user preferences', { locale: user.preferences.language });
      setLocaleState(user.preferences.language as Locale);
    } else {
      if (savedLocale && ['en', 'ar'].includes(savedLocale)) {
        languageLog('Setting locale from localStorage', { locale: savedLocale });
        setLocaleState(savedLocale);
      } else {
        languageLog('Using default locale (en)');
      }
    }
  }, [user?.preferences?.language]);

  // Set loading to false only after messages are loaded
  useEffect(() => {
    if (Object.keys(messages).length > 0) {
      setIsLoading(false);
      setIsInitialized(true);
      languageLog('Language context ready', { messageCount: Object.keys(messages).length });
    }
  }, [messages]);

  // Translation function with better error handling
  const t = (key: string): string => {
    if (!key || typeof key !== 'string') {
      console.warn('Invalid translation key:', key);
      return key || '';
    }

    if (Object.keys(messages).length === 0) {
      console.warn('No messages loaded yet for key:', key);
      return key;
    }

    const keys = key.split('.');
    let value: any = messages;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        console.warn(`Translation key not found: ${key} (missing: ${k})`);
        return key; // Return key if translation not found
      }
    }

    return typeof value === 'string' ? value : key;
  };

  // Clear translation cache
  const clearCache = () => {
    languageLog('Clearing translation cache');
    localStorage.removeItem('messages-en');
    localStorage.removeItem('messages-ar');
    localStorage.removeItem('messages-en-version');
    localStorage.removeItem('messages-ar-version');
    // Force reload of current locale
    setMessages({});
    setIsInitialized(false);
    
    // Reload the page to ensure fresh translations
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  // Development helper - expose clearCache to window for debugging
  useEffect(() => {
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      (window as any).clearTranslationCache = clearCache;
      console.log('🌐 Translation cache can be cleared with: window.clearTranslationCache()');
    }
  }, []);

  // Set locale and update backend preferences
  const setLocale = async (newLocale: Locale) => {
    languageLog('setLocale called', { newLocale, currentLocale: locale });
    
    // Update local state immediately for responsive UI
    setLocaleState(newLocale);
    languageLog('Locale state updated locally');

    // Store in localStorage for persistence across sessions
    localStorage.setItem('locale', newLocale);
    languageLog('Locale saved to localStorage');

    // Update user preferences in database if user is logged in
    if (user) {
      languageLog('Updating language preference in database', { userId: user.id });
      try {
        const apiStartTime = Date.now();
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

        const apiEndTime = Date.now();
        languageLog('Language preference API call completed', { 
          status: response.status, 
          duration: `${apiEndTime - apiStartTime}ms` 
        });

        if (!response.ok) {
          languageLog('Failed to update language preference in database', { status: response.status });
          // Failed to update language preference
          // Optionally revert the locale if the backend update fails
          // setLocaleState(locale);
        } else {
          languageLog('Language preference updated successfully in database');
        }
      } catch (error) {
        languageLog('Error updating language preference', { error: error instanceof Error ? error.message : 'Unknown error' });
        // Error updating language preference
        // Optionally revert the locale if the backend update fails
        // setLocaleState(locale);
      }
    } else {
      languageLog('No user logged in - skipping database update');
    }
  };

  const value: LanguageContextType = {
    locale,
    setLocale,
    t,
    isLoading,
    clearCache,
  };

  // Show loading state until translations are ready
  if (!isInitialized) {
    return (
      <LanguageContext.Provider value={value}>
        <div className="min-h-screen bg-site flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      </LanguageContext.Provider>
    );
  }

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};
