'use client';

import { useEffect, useState, useRef, useCallback, useMemo, memo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  HiCheckCircle,
  HiXCircle,
  HiExclamationTriangle,
} from 'react-icons/hi2';
import { useAuth } from '../contexts/AuthContext';
import Link from 'next/link';
import { buildApiUrl, API_CONFIG } from '../config/api';

// Performance monitoring utilities
let renderCount = 0;

interface VerificationState {
  status: 'verifying' | 'success' | 'error' | 'invalid';
  message?: string;
}

const VerifyEmailPage = memo(function VerifyEmailPage() {
  // Component rerender tracking
  renderCount++;

  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isLoading, updateUser } = useAuth();

  // Memoize context values to prevent unnecessary rerenders
  const contextValues = useMemo(
    () => ({
      user: user ? { id: user.id, email: user.email, roles: user.roles } : null,
      isLoading,
      searchParams: Object.fromEntries(searchParams.entries()),
    }),
    [user, isLoading, searchParams]
  );

  // Log context values changes only when they actually change
  const prevContextValues = useRef(contextValues);
  useEffect(() => {
    if (
      JSON.stringify(prevContextValues.current) !==
      JSON.stringify(contextValues)
    ) {
      prevContextValues.current = contextValues;
    }
  }, [contextValues]);

  const [verificationState, setVerificationState] = useState<VerificationState>(
    {
      status: 'verifying',
    }
  );

  const [verificationMessage, setVerificationMessage] = useState<string>(
    'Verifying your email...'
  );

  // State change tracking
  const prevVerificationState = useRef(verificationState);
  useEffect(() => {
    if (prevVerificationState.current !== verificationState) {
      prevVerificationState.current = verificationState;
    }
  }, [verificationState]);

  // Use useRef to prevent multiple API calls
  const hasVerifiedRef = useRef(false);
  const hasEffectRunRef = useRef(false);

  // Memoize the token to prevent unnecessary effect runs
  const token = useMemo(() => {
    const tokenValue = searchParams.get('token');
    return tokenValue;
  }, [searchParams]);

  useEffect(() => {
    // Prevent multiple effect executions
    if (hasEffectRunRef.current) {
      return;
    }

    // Prevent multiple verifications
    if (hasVerifiedRef.current) {
      return;
    }

    // Mark effect as run
    hasEffectRunRef.current = true;

    // If user is already logged in via AuthContext, show success and redirect
    if (!isLoading && user) {
      hasVerifiedRef.current = true;

      setVerificationState({
        status: 'success',
      });
      setVerificationMessage(
        'Email verified successfully! You can now log in to your account'
      );

      // Redirect based on user role
      setTimeout(() => {
        if (user.roles && user.roles.includes('ADMIN')) {
          router.push('/admin');
        } else {
          router.push('/');
        }
      }, 2000);

      return;
    }

    const verifyEmail = async () => {
      if (!token) {
        setVerificationState({
          status: 'invalid',
        });
        setVerificationMessage(
          'Invalid verification link. Please check your email and try again'
        );
        return;
      }

      try {
        // Mark as attempting verification to prevent multiple calls
        hasVerifiedRef.current = true;

        const apiUrl = buildApiUrl(API_CONFIG.ENDPOINTS.AUTH.VERIFY_EMAIL);

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ token }),
        });

        if (response.ok) {
          const successData = await response.json();

          // Set success state with backend message or fallback
          setVerificationMessage(
            successData.message || 'Email verified successfully!'
          );

          setVerificationState({
            status: 'success',
          });

          // Since server sets HTTP-only cookies, we need to check if user is logged in
          // by making a request to /users/me endpoint

          try {
            const userApiUrl = buildApiUrl(API_CONFIG.ENDPOINTS.USERS.ME);

            const userResponse = await fetch(userApiUrl, {
              method: 'GET',
              credentials: 'include',
            });

            if (userResponse.ok) {
              const userData = await userResponse.json();

              // Update the user state in AuthContext to reflect the login
              updateUser(userData.user);

              // User is logged in, redirect based on role
              setTimeout(() => {
                if (
                  userData.user.roles &&
                  userData.user.roles.includes('ADMIN')
                ) {
                  router.push('/admin');
                } else {
                  router.push('/');
                }
              }, 2000);
            } else {
              // User not logged in - redirect to login page after 3 seconds
              setTimeout(() => {
                router.push('/auth');
              }, 3000);
            }
          } catch (error) {
            // Error checking login status - redirect to login page after 3 seconds
            setTimeout(() => {
              router.push('/auth');
            }, 3000);
          }
        } else {
          let errorMessage =
            'An error occurred during verification. Please try again';

          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
          } catch (parseError) {
            // If response is not JSON, use status-based message
            if (response.status === 400) {
              errorMessage = 'Invalid or expired verification token';
            } else if (response.status === 404) {
              errorMessage = 'Verification token not found';
            } else if (response.status >= 500) {
              errorMessage = 'Server error. Please try again later';
            }
          }

          setVerificationMessage(errorMessage);
          setVerificationState({
            status: 'error',
          });
        }
      } catch (error) {
        setVerificationState({
          status: 'error',
        });
        setVerificationMessage(
          error instanceof Error
            ? error.message
            : 'An error occurred during verification. Please try again'
        );
      }
    };

    verifyEmail();
  }, [
    // Minimal dependencies - only include what actually triggers verification
    token, // Only run when token changes
    user, // Only run when user changes
    isLoading, // Only run when loading state changes
    router, // Include router dependency
    updateUser, // Include updateUser dependency
  ]);

  const getStatusIcon = useCallback(() => {
    switch (verificationState.status) {
      case 'verifying':
        return (
          <>
            {HiExclamationTriangle({
              className: 'w-16 h-16 text-yellow-500 animate-pulse',
            })}
          </>
        );
      case 'success':
        return <>{HiCheckCircle({ className: 'w-16 h-16 text-green-500' })}</>;
      case 'error':
      case 'invalid':
        return <>{HiXCircle({ className: 'w-16 h-16 text-red-500' })}</>;
      default:
        return null;
    }
  }, [verificationState.status]);

  // Memoized loading component to prevent unnecessary rerenders
  const LoadingComponent = useMemo(
    () => (
      <div className="flex items-center justify-center px-4 pt-10">
        <div className="max-w-md w-full text-center">
          <div className="flex justify-center mb-6">
            {HiExclamationTriangle({
              className: 'w-16 h-16 text-yellow-500 animate-pulse',
            })}
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Verifying Email...
          </h1>
          <p className="text-gray-600 mb-8">Verifying your email...</p>
        </div>
      </div>
    ),
    []
  );

  // Show loading while AuthContext is loading
  if (isLoading) {
    return LoadingComponent;
  }

  return (
    <div className="flex items-center justify-center px-4 pt-10">
      <div className="max-w-md w-full text-center">
        <div className="flex justify-center mb-6">{getStatusIcon()}</div>

        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          {verificationState.status === 'verifying' && 'Verifying Email...'}
          {verificationState.status === 'success' && 'Verification Successful!'}
          {verificationState.status === 'error' && 'Verification Failed'}
          {verificationState.status === 'invalid' && 'Invalid Link'}
        </h1>

        <p className="text-gray-600 mb-8">{verificationMessage}</p>

        {verificationState.status === 'success' && (
          <p className="text-sm text-gray-500">
            Redirecting you automatically...
          </p>
        )}

        {verificationState.status === 'error' && (
          <button
            type="button"
            onClick={() => {
              window.location.reload();
            }}
            className="bg-black text-white font-semibold py-3 px-6 sm:px-8 rounded-lg hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 text-sm sm:text-base"
          >
            Try Again
          </button>
        )}

        {verificationState.status === 'invalid' && (
          <Link
            href="/auth"
            className="inline-block bg-black text-white font-semibold py-3 px-6 sm:px-8 rounded-lg hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 text-sm sm:text-base"
          >
            Go to Login
          </Link>
        )}

        {verificationState.status === 'verifying' && (
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-600 border-t-transparent mx-auto"></div>
        )}
      </div>
    </div>
  );
});

export default VerifyEmailPage;
