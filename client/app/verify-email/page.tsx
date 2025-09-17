'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
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

interface VerificationState {
  status: 'verifying' | 'success' | 'error' | 'invalid';
  message?: string;
}

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t } = useLanguage();
  const { loginWithTokens, user, isLoading, updateUser } = useAuth();

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

  // Use useRef to prevent multiple API calls
  const hasVerifiedRef = useRef(false);

  // Update initial message when language context is ready
  useEffect(() => {
    setVerificationSuccessKey('verifyEmail.verifyingMessage');
  }, [setVerificationSuccessKey]);

  useEffect(() => {
    console.log('🔍 Verify-email page loaded');
    console.log('🔍 Search params:', searchParams.toString());
    console.log('🔍 Token from URL:', searchParams.get('token'));
    
    // Prevent multiple verifications
    if (hasVerifiedRef.current) {
      console.log('🔍 Verification already attempted, skipping');
      return;
    }

    // If user is already logged in via AuthContext, show success and redirect
    if (!isLoading && user) {
      hasVerifiedRef.current = true;
      console.log('✅ User already logged in, redirecting...');
      
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
      console.log('🔍 verifyEmail function called');
      const token = searchParams.get('token');
      console.log('🔍 Token extracted from URL:', token ? 'PRESENT' : 'MISSING');

      if (!token) {
        console.log('❌ No token found in URL');
        setVerificationState({
          status: 'invalid',
        });
        setVerificationErrorKey('verifyEmail.invalidLinkMessage');
        return;
      }

      try {
        // Mark as attempting verification to prevent multiple calls
        hasVerifiedRef.current = true;

        console.log('📧 Calling verify-email API...');
        const response = await fetch(
          buildApiUrl(API_CONFIG.ENDPOINTS.AUTH.VERIFY_EMAIL),
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ token }),
          }
        );

        if (response.ok) {
          const successData = await response.json();
          console.log('📧 Verify-email API response:', successData);

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
          console.log('🔍 Checking if user is logged in via HTTP-only cookies...');
          
          try {
            const userResponse = await fetch(
              buildApiUrl(API_CONFIG.ENDPOINTS.USERS.ME),
              {
                method: 'GET',
                credentials: 'include',
              }
            );

            if (userResponse.ok) {
              const userData = await userResponse.json();
              console.log('✅ User is logged in via HTTP-only cookies:', userData);
              
              // Update the user state in AuthContext to reflect the login
              console.log('🔄 Updating user state in AuthContext...');
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
              console.log('❌ User not logged in, redirecting to login');
              // User not logged in - redirect to login page after 3 seconds
              setTimeout(() => {
                router.push('/auth');
              }, 3000);
            }
          } catch (error) {
            console.error('❌ Error checking user login status:', error);
            // Error checking login status - redirect to login page after 3 seconds
            setTimeout(() => {
              router.push('/auth');
            }, 3000);
          }
        } else {
          const errorData = await response.json();
          console.error('❌ Verify-email API error:', errorData);

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
        console.error('❌ Email verification error:', error);
        setVerificationState({
          status: 'error',
        });
        setVerificationErrorKey('verifyEmail.errorMessage');
      }
    };

    verifyEmail();
  }, [
    loginWithTokens,
    router,
    searchParams,
    t,
    user,
    isLoading,
    setVerificationBackendError,
    setVerificationBackendSuccess,
    setVerificationErrorKey,
    setVerificationSuccessKey,
  ]);

  const getStatusIcon = () => {
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
  };

  // Show loading while AuthContext is loading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center px-4 pt-10">
        <div className="max-w-md w-full text-center">
          <div className="flex justify-center mb-6">
            {HiExclamationTriangle({
              className: 'w-16 h-16 text-yellow-500 animate-pulse',
            })}
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            {t('verifyEmail.verifying')}
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-8">
            {t('verifyEmail.verifyingMessage')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center px-4 pt-10">
      <div className="max-w-md w-full text-center">
        <div className="flex justify-center mb-6">{getStatusIcon()}</div>

        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          {verificationState.status === 'verifying' &&
            t('verifyEmail.verifying')}
          {verificationState.status === 'success' && t('verifyEmail.success')}
          {verificationState.status === 'error' && t('verifyEmail.failed')}
          {verificationState.status === 'invalid' &&
            t('verifyEmail.invalidLink')}
        </h1>

        <p className="text-gray-600 dark:text-gray-300 mb-8">
          {verificationSuccess ||
            (verificationSuccessKey ? t(verificationSuccessKey) : '')}
          {verificationError ||
            (verificationErrorKey ? t(verificationErrorKey) : '')}
        </p>

        {verificationState.status === 'success' && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('verifyEmail.redirecting')}
          </p>
        )}

        {verificationState.status === 'error' && (
          <button
            onClick={() => window.location.reload()}
            className="bg-black dark:bg-white text-white dark:text-black font-semibold py-3 px-6 sm:px-8 rounded-lg hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 text-sm sm:text-base"
          >
            {t('verifyEmail.tryAgain')}
          </button>
        )}

        {verificationState.status === 'invalid' && (
          <Link
            href="/auth"
            className="inline-block bg-black dark:bg-white text-white dark:text-black font-semibold py-3 px-6 sm:px-8 rounded-lg hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 text-sm sm:text-base"
          >
            {t('verifyEmail.goToLogin')}
          </Link>
        )}

        {verificationState.status === 'verifying' && (
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-600 border-t-transparent mx-auto"></div>
        )}

        {/* Debug: Test verification button for development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Debug: Test verification with a sample token
            </p>
            <button
              onClick={() => {
                const testToken = 'test-token-123';
                console.log('🧪 Testing verification with token:', testToken);
                // Manually trigger verification
                window.location.href = `/verify-email?token=${testToken}`;
              }}
              className="bg-blue-500 text-white px-4 py-2 rounded text-sm mr-2"
            >
              Test with Sample Token
            </button>
            <button
              onClick={() => {
                console.log('🧪 Testing verification with real token from URL');
                const currentToken = searchParams.get('token');
                if (currentToken) {
                  console.log('🧪 Current token:', currentToken);
                  // Reload the page to trigger verification
                  window.location.reload();
                } else {
                  console.log('❌ No token in current URL');
                }
              }}
              className="bg-green-500 text-white px-4 py-2 rounded text-sm"
            >
              Test with Current Token
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
