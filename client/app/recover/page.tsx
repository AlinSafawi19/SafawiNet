'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

interface ValidationErrors {
  newEmail?: string;
}

export default function RecoverPage() {
  const { t, locale } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [newEmail, setNewEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageKey, setMessageKey] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
  const [token, setToken] = useState('');
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState({
    newEmail: false,
  });

  useEffect(() => {
    // Get token from URL query parameter
    const tokenFromUrl = searchParams.get('token');
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
    } else {
      // If no token, redirect to account recovery page
      router.push('/account-recovery');
    }
  }, [searchParams, router]);

  // Real-time validation
  useEffect(() => {
    const errors: ValidationErrors = {};

    // Email validation
    if (touched.newEmail) {
      if (!newEmail.trim()) {
        errors.newEmail = t('auth.validation.emailRequired');
      } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newEmail)) {
          errors.newEmail = t('auth.validation.emailInvalid');
        }
      }
    }

    setValidationErrors(errors);
  }, [newEmail, touched, t]);

  const handleBlur = (field: 'newEmail') => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};

    // Email validation
    if (!newEmail.trim()) {
      errors.newEmail = t('auth.validation.emailRequired');
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newEmail)) {
        errors.newEmail = t('auth.validation.emailInvalid');
      }
    }

    // Token validation
    if (!token) {
      setMessageType('error');
      setMessage(t('auth.messages.invalidRecoveryToken'));
      return false;
    }

    setValidationErrors(errors);
    setTouched({ newEmail: true });

    return Object.keys(errors).length === 0;
  };

  // Map backend messages to translation keys
  const mapBackendMessageToTranslationKey = (message: string): string => {
    const messageMap: { [key: string]: string } = {
      'Recovery confirmed. Please verify your new email address to complete the process.': 'auth.messages.recoveryConfirmed',
      'Invalid or expired recovery token': 'auth.messages.invalidRecoveryToken',
      'Email address is already in use by another account': 'auth.messages.emailAlreadyInUse',
    };
    
    return messageMap[message] || 'auth.messages.generalError';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setMessage('');
    setMessageKey('');
    setMessageType('');

    try {
      const response = await fetch('http://localhost:3000/v1/auth/recover/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          newEmail: newEmail.toLowerCase(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessageType('success');
        // Store translation key instead of translated message
        const translationKey = mapBackendMessageToTranslationKey(data.message);
        setMessageKey(translationKey);
        setNewEmail('');
        setValidationErrors({});
        setTouched({ newEmail: false });
        
        // Redirect to verify email page after 3 seconds
        setTimeout(() => {
          router.push('/verify-email?token=' + data.verificationToken);
        }, 3000);
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

  const isFormValid = () => {
    return (
      newEmail.trim().length > 0 &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail) &&
      Object.keys(validationErrors).length === 0
    );
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-900">
        <div className="text-center text-white">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

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
              {t('auth.recoveryConfirm.title')}
            </h1>
            <p className="text-white/70 text-xs sm:text-sm md:text-base">
              {t('auth.recoveryConfirm.subtitle')}
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
            noValidate
          >
            <div>
              <label
                htmlFor="newEmail"
                className="block text-xs sm:text-sm font-medium text-white/80 mb-1 sm:mb-2"
              >
                {t('auth.recoveryConfirm.newEmailLabel')}
              </label>
              <input
                type="text"
                id="newEmail"
                name="newEmail"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onBlur={() => handleBlur('newEmail')}
                className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/10 border rounded-lg text-white placeholder-white/50 focus:bg-white/15 transition-all duration-300 autofill:bg-white/10 autofill:text-white text-sm sm:text-base ${
                  validationErrors.newEmail
                    ? 'border-red-400 focus:border-red-400'
                    : 'border-white/20 focus:border-purple-500'
                }`}
                placeholder={t('auth.recoveryConfirm.newEmailPlaceholder')}
                aria-describedby={
                  validationErrors.newEmail ? 'newEmail-error' : 'newEmail-help'
                }
              />
              {validationErrors.newEmail ? (
                <p className="text-red-400 text-xs mt-1" id="newEmail-error">
                  {validationErrors.newEmail}
                </p>
              ) : (
                <p className="text-white/50 text-xs mt-1" id="newEmail-help">
                  {t('auth.recoveryConfirm.newEmailHelp')}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || !isFormValid()}
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
                  {t('auth.recoveryConfirm.confirming')}
                </>
              ) : (
                t('auth.recoveryConfirm.confirmRecovery')
              )}
            </button>
          </form>

          {/* Back to Login */}
          <div className="text-center mt-3 sm:mt-4 md:mb-6">
            <p className="text-white/70 text-xs sm:text-sm">
              {t('auth.recoveryConfirm.rememberCredentials')}
              <Link
                href="/auth"
                className="ml-1 sm:ml-2 text-purple-400 hover:text-purple-300 font-medium transition-colors duration-200 hover:underline"
              >
                {t('auth.recoveryConfirm.backToLogin')}
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
              {t('auth.recoveryConfirm.heroTitle')}
            </h1>
            <p className="text-xs sm:text-sm md:text-base lg:text-lg text-white/80 max-w-[200px] sm:max-w-xs md:max-w-sm lg:max-w-md">
              {t('auth.recoveryConfirm.heroSubtitle')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
