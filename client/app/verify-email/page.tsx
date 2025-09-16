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
import { useSocket } from '../hooks/useSocket';
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
  const { loginWithTokens, user, isLoading } = useAuth();
  const {
    connect,
    joinVerificationRoom,
    leaveVerificationRoom,
    on,
    off,
    onAuthBroadcast,
    offAuthBroadcast,
  } = useSocket();

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
    clearMessages: clearVerificationMessages,
  } = useBackendMessageTranslation();

  const [verificationState, setVerificationState] = useState<VerificationState>(
    {
      status: 'verifying',
    }
  );
  const [userId, setUserId] = useState<string | null>(null);

  // Use useRef to prevent multiple API calls
  const hasVerifiedRef = useRef(false);

  // Update initial message when language context is ready
  useEffect(() => {
    setVerificationSuccessKey('verifyEmail.verifyingMessage');
  }, [setVerificationSuccessKey]);

  useEffect(() => {
    // Prevent multiple verifications
    if (hasVerifiedRef.current) {
      return;
    }

    // If user is already logged in via AuthContext, show success and redirect
    if (!isLoading && user) {
      console.log('🔐 User already logged in via AuthContext:', user);
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

    // Check if user is already logged in - if so, show success and redirect
    const checkExistingAuth = async () => {
      try {
        const response = await fetch(
          buildApiUrl(API_CONFIG.ENDPOINTS.USERS.ME),
          {
            method: 'GET',
            credentials: 'include',
          }
        );

        if (response.ok) {
          const userData = await response.json();
          console.log('🔐 User already authenticated:', userData);

          // Mark as verified to prevent API calls
          hasVerifiedRef.current = true;

          setVerificationState({
            status: 'success',
          });
          setVerificationSuccessKey('verifyEmail.successMessage');

          // Redirect based on user role
          setTimeout(() => {
            if (userData.roles && userData.roles.includes('ADMIN')) {
              router.push('/admin');
            } else {
              router.push('/');
            }
          }, 2000);

          return true; // User is already authenticated
        }
      } catch (error) {
        console.log('🔐 No existing authentication found');
      }
      return false; // User is not authenticated
    };

    // Define the emailVerified callback function outside the async function
    let handleEmailVerified:
      | ((data: { success: boolean; user: any; message: string }) => void)
      | null = null;
    let successData: any = null;

    // Define the auth broadcast handler
    const handleAuthBroadcast = (data: { type: string; user?: any }) => {
      if (data.type === 'login' && data.user) {
        // Check if user was on auth page - redirect to home, otherwise stay
        const currentPath = window.location.pathname;

        if (currentPath === '/auth' || currentPath.startsWith('/auth/')) {
          setVerificationState({
            status: 'success',
          });
          setVerificationSuccessKey('verifyEmail.successMessage');
          // Redirect based on user role after 2 seconds
          setTimeout(() => {
            if (
              data.user &&
              data.user.roles &&
              data.user.roles.includes('ADMIN')
            ) {
              router.push('/admin');
            } else {
              router.push('/');
            }
          }, 2000);
        } else {
          // Update state to show success but don't redirect
          setVerificationState({
            status: 'success',
          });
          setVerificationSuccessKey('verifyEmail.successMessage');

          // Show a temporary success message and then hide it
          setTimeout(() => {
            setVerificationState({
              status: 'success',
              message: t('verifyEmail.successMessage'),
            });
          }, 3000);

          // Hide the success message after 5 seconds
          setTimeout(() => {
            setVerificationState({
              status: 'success',
              message: '',
            });
          }, 5000);
        }
      }
    };

    // Set up auth broadcast listener for cross-device sync
    onAuthBroadcast(handleAuthBroadcast);

    const verifyEmail = async () => {
      const token = searchParams.get('token');

      if (!token) {
        setVerificationState({
          status: 'invalid',
        });
        setVerificationErrorKey('verifyEmail.invalidLinkMessage');
        return;
      }

      // First check if user is already authenticated
      const isAlreadyAuthenticated = await checkExistingAuth();
      if (isAlreadyAuthenticated) {
        return; // Exit early if user is already logged in
      }

      // Define the emailVerified callback function
      handleEmailVerified = async (data: {
        success: boolean;
        user: any;
        message: string;
      }) => {
        try {
          if (data.success && data.user && successData?.tokens) {
            // Automatically log in the user
            const loginResult = await loginWithTokens(successData.tokens);
            if (loginResult.success) {
              setVerificationState({
                status: 'success',
                message: t('verifyEmail.successMessage'),
              });

              // Debug user data for role-based redirect
              console.log('🔐 Email verification - user data:', data.user);
              console.log(
                '🔐 Email verification - user roles:',
                data.user?.roles
              );
              console.log(
                '🔐 Email verification - is admin:',
                data.user?.roles?.includes('ADMIN')
              );

              // Redirect based on user role after 2 seconds
              setTimeout(() => {
                if (
                  data.user &&
                  data.user.roles &&
                  data.user.roles.includes('ADMIN')
                ) {
                  console.log(
                    '🔐 Email verification - redirecting admin to /admin'
                  );
                  router.push('/admin');
                } else {
                  console.log(
                    '🔐 Email verification - redirecting customer to /'
                  );
                  router.push('/');
                }
              }, 2000);
            } else {
              console.warn(
                '🔐 Email verification WebSocket callback - login failed:',
                loginResult
              );
              // Don't change the UI state here since verification already succeeded
            }
          }
        } catch (error) {
          console.error(
            '🔐 Email verification WebSocket callback error:',
            error
          );
          // Don't change the UI state here since verification already succeeded
        }
      };

      try {
        // Mark as attempting verification to prevent multiple calls
        hasVerifiedRef.current = true;

        // Try regular verification
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
          successData = await response.json();

          // If we have tokens, automatically log in the user
          if (successData.tokens && successData.user) {
            const currentUserId = successData.user.id;
            setUserId(currentUserId);

            // Map server success message to translation key
            if (successData.message) {
              setVerificationBackendSuccess(successData.message);
            } else {
              setVerificationSuccessKey('verifyEmail.successMessage');
            }
            setVerificationState({
              status: 'success',
            });

            // Try to log in the user immediately with the verification tokens
            try {
              const loginResult = await loginWithTokens(successData.tokens);

              if (loginResult.success) {
                // Connect to socket and join verification room AFTER successful login
                connect();
                joinVerificationRoom(currentUserId);

                // Listen for verification success event
                if (handleEmailVerified) {
                  on('emailVerified', handleEmailVerified);
                }

                // Debug user data for role-based redirect
                console.log(
                  '🔐 Email verification (tokens) - user data:',
                  successData.user
                );
                console.log(
                  '🔐 Email verification (tokens) - user roles:',
                  successData.user?.roles
                );
                console.log(
                  '🔐 Email verification (tokens) - is admin:',
                  successData.user?.roles?.includes('ADMIN')
                );

                // Redirect based on user role after successful login
                setTimeout(() => {
                  if (
                    successData.user &&
                    successData.user.roles &&
                    successData.user.roles.includes('ADMIN')
                  ) {
                    console.log(
                      '🔐 Email verification (tokens) - redirecting admin to /admin'
                    );
                    router.push('/admin');
                  } else {
                    console.log(
                      '🔐 Email verification (tokens) - redirecting customer to /'
                    );
                    router.push('/');
                  }
                }, 2000);
              } else {
                // Login failed but verification succeeded - still show success and redirect
                console.warn(
                  '🔐 Email verification succeeded but login failed:',
                  loginResult
                );

                // Connect to socket and join verification room even if login failed
                connect();
                joinVerificationRoom(currentUserId);

                // Listen for verification success event
                if (handleEmailVerified) {
                  on('emailVerified', handleEmailVerified);
                }

                // Debug user data for fallback redirect
                console.log(
                  '🔐 Email verification (fallback) - user data:',
                  successData.user
                );
                console.log(
                  '🔐 Email verification (fallback) - user roles:',
                  successData.user?.roles
                );
                console.log(
                  '🔐 Email verification (fallback) - is admin:',
                  successData.user?.roles?.includes('ADMIN')
                );

                // Fallback: wait for WebSocket event or redirect based on role after 5 seconds
                setTimeout(() => {
                  if (
                    successData.user &&
                    successData.user.roles &&
                    successData.user.roles.includes('ADMIN')
                  ) {
                    console.log(
                      '🔐 Email verification (fallback) - redirecting admin to /admin'
                    );
                    router.push('/admin');
                  } else {
                    console.log(
                      '🔐 Email verification (fallback) - redirecting customer to /'
                    );
                    router.push('/');
                  }
                }, 5000);
              }
            } catch (loginError) {
              // Login error but verification succeeded - still show success and redirect
              console.warn(
                '🔐 Email verification succeeded but login error:',
                loginError
              );

              // Connect to socket and join verification room even if login failed
              connect();
              joinVerificationRoom(currentUserId);

              // Listen for verification success event
              if (handleEmailVerified) {
                on('emailVerified', handleEmailVerified);
              }

              // Debug user data for fallback redirect
              console.log(
                '🔐 Email verification (fallback) - user data:',
                successData.user
              );
              console.log(
                '🔐 Email verification (fallback) - user roles:',
                successData.user?.roles
              );
              console.log(
                '🔐 Email verification (fallback) - is admin:',
                successData.user?.roles?.includes('ADMIN')
              );

              // Fallback: wait for WebSocket event or redirect based on role after 5 seconds
              setTimeout(() => {
                if (
                  successData.user &&
                  successData.user.roles &&
                  successData.user.roles.includes('ADMIN')
                ) {
                  console.log(
                    '🔐 Email verification (fallback) - redirecting admin to /admin'
                  );
                  router.push('/admin');
                } else {
                  console.log(
                    '🔐 Email verification (fallback) - redirecting customer to /'
                  );
                  router.push('/');
                }
              }, 5000);
            }
          } else {
            // Fallback to old behavior if no tokens
            if (successData.message) {
              setVerificationBackendSuccess(successData.message);
            } else {
              setVerificationSuccessKey('verifyEmail.successMessage');
            }
            setVerificationState({
              status: 'success',
            });

            // Redirect to login page after 3 seconds
            setTimeout(() => {
              router.push('/auth');
            }, 3000);
          }
        } else {
          const errorData = await response.json();
          console.log('🔐 Verification failed:', errorData);

          // If both endpoints failed, check if user is actually logged in
          const isActuallyLoggedIn = await checkExistingAuth();
          if (isActuallyLoggedIn) {
            return; // User is logged in, exit early
          }

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
        console.error('🔐 Email verification error:', error);

        // Check if user is actually logged in despite the error
        const isActuallyLoggedIn = await checkExistingAuth();
        if (isActuallyLoggedIn) {
          return; // User is logged in, exit early
        }

        setVerificationState({
          status: 'error',
        });
        setVerificationErrorKey('verifyEmail.errorMessage');
      }
    };

    verifyEmail();

    // Cleanup function
    return () => {
      if (userId) {
        leaveVerificationRoom(userId);
        // Note: disconnect is handled by the useSocket hook
      }
      // Clean up the emailVerified event listener
      if (handleEmailVerified) {
        off('emailVerified', handleEmailVerified);
      }
      // Clean up the auth broadcast listener
      offAuthBroadcast(handleAuthBroadcast);
    };
  }, [
    connect,
    joinVerificationRoom,
    leaveVerificationRoom,
    loginWithTokens,
    off,
    offAuthBroadcast,
    on,
    onAuthBroadcast,
    router,
    searchParams,
    t,
    userId,
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
      </div>
    </div>
  );
}
