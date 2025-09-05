'use client';

import { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

export default function AccountRecoveryPage() {
  const { t, locale } = useLanguage();
  const router = useRouter();
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageKey, setMessageKey] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
  const [emailError, setEmailError] = useState('');
  const [touched, setTouched] = useState({ recoveryEmail: false });

  // Email validation function
  const validateEmail = (email: string): string => {
    if (!email.trim()) {
      return 'auth.validation.emailRequired';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'auth.validation.emailInvalid';
    }
    return '';
  };

  // Handle email input change
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setRecoveryEmail(value);

    // Clear error when user starts typing
    if (emailError) {
      setEmailError('');
    }
  };

  // Handle email field blur for validation
  const handleEmailBlur = () => {
    setTouched((prev) => ({ ...prev, recoveryEmail: true }));
    const error = validateEmail(recoveryEmail);
    setEmailError(error);
  };

  // Get input class based on validation state
  const getInputClass = () => {
    const hasError = touched.recoveryEmail && emailError;
    return hasError
      ? 'w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/10 border border-red-500/50 rounded-lg text-white placeholder-white/50 focus:border-red-500 focus:bg-white/15 transition-all duration-300 autofill:bg-white/10 autofill:text-white text-sm sm:text-base'
      : 'w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:border-purple-500 focus:bg-white/15 transition-all duration-300 autofill:bg-white/10 autofill:text-white text-sm sm:text-base';
  };

  // Map backend messages to translation keys
  const mapBackendMessageToTranslationKey = (message: string): string => {
    const messageMap: { [key: string]: string } = {
      'If the recovery email is registered, you will receive a recovery token shortly.': 'auth.messages.recoveryEmailNotFound',
      'Recovery token sent to your recovery email. Please check your inbox.': 'auth.messages.recoveryTokenSent',
      'Recovery already in progress. Please wait or check your email.': 'auth.messages.recoveryInProgress',
      'Invalid or expired recovery token': 'auth.messages.invalidRecoveryToken',
      'Email address is already in use by another account': 'auth.messages.emailAlreadyInUse',
      'Recovery confirmed. Please verify your new email address to complete the process.': 'auth.messages.recoveryConfirmed',
      'No recovery staging found or new email not set': 'auth.messages.noRecoveryStaging',
      'Account recovery completed successfully. Your email has been updated and all sessions have been invalidated.': 'auth.messages.recoveryCompleted',
      'Invalid or expired verification token': 'auth.messages.invalidVerificationToken',
    };
    
    return messageMap[message] || 'auth.messages.generalError';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark email as touched and validate
    setTouched((prev) => ({ ...prev, recoveryEmail: true }));
    const emailValidationError = validateEmail(recoveryEmail);
    setEmailError(emailValidationError);

    // Don't submit if validation fails
    if (emailValidationError) {
      return;
    }

    setIsLoading(true);
    setMessage('');
    setMessageKey('');
    setMessageType('');

    try {
      const response = await fetch('http://localhost:3000/v1/auth/recover/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ recoveryEmail }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessageType('success');
        // Store translation key instead of translated message
        const translationKey = mapBackendMessageToTranslationKey(data.message);
        setMessageKey(translationKey);
        setRecoveryEmail('');
        setEmailError('');
        setTouched({ recoveryEmail: false });
      } else {
        setMessageType('error');
        // Store translation key instead of translated message
        const translationKey = mapBackendMessageToTranslationKey(data.message);
        setMessageKey(translationKey);
      }
    } catch (error) {
      setMessageType('error');
      setMessageKey('auth.messages.generalError');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={`min-h-screen flex flex-col lg:flex-row bg-zinc-900 ${
        locale === 'ar' ? 'rtl' : 'ltr'
      }`}
    >
      {/* Left side - Form */}
      <div className="flex-1 lg:basis-1/2 flex items-center justify-center px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 py-3 sm:py-4 md:py-6 lg:py-8 xl:py-10">
        <div className="w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg">
          {/* Header */}
          <div className="auth-screen text-center mb-4 sm:mb-6 md:mb-8">
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-white mb-2">
              {t('auth.accountRecovery.title')}
            </h1>
            <p className="text-white/70 text-xs sm:text-sm md:text-base">
              {t('auth.accountRecovery.subtitle')}
            </p>
          </div>

          {/* Message Display */}
          {(message || messageKey) && (
            <div
              className={`border rounded-lg p-2 sm:p-3 mb-3 sm:mb-4 ${
                messageType === 'success'
                  ? 'bg-green-500/10 border-green-500/20'
                  : 'bg-red-500/10 border-red-500/20'
              }`}
            >
              <p
                className={`text-xs sm:text-sm ${
                  messageType === 'success' ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {messageKey ? t(messageKey) : message}
              </p>
            </div>
          )}

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="space-y-3 sm:space-y-4 md:space-y-6"
          >
            <div>
              <label
                htmlFor="recoveryEmail"
                className="block text-xs sm:text-sm font-medium text-white/80 mb-1 sm:mb-2"
              >
                {t('auth.accountRecovery.recoveryEmailLabel')}
              </label>
              <input
                type="text"
                id="recoveryEmail"
                name="recoveryEmail"
                value={recoveryEmail}
                onChange={handleEmailChange}
                onBlur={handleEmailBlur}
                className={getInputClass()}
                placeholder={t('auth.accountRecovery.recoveryEmailPlaceholder')}
              />
              {touched.recoveryEmail && emailError && (
                <p className="text-red-400 text-xs mt-1">{t(emailError)}</p>
              )}
              <p className="text-white/50 text-xs mt-1">
                {t('auth.accountRecovery.recoveryEmailHelp')}
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-semibold py-2.5 sm:py-3 md:py-4 px-4 sm:px-6 rounded-lg hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 text-sm sm:text-base disabled:cursor-not-allowed min-h-[44px] sm:min-h-[48px] flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  {t('auth.accountRecovery.sending')}
                </>
              ) : (
                t('auth.accountRecovery.sendRecoveryLink')
              )}
            </button>
          </form>

          {/* Back to Login */}
          <div className="text-center mt-3 sm:mt-4 md:mt-6">
            <p className="text-white/70 text-xs sm:text-sm">
              {t('auth.accountRecovery.rememberCredentials')}
              <Link
                href="/auth"
                className="ml-1 sm:ml-2 text-purple-400 hover:text-purple-300 font-medium transition-colors duration-200 hover:underline"
              >
                {t('auth.accountRecovery.backToLogin')}
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Image */}
      <div className="flex-1 lg:basis-1/2 relative hidden sm:block">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/80 to-pink-900/80 z-10"></div>
        <Image
          src="https://static.wixstatic.com/media/503ea4_ed9a38760ae04aab86b47e82525fdcac~mv2.jpg/v1/fill/w_918,h_585,al_c,q_85,usm_0.66_1.00_0.01,enc_auto/503ea4_ed9a38760ae04aab86b47e82525fdcac~mv2.jpg"
          alt={t('auth.hero.imageAlt')}
          className="w-full h-full object-cover"
          width={1000}
          height={800}
        />
        <div className="auth-screen absolute inset-0 z-20 flex items-center justify-center px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="text-center text-white">
            <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold mb-2 sm:mb-3 md:mb-4">
              {t('auth.accountRecovery.heroTitle')}
            </h1>
            <p className="text-xs sm:text-sm md:text-base lg:text-lg text-white/80 max-w-[200px] sm:max-w-xs md:max-w-sm lg:max-w-md">
              {t('auth.accountRecovery.heroSubtitle')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
