'use client';

import { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

interface AdminPasswordEntryProps {
  onSuccess: () => void;
}

// Define error types for better error handling
type ErrorType = 'passwordRequired' | 'invalidAdminPassword' | null;

export default function AdminPasswordEntry({
  onSuccess,
}: AdminPasswordEntryProps) {
  const { t, locale } = useLanguage();
  const [password, setPassword] = useState('');
  const [errorType, setErrorType] = useState<ErrorType>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [touched, setTouched] = useState(false);

  // Function to get translated error message
  const getErrorMessage = (errorType: ErrorType): string => {
    if (!errorType) return '';

    switch (errorType) {
      case 'invalidAdminPassword':
        return t('auth.admin.validation.invalidAdminPassword');
      default:
        return '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorType(null);
    setIsLoading(true);

    // Mark field as touched
    setTouched(true);

    // Validate password is not empty
    if (!password.trim()) {
      setErrorType('passwordRequired');
      setIsLoading(false);
      return;
    }

    // Simple password check - you can modify this to match your security requirements
    if (password === 'admin123') {
      setTimeout(() => {
        setIsLoading(false);
        onSuccess();
      }, 1000);
    } else {
      setTimeout(() => {
        setErrorType('invalidAdminPassword');
        setIsLoading(false);
      }, 1000);
    }
  };

  const handleBlur = () => {
    setTouched(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    // Clear error when user starts typing
    if (errorType) {
      setErrorType(null);
    }
  };

  // Don't clear errors when language changes - they will be translated automatically
  // The errorType remains the same, only the displayed message changes

  return (
    <div className="min-h-screen flex items-center justify-center px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 py-3 sm:py-4 md:py-6 lg:py-8 xl:py-10">
      <div className="w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg">
        {/* Header */}
        <div className="text-center mb-4 sm:mb-6 md:mb-8">
          <div className="mb-4">
            <div className="w-16 h-16 mx-auto mb-4 bg-purple-600/20 rounded-full flex items-center justify-center border border-purple-500/30">
              <svg
                className="w-8 h-8 text-purple-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-white mb-2">
            {t('auth.admin.access')}
          </h1>
          <p className="text-white/70 text-xs sm:text-sm md:text-base">
            {t('auth.admin.enterPassword')}
          </p>
        </div>

        {/* Error Message */}
        {errorType === 'invalidAdminPassword' && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2 sm:p-3 mb-3 sm:mb-4">
            <p
              className={`text-red-400 text-xs sm:text-sm ${
                locale === 'ar' ? 'text-right' : ''
              }`}
            >
              {getErrorMessage(errorType)}
            </p>
          </div>
        )}

        {/* Password Form */}
        <form
          onSubmit={handleSubmit}
          className="space-y-3 sm:space-y-4 md:space-y-6"
        >
          <div>
            <label
              htmlFor="password"
              className={`block text-xs sm:text-sm font-medium text-white/80 mb-1 sm:mb-2 ${
                locale === 'ar' ? 'text-right' : ''
              }`}
            >
              {t('auth.admin.adminPassword')}
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={password}
              onChange={handleInputChange}
              onBlur={handleBlur}
              className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/10 border rounded-lg text-white placeholder-white/50 focus:bg-white/15 transition-all duration-300 text-sm sm:text-base ${
                touched && !password.trim()
                  ? 'border-red-500/50 focus:border-red-500'
                  : 'border-white/20 focus:border-purple-500'
              } ${locale === 'ar' ? 'text-right' : ''}`}
              placeholder={t('auth.admin.adminPasswordPlaceholder')}
              autoComplete="off"
            />
            {touched && !password.trim() && (
              <p
                className={`text-red-400 text-xs mt-1 ${
                  locale === 'ar' ? 'text-right' : ''
                }`}
              >
                {t('auth.admin.validation.passwordRequired')}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-semibold py-2.5 sm:py-3 md:py-4 px-4 sm:px-6 rounded-lg hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 text-sm sm:text-base disabled:cursor-not-allowed min-h-[44px] sm:min-h-[48px] flex items-center justify-center"
          >
            {isLoading ? (
              <>
                {t('auth.admin.verifying')}
              </>
            ) : (
              t('auth.admin.accessAdminPanel')
            )}
          </button>
        </form>

        {/* Info */}
        <div className="text-center mt-3 sm:mt-4 md:mt-6">
          <p className="text-white/50 text-xs sm:text-sm">
            {t('auth.admin.restrictedArea')}
          </p>
        </div>
      </div>
    </div>
  );
}
