'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { buildApiUrl, API_CONFIG } from '../config/api';
import Image from 'next/image';
import MessageDisplay from '../components/MessageDisplay';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [forgotSuccessMessage, setForgotSuccessMessage] = useState('');
  const [forgotErrorMessage, setForgotErrorMessage] = useState('');
  const [validationError, setValidationError] = useState<string | undefined>(undefined);

  // Email validation function (same as in AuthForm)
  const validateEmail = (email: string): string | undefined => {
    if (!email || email.trim().length === 0) {
      return 'Email is required';
    }
    if (email.length > 255) {
      return 'Email must be 255 characters or less';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Invalid email format';
    }
    return undefined;
  };

  // Handle email input change
  const handleEmailChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setEmail(e.target.value);
      setForgotErrorMessage(''); // Clear error message when typing
      // Clear validation error when typing
      if (validationError) {
        setValidationError(undefined);
      }
    },
    [validationError]
  );

  // Handle validation on blur
  const handleEmailBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      const error = validateEmail(e.target.value);
      setValidationError(error);
    },
    []
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      // Validate email before submission
      const emailError = validateEmail(email);
      if (emailError) {
        setValidationError(emailError);
        return;
      }

      setIsLoading(true);

      const apiUrl = buildApiUrl(API_CONFIG.ENDPOINTS.AUTH.FORGOT_PASSWORD);

      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email }),
        });

        const data = await response.json();

        if (response.ok) {
          setForgotSuccessMessage(data.message);
          setEmail('');
        } else {
          setForgotErrorMessage(data.message);
        }
      } catch (error) {
        setForgotErrorMessage(
          error instanceof Error
            ? error.message
            : 'An error occurred while sending the reset link'
        );
      } finally {
        setIsLoading(false);
      }
    },
    [email]
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
              Enter your email below to receive a password reset link
            </p>
          </div>

          {/* Messages */}
          <MessageDisplay
            successMessage={forgotSuccessMessage}
            errorMessage={forgotErrorMessage}
            className="mb-6"
          />

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
                Email Address
              </label>
              <input
                type="text"
                id="email"
                name="email"
                value={email}
                onChange={handleEmailChange}
                onBlur={handleEmailBlur}
                className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:border-purple-500 focus:bg-white/15 transition-all duration-300 text-sm sm:text-base ${
                  validationError
                    ? 'border-red-500 focus:border-red-500'
                    : ''
                }`}
                placeholder="Enter your email"
              />
              {validationError && (
                <p className="mt-1 text-sm text-red-400">
                  {validationError}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 disabled:cursor-not-allowed disabled:opacity-60 text-white font-semibold py-2.5 sm:py-3 md:py-4 px-4 sm:px-6 rounded-lg hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 text-sm sm:text-base min-h-[44px] sm:min-h-[48px] flex items-center justify-center"
            >
              {isLoading ? <>Sending Reset Link...</> : 'Send Reset Link'}
            </button>
          </form>

          {/* Back to Login */}
          <div className="text-center mt-3 sm:mt-4 md:mt-6">
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
              Enter your email below to receive a password reset link
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
