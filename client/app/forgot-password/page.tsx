'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import Link from 'next/link';
import { ParallaxImage } from '../components/ParallaxImage';
import { useBackendMessageTranslation } from '../hooks/useBackendMessageTranslation';
import { buildApiUrl, API_CONFIG } from '../config/api';

export default function ForgotPasswordPage() {
  const { t, locale } = useLanguage();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [touched, setTouched] = useState({ email: false });

  // Use the backend message translation hook
  const {
    error: forgotError,
    success: forgotSuccess,
    errorKey: forgotErrorKey,
    successKey: forgotSuccessKey,
    setBackendError: setForgotBackendError,
    setBackendSuccess: setForgotBackendSuccess,
    setErrorKey: setForgotErrorKey,
    setSuccessKey: setForgotSuccessKey,
    clearMessages: clearForgotMessages,
  } = useBackendMessageTranslation();

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
    setEmail(value);

    // Clear error when user starts typing
    if (emailError) {
      setEmailError('');
    }
  };

  // Handle email field blur for validation
  const handleEmailBlur = () => {
    setTouched((prev) => ({ ...prev, email: true }));
    const error = validateEmail(email);
    setEmailError(error);
  };

  // Get input class based on validation state
  const getInputClass = () => {
    const hasError = touched.email && emailError;
    return hasError
      ? 'w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/10 border border-red-500/50 rounded-lg text-white placeholder-white/50 focus:border-red-500 focus:bg-white/15 transition-all duration-300 text-sm sm:text-base'
      : 'w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:border-purple-500 focus:bg-white/15 transition-all duration-300 text-sm sm:text-base';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark email as touched and validate
    setTouched((prev) => ({ ...prev, email: true }));
    const emailValidationError = validateEmail(email);
    setEmailError(emailValidationError);

    // Don't submit if validation fails
    if (emailValidationError) {
      return;
    }

    setIsLoading(true);
    clearForgotMessages();

    try {
      const response = await fetch(
        buildApiUrl(API_CONFIG.ENDPOINTS.AUTH.FORGOT_PASSWORD),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        if (data.message) {
          setForgotBackendSuccess(data.message);
        } else {
          setForgotSuccessKey('auth.messages.passwordResetEmailSent');
        }

        setEmail('');
        setEmailError('');
        setTouched({ email: false });
      } else {
        if (data.message) {
          setForgotBackendError(data.message);
        } else {
          setForgotErrorKey('auth.messages.generalError');
        }
      }
    } catch (error) {
      setForgotErrorKey('auth.messages.generalError');
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
              {t('auth.form.resetPassword')}
            </h1>
            <p className="text-white/70 text-xs sm:text-sm md:text-base">
              {t('auth.forgotPassword.subtitle')}
            </p>
          </div>

          {/* Message Display */}
          {(forgotSuccess ||
            forgotSuccessKey ||
            forgotError ||
            forgotErrorKey) && (
            <div
              className={`border rounded-lg p-2 sm:p-3 mb-3 sm:mb-4 ${
                forgotSuccess || forgotSuccessKey
                  ? 'bg-green-500/10 border-green-500/20'
                  : 'bg-red-500/10 border-red-500/20'
              }`}
            >
              <p
                className={`text-xs sm:text-sm ${
                  forgotSuccess || forgotSuccessKey
                    ? 'text-green-400'
                    : 'text-red-400'
                }`}
              >
                {forgotSuccess || (forgotSuccessKey ? t(forgotSuccessKey) : '')}
                {forgotError || (forgotErrorKey ? t(forgotErrorKey) : '')}
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
                htmlFor="email"
                className="block text-xs sm:text-sm font-medium text-white/80 mb-1 sm:mb-2"
              >
                {t('auth.form.emailAddress')}
              </label>
              <input
                type="text"
                id="email"
                name="email"
                value={email}
                onChange={handleEmailChange}
                onBlur={handleEmailBlur}
                className={getInputClass()}
                placeholder={t('auth.form.emailPlaceholder')}
              />
              {touched.email && emailError && (
                <p className="text-red-400 text-xs mt-1">{t(emailError)}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 disabled:cursor-not-allowed disabled:opacity-60 text-white font-semibold py-2.5 sm:py-3 md:py-4 px-4 sm:px-6 rounded-lg hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 text-sm sm:text-base min-h-[44px] sm:min-h-[48px] flex items-center justify-center"
            >
              {isLoading ? (
                <>{t('auth.forgotPassword.sending')}</>
              ) : (
                t('auth.forgotPassword.sendResetLink')
              )}
            </button>
          </form>

          {/* Back to Login */}
          <div className="text-center mt-3 sm:mt-4 md:mt-6">
            <p className="text-white/70 text-xs sm:text-sm">
              {t('auth.forgotPassword.rememberPassword')}
              <Link
                href="/auth"
                className="ml-1 sm:ml-2 text-purple-400 hover:text-purple-300 font-medium transition-colors duration-200 hover:underline"
              >
                {t('auth.forgotPassword.backToLogin')}
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Image with Parallax */}
      <ParallaxImage
        src="https://static.wixstatic.com/media/503ea4_ed9a38760ae04aab86b47e82525fdcac~mv2.jpg/v1/fill/w_918,h_585,al_c,q_85,usm_0.66_1.00_0.01,enc_auto/503ea4_ed9a38760ae04aab86b47e82525fdcac~mv2.jpg"
        alt={t('auth.hero.imageAlt')}
        title={t('auth.forgotPassword.heroTitle')}
        subtitle={t('auth.forgotPassword.heroSubtitle')}
      />
    </div>
  );
}
