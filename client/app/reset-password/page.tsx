'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

interface ValidationErrors {
  password?: string;
  confirmPassword?: string;
}

export default function ResetPasswordPage() {
  const { t, locale } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
  const [token, setToken] = useState('');
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
      setMessageType('error');
      setMessage(t('auth.messages.invalidPasswordResetToken'));
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
    setMessage('');
    setMessageType('');

    try {
      const response = await fetch(
        'http://localhost:3000/v1/auth/reset-password',
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
        setMessageType('success');
        setMessage(t('auth.messages.passwordResetSuccess'));
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
        setMessageType('error');
        setMessage(data.message || t('auth.messages.generalError'));
      }
    } catch (error) {
      setMessageType('error');
      setMessage(t('auth.messages.generalError'));
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
              {t('auth.form.resetPassword')}
            </h1>
            <p className="text-white/70 text-xs sm:text-sm md:text-base">
              Enter your new password below
            </p>
          </div>

          {/* Message Display */}
          {message && (
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
                {message}
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
                  Resetting Password...
                </>
              ) : (
                'Reset Password'
              )}
            </button>
          </form>

          {/* Back to Login */}
          <div className="text-center mt-3 sm:mt-4 md:mb-6">
            <p className="text-white/70 text-xs sm:text-sm">
              Remember your password?
              <Link
                href="/auth"
                className="ml-1 sm:ml-2 text-purple-400 hover:text-purple-300 font-medium transition-colors duration-200 hover:underline"
              >
                Back to login
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
              Reset Your Password
            </h1>
            <p className="text-xs sm:text-sm md:text-base lg:text-lg text-white/80 max-w-[200px] sm:max-w-xs md:max-w-sm lg:max-w-md">
              Choose a strong, secure password for your account
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
