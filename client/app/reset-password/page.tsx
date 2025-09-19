'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useSocket } from '../hooks/useSocket';
import { ParallaxImage } from '../components/ParallaxImage';
import { LoadingPage } from '../components/LoadingPage';
import { useBackendMessageTranslation } from '../hooks/useBackendMessageTranslation';
import { buildApiUrl, API_CONFIG } from '../config/api';

interface ValidationErrors {
  password?: string;
  confirmPassword?: string;
}

export default function ResetPasswordPage() {
  const { t, locale } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { connect, joinPasswordResetRoom, leavePasswordResetRoom } =
    useSocket();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [token, setToken] = useState('');
  const [userEmail, setUserEmail] = useState('');

  // Use the backend message translation hook
  const {
    error: resetError,
    success: resetSuccess,
    errorKey: resetErrorKey,
    successKey: resetSuccessKey,
    setBackendError: setResetBackendError,
    setBackendSuccess: setResetBackendSuccess,
    setErrorKey: setResetErrorKey,
    setSuccessKey: setResetSuccessKey,
    clearMessages: clearResetMessages,
  } = useBackendMessageTranslation();
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>(
    {}
  );
  const [touched, setTouched] = useState({
    password: false,
    confirmPassword: false,
  });

  useEffect(() => {
    // Get token from URL query parameter
    const tokenFromUrl = searchParams.get('token');
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
    } else {
      // If no token, redirect to forgot password page
      router.push('/forgot-password');
    }
  }, [searchParams, router]);

  // Join password reset room when component mounts
  useEffect(() => {
    const joinRoom = async () => {
      // Connect to socket anonymously first
      try {
        await connect();
      } catch (error) {
        // Failed to connect to socket
      }
    };

    joinRoom();

    // Cleanup function to leave room when component unmounts
    return () => {
      if (userEmail) {
        leavePasswordResetRoom(userEmail);
      }
    };
  }, [connect, leavePasswordResetRoom, userEmail]);

  // Real-time validation
  useEffect(() => {
    const errors: ValidationErrors = {};

    // Password validation
    if (touched.password) {
      if (!password.trim()) {
        errors.password = t('auth.validation.passwordRequired');
      } else if (password.length < 8) {
        errors.password = t('auth.validation.passwordTooShort');
      }
    }

    // Confirm password validation
    if (touched.confirmPassword) {
      if (!confirmPassword.trim()) {
        errors.confirmPassword = t('auth.validation.confirmPasswordRequired');
      } else if (password && confirmPassword && password !== confirmPassword) {
        errors.confirmPassword = t('auth.validation.passwordsDoNotMatch');
      }
    }

    setValidationErrors(errors);
  }, [password, confirmPassword, touched, t]);

  const handleBlur = (field: 'password' | 'confirmPassword') => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};

    // Password validation
    if (!password.trim()) {
      errors.password = t('auth.validation.passwordRequired');
    } else if (password.length < 8) {
      errors.password = t('auth.validation.passwordTooShort');
    }

    // Confirm password validation
    if (!confirmPassword.trim()) {
      errors.confirmPassword = t('auth.validation.confirmPasswordRequired');
    } else if (password !== confirmPassword) {
      errors.confirmPassword = t('auth.validation.passwordsDoNotMatch');
    }

    // Token validation
    if (!token) {
      setResetErrorKey('auth.messages.invalidPasswordResetToken');
      return false;
    }

    setValidationErrors(errors);
    setTouched({ password: true, confirmPassword: true });

    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    clearResetMessages();

    try {
      const response = await fetch(
        buildApiUrl(API_CONFIG.ENDPOINTS.AUTH.RESET_PASSWORD),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token,
            password,
            confirmPassword,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        if (data.message) {
          setResetBackendSuccess(data.message);
        } else {
          setResetSuccessKey('auth.messages.passwordResetSuccess');
        }

        // Join password reset room using email from response BEFORE logout emission
        if (data.email) {
          setUserEmail(data.email);
          try {
            await joinPasswordResetRoom(data.email);

            // Small delay to ensure room joining is complete before logout emission
            await new Promise((resolve) => setTimeout(resolve, 100));
          } catch (error) {
            // Failed to join password reset room
          }
        }

        // Clear form
        setPassword('');
        setConfirmPassword('');
        setValidationErrors({});
        setTouched({ password: false, confirmPassword: false });
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push('/auth');
        }, 3000);
      } else {
        if (data.message) {
          setResetBackendError(data.message);
        } else {
          setResetErrorKey('auth.messages.generalError');
        }
      }
    } catch (error) {
      setResetErrorKey('auth.messages.generalError');
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = () => {
    return (
      password.trim().length >= 8 &&
      confirmPassword.trim().length > 0 &&
      password === confirmPassword &&
      Object.keys(validationErrors).length === 0
    );
  };

  if (!token) {
    return <LoadingPage />;
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
              {t('auth.form.resetPassword')}
            </h1>
            <p className="text-white/70 text-xs sm:text-sm md:text-base">
              {t('resetPassword.subtitle')}
            </p>
          </div>

          {/* Security Notice */}
          <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4">
            <div className="flex items-start gap-2 sm:gap-3">
              <svg
                className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400 mt-0.5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <p className="text-purple-400 text-xs sm:text-sm font-medium mb-1">
                  {t('auth.form.securityNotice')}
                </p>
                <p className="text-purple-300/80 text-xs sm:text-sm">
                  {t('auth.form.securityNoticeMessage')}
                </p>
              </div>
            </div>
          </div>

          {/* Message Display */}
          {(resetSuccess || resetSuccessKey || resetError || resetErrorKey) && (
            <div
              className={`border rounded-lg p-2 sm:p-3 mb-3 sm:mb-4 ${
                resetSuccess || resetSuccessKey
                  ? 'bg-green-500/10 border-green-500/20'
                  : 'bg-red-500/10 border-red-500/20'
              }`}
            >
              <p
                className={`text-xs sm:text-sm ${
                  resetSuccess || resetSuccessKey
                    ? 'text-green-400'
                    : 'text-red-400'
                }`}
              >
                {resetSuccess || (resetSuccessKey ? t(resetSuccessKey) : '')}
                {resetError || (resetErrorKey ? t(resetErrorKey) : '')}
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
                htmlFor="password"
                className="block text-xs sm:text-sm font-medium text-white/80 mb-1 sm:mb-2"
              >
                {t('auth.form.password')}
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => handleBlur('password')}
                className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/10 border rounded-lg text-white placeholder-white/50 focus:bg-white/15 transition-all duration-300 autofill:bg-white/10 autofill:text-white text-sm sm:text-base ${
                  validationErrors.password
                    ? 'border-red-400 focus:border-red-400'
                    : 'border-white/20 focus:border-purple-500'
                }`}
                placeholder={t('auth.form.passwordPlaceholder')}
                aria-describedby={
                  validationErrors.password ? 'password-error' : 'password-help'
                }
              />
              {validationErrors.password ? (
                <p className="text-red-400 text-xs mt-1" id="password-error">
                  {validationErrors.password}
                </p>
              ) : (
                <p className="text-white/50 text-xs mt-1" id="password-help">
                  {t('auth.form.passwordRequirement')}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-xs sm:text-sm font-medium text-white/80 mb-1 sm:mb-2"
              >
                {t('auth.form.confirmPassword')}
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onBlur={() => handleBlur('confirmPassword')}
                className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/10 border rounded-lg text-white placeholder-white/50 focus:bg-white/15 transition-all duration-300 autofill:bg-white/10 autofill:text-white text-sm sm:text-base ${
                  validationErrors.confirmPassword
                    ? 'border-red-400 focus:border-red-400'
                    : 'border-white/20 focus:border-purple-500'
                }`}
                placeholder={t('auth.form.confirmPasswordPlaceholder')}
                aria-describedby={
                  validationErrors.confirmPassword
                    ? 'confirmPassword-error'
                    : undefined
                }
              />
              {validationErrors.confirmPassword && (
                <p
                  className="text-red-400 text-xs mt-1"
                  id="confirmPassword-error"
                >
                  {validationErrors.confirmPassword}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || !isFormValid()}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 disabled:cursor-not-allowed disabled:opacity-60 text-white font-semibold py-2.5 sm:py-3 md:py-4 px-4 sm:px-6 rounded-lg hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 text-sm sm:text-base min-h-[44px] sm:min-h-[48px] flex items-center justify-center"
            >
              {isLoading ? (
                <>{t('resetPassword.resettingPassword')}</>
              ) : (
                t('resetPassword.resetPasswordButton')
              )}
            </button>
          </form>

          {/* Back to Login */}
          <div className="text-center mt-3 sm:mt-4 md:mb-6">
            <p className="text-white/70 text-xs sm:text-sm">
              {t('resetPassword.rememberPassword')}
              <Link
                href="/auth"
                className="ml-1 sm:ml-2 text-purple-400 hover:text-purple-300 font-medium transition-colors duration-200 hover:underline"
              >
                {t('resetPassword.backToLogin')}
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Image with Parallax */}
      <ParallaxImage
        src="https://static.wixstatic.com/media/503ea4_ed9a38760ae04aab86b47e82525fdcac~mv2.jpg/v1/fill/w_918,h_585,al_c,q_85,usm_0.66_1.00_0.01,enc_auto/503ea4_ed9a38760ae04aab86b47e82525fdcac~mv2.jpg"
        alt={t('auth.hero.imageAlt')}
        title={t('resetPassword.imageTitle')}
        subtitle={t('resetPassword.imageSubtitle')}
      />
    </div>
  );
}
