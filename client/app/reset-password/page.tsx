'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { buildApiUrl, API_CONFIG } from '../config/api';
import MessageDisplay from '../components/MessageDisplay';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [token, setToken] = useState('');

  const [resetSuccessMessage, setResetSuccessMessage] = useState('');
  const [resetErrorMessage, setResetErrorMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

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

  const validatePassword = (password: string): string | undefined => {
    if (!password || password.trim().length === 0) {
      return 'Password is required';
    }
    if (password.length < 8) {
      return 'Password must be at least 8 characters';
    }
    if (password.length > 128) {
      return 'Password must be 128 characters or less';
    }
    return undefined;
  };

  const validateConfirmPassword = (confirmPassword: string, password: string): string | undefined => {
    if (!confirmPassword || confirmPassword.trim().length === 0) {
      return 'Confirm password is required';
    }
    if (confirmPassword !== password) {
      return 'Passwords do not match';
    }
    return undefined;
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    
    // Clear password error when user starts typing
    if (passwordError) {
      setPasswordError('');
    }
    
    // Re-validate confirm password if it has a value
    if (confirmPassword) {
      const confirmError = validateConfirmPassword(confirmPassword, newPassword);
      setConfirmPasswordError(confirmError || '');
    }
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newConfirmPassword = e.target.value;
    setConfirmPassword(newConfirmPassword);
    
    // Clear confirm password error when user starts typing
    if (confirmPasswordError) {
      setConfirmPasswordError('');
    }
    
    // Validate against current password
    const confirmError = validateConfirmPassword(newConfirmPassword, password);
    setConfirmPasswordError(confirmError || '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    setPasswordError('');
    setConfirmPasswordError('');
    setResetErrorMessage('');

    // Validate password
    const passwordValidationError = validatePassword(password);
    if (passwordValidationError) {
      setPasswordError(passwordValidationError);
      return;
    }

    // Validate confirm password
    const confirmPasswordValidationError = validateConfirmPassword(confirmPassword, password);
    if (confirmPasswordValidationError) {
      setConfirmPasswordError(confirmPasswordValidationError);
      return;
    }

    setIsLoading(true);

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
        setResetSuccessMessage(data.message);

        // Clear form
        setPassword('');
        setConfirmPassword('');
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push('/auth');
        }, 3000);
      } else {
        setResetErrorMessage(
          data.message || 'Failed to reset password. Please try again.'
        );
      }
    } catch (error) {
      setResetErrorMessage(
        error instanceof Error
          ? error.message
          : 'An error occurred while resetting your password'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Memoized input classes to prevent recreation on every render
  const inputClasses = useMemo(
    () =>
      'w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:bg-white/15 focus:border-purple-500 transition-all duration-300 text-sm sm:text-base',
    []
  );

  const submitButtonClasses = useMemo(
    () =>
      'w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 disabled:cursor-not-allowed disabled:opacity-60 text-white font-semibold py-2.5 sm:py-3 md:py-4 px-4 sm:px-6 rounded-lg hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 text-sm sm:text-base min-h-[44px] sm:min-h-[48px] flex items-center justify-center',
    []
  );

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-zinc-900 ltr">
      {/* Left side - Form */}
      <div className="flex-1 lg:basis-1/2 flex items-center justify-center px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 py-3 sm:py-4 md:py-6 lg:py-8 xl:py-10">
        <div className="w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg">
          {/* Header */}
          <div className="auth-screen text-center mb-4 sm:mb-6 md:mb-8">
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-white mb-2">
              Reset Your Password
            </h1>
            <p className="text-white/70 text-xs sm:text-sm md:text-base">
              Enter your new password below
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
                  Security Notice
                </p>
                <p className="text-purple-300/80 text-xs sm:text-sm">
                  For your security, you will be automatically logged out from
                  all devices and browsers after resetting your password
                </p>
              </div>
            </div>
          </div>

          {/* Messages */}
          <MessageDisplay
            successMessage={resetSuccessMessage}
            errorMessage={resetErrorMessage}
            className="mb-6"
          />

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
                Password *
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={password}
                onChange={handlePasswordChange}
                className={`${inputClasses} ${passwordError ? 'border-red-500 focus:border-red-500' : ''}`}
                placeholder="Enter your password"
              />
              {passwordError ? (
                <p className="text-red-400 text-xs mt-1">{passwordError}</p>
              ) : (
                <p className="text-white/50 text-xs mt-1">
                  Password must be at least 8 characters long
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-xs sm:text-sm font-medium text-white/80 mb-1 sm:mb-2"
              >
                Confirm Password *
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={confirmPassword}
                onChange={handleConfirmPasswordChange}
                className={`${inputClasses} ${confirmPasswordError ? 'border-red-500 focus:border-red-500' : ''}`}
                placeholder="Confirm your password"
              />
              {confirmPasswordError && (
                <p className="text-red-400 text-xs mt-1">{confirmPasswordError}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={submitButtonClasses}
            >
              {isLoading ? 'Resetting Password...' : 'Reset Password'}
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
                Back to Login
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Image */}
      <div className="flex-1 lg:basis-1/2 relative bg-zinc-900 overflow-hidden min-h-[300px] sm:min-h-[400px] md:min-h-[500px] lg:min-h-[600px]">
        <Image
          src="https://static.wixstatic.com/media/503ea4_ed9a38760ae04aab86b47e82525fdcac~mv2.jpg/v1/fill/w_918,h_585,al_c,q_85,usm_0.66_1.00_0.01,enc_auto/503ea4_ed9a38760ae04aab86b47e82525fdcac~mv2.jpg"
          alt="Reset Your Password"
          className="w-full h-full object-cover"
          width={1000}
          height={800}
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/80 to-pink-900/80 z-10"></div>
        <div className="absolute inset-0 z-20 flex items-center justify-center px-3 sm:px-4 md:px-6 lg:px-8">
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
