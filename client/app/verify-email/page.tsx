'use client';

import { useEffect, useState, useRef, useCallback, useMemo, memo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  HiCheckCircle,
  HiXCircle,
  HiExclamationTriangle,
} from 'react-icons/hi2';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import Link from 'next/link';
import { useBackendMessageTranslation } from '../hooks/useBackendMessageTranslation';
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
  const { t } = useLanguage();
  const { user, isLoading, updateUser } = useAuth();

  // Memoize context values to prevent unnecessary rerenders
  const contextValues = useMemo(() => ({
    user: user ? { id: user.id, email: user.email, roles: user.roles } : null,
    isLoading,
    searchParams: Object.fromEntries(searchParams.entries())
  }), [user, isLoading, searchParams]);

  // Log context values changes only when they actually change
  const prevContextValues = useRef(contextValues);
  useEffect(() => {
    if (JSON.stringify(prevContextValues.current) !== JSON.stringify(contextValues)) {
      prevContextValues.current = contextValues;
    }
  }, [contextValues]);

  // Use the backend message translation hook
  const {
    error: verificationError,
    success: verificationSuccess,
    errorKey: verificationErrorKey,
    successKey: verificationSuccessKey,
    setBackendError: setVerificationBackendError,
    setBackendSuccess: setVerificationBackendSuccess,
    setErrorKey: setVerificationErrorKey,
    setSuccessKey: setVerificationSuccessKey,
  } = useBackendMessageTranslation();

  const [verificationState, setVerificationState] = useState<VerificationState>(
    {
      status: 'verifying',
    }
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

  // Update initial message when language context is ready - only run once
  useEffect(() => {
    setVerificationSuccessKey('verifyEmail.verifyingMessage');
  }, []); // Remove setVerificationSuccessKey from dependencies to prevent multiple executions

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
      setVerificationSuccessKey('verifyEmail.successMessage');

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
        setVerificationErrorKey('verifyEmail.invalidLinkMessage');
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

          // Set success state
          if (successData.message) {
            setVerificationBackendSuccess(successData.message);
          } else {
            setVerificationSuccessKey('verifyEmail.successMessage');
          }
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
          const errorData = await response.json();

          // Map server error message to translation key
          if (errorData.message) {
            setVerificationBackendError(errorData.message);
          } else {
            setVerificationErrorKey('verifyEmail.errorMessage');
          }
          setVerificationState({
            status: 'error',
          });
        }
      } catch (error) {
        setVerificationState({
          status: 'error',
        });
        setVerificationErrorKey('verifyEmail.errorMessage');
      }
    };

    verifyEmail();

  }, [
    // Minimal dependencies - only include what actually triggers verification
    token, // Only run when token changes
    user, // Only run when user changes
    isLoading, // Only run when loading state changes
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
  const LoadingComponent = useMemo(() => (
    <div className="flex items-center justify-center px-4 pt-10">
      <div className="max-w-md w-full text-center">
        <div className="flex justify-center mb-6">
          {HiExclamationTriangle({
            className: 'w-16 h-16 text-yellow-500 animate-pulse',
          })}
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          {t('verifyEmail.verifying')}
        </h1>
        <p className="text-gray-600 mb-8">
          {t('verifyEmail.verifyingMessage')}
        </p>
      </div>
    </div>
  ), [t]);

  // Show loading while AuthContext is loading
  if (isLoading) {
    return LoadingComponent;
  }

  return (
    <div className="flex items-center justify-center px-4 pt-10">
      <div className="max-w-md w-full text-center">
        <div className="flex justify-center mb-6">{getStatusIcon()}</div>

        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          {verificationState.status === 'verifying' &&
            t('verifyEmail.verifying')}
          {verificationState.status === 'success' && t('verifyEmail.success')}
          {verificationState.status === 'error' && t('verifyEmail.failed')}
          {verificationState.status === 'invalid' &&
            t('verifyEmail.invalidLink')}
        </h1>

        <p className="text-gray-600 mb-8">
          {verificationSuccess ||
            (verificationSuccessKey ? t(verificationSuccessKey) : '')}
          {verificationError ||
            (verificationErrorKey ? t(verificationErrorKey) : '')}
        </p>

        {verificationState.status === 'success' && (
          <p className="text-sm text-gray-500">
            {t('verifyEmail.redirecting')}
          </p>
        )}

        {verificationState.status === 'error' && (
          <button
            type='button'
            onClick={() => {
              window.location.reload();
            }}
            className="bg-black text-white font-semibold py-3 px-6 sm:px-8 rounded-lg hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 text-sm sm:text-base"
          >
            {t('verifyEmail.tryAgain')}
          </button>
        )}

        {verificationState.status === 'invalid' && (
          <Link
            href="/auth"
            className="inline-block bg-black text-white font-semibold py-3 px-6 sm:px-8 rounded-lg hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 text-sm sm:text-base"
          >
            {t('verifyEmail.goToLogin')}
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
