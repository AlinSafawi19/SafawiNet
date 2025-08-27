import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from './AuthContext';
import { apiService } from '../services/api';

interface LanguageContextType {
  currentLanguage: string;
  changeLanguage: (language: string) => Promise<void>;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const { i18n } = useTranslation();
  const { isAuthenticated, user } = useAuth();
  const [currentLanguage, setCurrentLanguage] = useState<string>('en');

  // Check if language is RTL
  const isRTL = currentLanguage === 'ar';

  useEffect(() => {
    // Initialize language from localStorage or default to 'en'
    const savedLanguage = localStorage.getItem('i18nextLng') || 'en';
    setCurrentLanguage(savedLanguage);
    
    // Set document direction for RTL support
    document.documentElement.dir = savedLanguage === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = savedLanguage;
  }, []);

  const changeLanguage = async (language: string) => {
    try {
      // Change language in i18next
      await i18n.changeLanguage(language);
      
      // Update local state
      setCurrentLanguage(language);
      
      // Update localStorage
      localStorage.setItem('i18nextLng', language);
      
      // Update document direction and language
      document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = language;
      
      // If user is authenticated, update preferences in backend
      if (isAuthenticated && user) {
        try {
          await apiService.updatePreferences({
            language: language
          });
        } catch (error) {
          console.error('Failed to update language preference in backend:', error);
          // Don't throw error here as language change should still work locally
        }
      }
    } catch (error) {
      console.error('Failed to change language:', error);
      throw error;
    }
  };

  const value: LanguageContextType = {
    currentLanguage,
    changeLanguage,
    isRTL,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};
