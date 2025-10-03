/* eslint-disable react/forbid-dom-props */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { usePathname } from 'next/navigation';
import {
  Breadcrumb,
  generateBreadcrumbItems,
} from '../../../components/Breadcrumb';
import { buildApiUrl, API_CONFIG } from '../../../config/api';
import { HiShieldCheck } from 'react-icons/hi2';
import MessageDisplay from '../../../components/MessageDisplay';

export default function LoginSecurityPage() {
  const { user, isLoading, logout, updateUser } = useAuth();
  const pathname = usePathname();

  // 2FA state - consolidated for better performance
  const [is2FALoading, setIs2FALoading] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [showDisableInput, setShowDisableInput] = useState(false);
  const [disablePasswordType, setDisablePasswordType] = useState<
    'text' | 'password'
  >('text');
  const [disablePasswordValue, setDisablePasswordValue] = useState('');
  const [twoFactorSuccessMessage, setTwoFactorSuccessMessage] = useState('');
  const [twoFactorErrorMessage, setTwoFactorErrorMessage] = useState('');

  const disablePasswordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (disablePasswordRef.current) {
      (disablePasswordRef.current.style as any).webkitTextSecurity =
        disablePasswordType === 'password' ? 'disc' : 'none';
      (disablePasswordRef.current.style as any).textSecurity =
        disablePasswordType === 'password' ? 'disc' : 'none';
    }
  }, [disablePasswordType]);

  // Optimized auto-fill prevention - only on focus, no intervals
  useEffect(() => {
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLInputElement;
      if (
        target &&
        (target.id === 'currentPassword' || target.name === 'disablePassword')
      ) {
        // Clear field if it contains common auto-filled values
        const commonPasswords = [
          'password',
          '123456',
          'admin',
          'test',
          'user',
          'login',
        ];
        if (commonPasswords.includes(target.value.toLowerCase())) {
          target.value = '';
          if (target.id === 'currentPassword') {
          } else {
            setDisablePasswordValue('');
            setDisablePassword('');
          }
        }
      }
    };

    document.addEventListener('focusin', handleFocus);
    return () => document.removeEventListener('focusin', handleFocus);
  }, []);

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <div className="min-h-screen">
      <div className="p-3 sm:p-4 md:p-6 lg:p-8 xl:p-12">
        <div className="account max-w-4xl mx-auto">
          {/* Breadcrumb skeleton */}
          <div className="mb-6">
            <div className="h-4 bg-gray-200 rounded w-1/3 animate-pulse"></div>
          </div>

          {/* Content skeleton */}
          <div className="bg-white backdrop-blur-sm rounded-xl p-4 sm:p-6 md:p-8 border border-gray-200 shadow-none">
            <div className="animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>

              {/* Security notice skeleton */}
              <div className="bg-purple-100 border border-purple-300 rounded-lg p-4 mb-6">
                <div className="h-4 bg-purple-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-purple-200 rounded w-full"></div>
              </div>

              {/* 2FA status skeleton */}
              <div className="bg-white backdrop-blur-sm rounded-xl p-6 border border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1">
                    <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3 mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  </div>
                  <div className="h-12 bg-gray-200 rounded w-32"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Show loading skeleton while authenticating
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  // Don't render anything if user is not authenticated (will redirect)
  if (!user) {
    return null;
  }

  // 2FA handlers
  const handleEnable2FA = async () => {
    setIs2FALoading(true);

    try {
      const url = buildApiUrl(API_CONFIG.ENDPOINTS.AUTH.ENABLE_2FA);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();

        // Refresh user data to get updated 2FA status without reloading page
        const userResponse = await fetch(
          buildApiUrl(API_CONFIG.ENDPOINTS.USERS.ME),
          {
            method: 'GET',
            credentials: 'include',
          }
        );

        if (userResponse.ok) {
          const userData = await userResponse.json();
          const finalUserData = userData.user || userData;
          updateUser(finalUserData);
        }

        setTwoFactorSuccessMessage(
          data.message ||
            'Two-factor authentication has been enabled successfully.'
        );
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error(
          '🔧 [2FA Page] Enable 2FA failed with status:',
          response.status
        );
        setTwoFactorErrorMessage(
          errorData.message ||
            'Failed to enable two-factor authentication. Please try again.'
        );
      }
    } catch (error: any) {
      setTwoFactorErrorMessage(
        error.message ||
          'An unexpected error occurred while enabling two-factor authentication. Please try again.'
      );
    } finally {
      setIs2FALoading(false);
    }
  };

  const handleDisable2FA = async () => {
    setIs2FALoading(true);

    try {
      const url = buildApiUrl(API_CONFIG.ENDPOINTS.AUTH.DISABLE_2FA);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword: disablePassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setShowDisableInput(false);
        setDisablePassword('');
        setDisablePasswordValue('');

        // Check if force logout is required
        if (data.forceLogout) {
          // Force logout immediately
          await logout();
          window.location.href = '/auth';
          return;
        }

        // Refresh user data to get updated 2FA status without reloading page
        const userResponse = await fetch(
          buildApiUrl(API_CONFIG.ENDPOINTS.USERS.ME),
          {
            method: 'GET',
            credentials: 'include',
          }
        );

        if (userResponse.ok) {
          const userData = await userResponse.json();
          const finalUserData = userData.user || userData;
          updateUser(finalUserData);
        }

        // Show success message
        setTwoFactorSuccessMessage(
          data.message ||
            'Two-factor authentication has been disabled successfully.'
        );
      } else {
        console.error(
          '🔧 [2FA Page] Disable 2FA failed with status:',
          response.status
        );
        setTwoFactorErrorMessage(
          data.message ||
            'Failed to disable two-factor authentication. Please check your password and try again.'
        );
      }
    } catch (error: any) {
      console.error('🔧 [2FA Page] Disable 2FA error:', error);
      setTwoFactorErrorMessage(
        error.message ||
          'An unexpected error occurred while disabling two-factor authentication. Please try again.'
      );
    } finally {
      setIs2FALoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Main Content Area */}
      <div className="p-3 sm:p-4 md:p-6 lg:p-8 xl:p-12">
        <div className="account max-w-4xl mx-auto">
          {/* Breadcrumb */}
          <div className="mb-6 text-left">
            {(() => {
              const breadcrumbItems = generateBreadcrumbItems(pathname);
              return <Breadcrumb items={breadcrumbItems} />;
            })()}
          </div>

          {/* Tab Content */}
          <div className="bg-white backdrop-blur-sm rounded-xl p-4 sm:p-6 md:p-8 border border-gray-200 shadow-none">
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-black mb-1 sm:mb-2 text-left">
                Two-Factor Authentication
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-6 text-left">
                Enable two-factor authentication for enhanced account security
              </p>

              {/* Security Notice */}
              <div className="bg-purple-100 border border-purple-300 rounded-lg p-3 sm:p-4 mb-6">
                <div className="flex items-start">
                  <svg
                    className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 mt-0.5 flex-shrink-0 mr-2 sm:mr-3"
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
                    <p className="text-purple-700 text-xs sm:text-sm font-medium mb-1 text-left">
                      Security Notice
                    </p>
                    <p className="text-purple-600 text-xs sm:text-sm text-left">
                      Two-factor authentication adds an extra layer of security
                      to your account. You will receive a verification code via
                      email when logging in. For your security, you will be
                      automatically logged out from all devices and browsers
                      after disabling 2FA
                    </p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <MessageDisplay
                successMessage={twoFactorSuccessMessage}
                errorMessage={twoFactorErrorMessage}
                className="mb-6"
              />

              {/* 2FA Status Section */}
              <div className="bg-white backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="text-left">
                    <div className="flex items-center mb-2">
                      {HiShieldCheck({
                        className: 'w-5 h-5 text-gray-600 mr-2',
                      })}
                      <h3 className="text-black font-semibold text-lg">
                        Email Two-Factor Authentication
                      </h3>
                    </div>
                    <p
                      id="2fa-status-description"
                      className="text-sm text-gray-600 mb-4"
                    >
                      {(() => {
                        const message = user?.twoFactorEnabled
                          ? '2FA is currently enabled. You will receive a code via email when logging in'
                          : 'Enable 2FA to receive a security code via email when logging in';
                        return message;
                      })()}
                    </p>
                    <div className="flex items-center">
                      <div
                        className={`w-2 h-2 rounded-full mr-2
                            ${
                              user?.twoFactorEnabled
                                ? 'bg-green-400'
                                : 'bg-gray-400'
                            }`}
                      />
                      <span
                        className={`text-sm font-medium ${
                          user?.twoFactorEnabled
                            ? 'text-green-600'
                            : 'text-gray-500'
                        }`}
                      >
                        {(() => {
                          const statusText = user?.twoFactorEnabled
                            ? 'Enabled'
                            : 'Disabled';
                          return statusText;
                        })()}
                      </span>
                    </div>
                  </div>
                  <div className="flex-shrink-0 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => {
                        if (user?.twoFactorEnabled) {
                          // Show password input directly
                          setShowDisableInput(true);
                        } else {
                          // Enable 2FA
                          handleEnable2FA();
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          if (user?.twoFactorEnabled) {
                            setShowDisableInput(true);
                          } else {
                            handleEnable2FA();
                          }
                        }
                      }}
                      className={`w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 rounded-lg text-xs sm:text-sm font-bold transition-all duration-300 min-h-[44px] sm:min-h-[48px] flex items-center justify-center disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                        user?.twoFactorEnabled
                          ? 'bg-red-100 text-red-700 border border-red-300 hover:bg-red-200 hover:border-red-400 focus:ring-red-500'
                          : 'bg-green-100 text-green-700 border border-green-300 hover:bg-green-200 hover:border-green-400 focus:ring-green-500'
                      }`}
                      disabled={is2FALoading}
                      aria-label={
                        user?.twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA'
                      }
                      aria-describedby="2fa-status-description"
                    >
                      {(() => {
                        const buttonText = is2FALoading
                          ? 'Loading...'
                          : user?.twoFactorEnabled
                          ? 'Disable 2FA'
                          : 'Enable 2FA';
                        return buttonText;
                      })()}
                    </button>
                  </div>
                </div>
              </div>

              {/* Disable 2FA Input Section */}
              {showDisableInput && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 sm:p-6 mt-4">
                  <h3 className="text-base sm:text-lg font-semibold text-red-800 mb-3 sm:mb-4 text-left">
                    Disable Two-Factor Authentication
                  </h3>
                  <p className="text-sm text-red-700 mb-4 sm:mb-6 text-left">
                    To disable 2FA, please enter your current password
                  </p>
                  <div className="space-y-4 sm:space-y-6">
                    {/* Hidden dummy fields to prevent auto-fill */}
                    <div className="hidden">
                      <label
                        htmlFor="hidden-username-inline"
                        className="sr-only"
                      >
                        Hidden username field
                      </label>
                      <input
                        id="hidden-username-inline"
                        type="text"
                        name="username"
                        autoComplete="username"
                        aria-hidden="true"
                        tabIndex={-1}
                      />
                      <label
                        htmlFor="hidden-password-inline"
                        className="sr-only"
                      >
                        Hidden password field
                      </label>
                      <input
                        id="hidden-password-inline"
                        type="password"
                        name="password"
                        autoComplete="current-password"
                        aria-hidden="true"
                        tabIndex={-1}
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="disable-password-input"
                        className="block text-sm font-medium text-red-700 mb-2 text-left"
                      >
                        Current password
                      </label>
                      <div className="relative">
                        <input
                          id="disable-password-input"
                          ref={disablePasswordRef}
                          type="text"
                          value={disablePasswordValue}
                          onChange={(e) => {
                            const value = e.target.value;
                            setDisablePasswordValue(value);
                            setDisablePassword(value);
                            // Switch to password type after user starts typing
                            if (
                              disablePasswordType === 'text' &&
                              value.length > 0
                            ) {
                              setDisablePasswordType('password');
                            }
                          }}
                          onFocus={() => {
                            // Switch to password type when focused
                            setDisablePasswordType('password');
                          }}
                          placeholder="Current password"
                          className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-black focus:bg-gray-50 transition-all duration-300 text-sm sm:text-base bg-white border border-red-300 placeholder-red-400 focus:border-red-600 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 min-h-[44px] sm:min-h-[48px] text-left"
                          dir="ltr"
                          autoComplete="off"
                          autoCorrect="off"
                          autoCapitalize="off"
                          spellCheck="false"
                          data-form-type="other"
                          data-lpignore="true"
                          data-1p-ignore="true"
                          data-bwignore="true"
                          data-dashlane-ignore="true"
                          data-bitwarden-ignore="true"
                          data-keeppass-ignore="true"
                          data-keepass-ignore="true"
                          data-roboform-ignore="true"
                          data-enpass-ignore="true"
                          data-nordpass-ignore="true"
                          data-protonpass-ignore="true"
                          data-ignore="true"
                          data-save="false"
                          data-saved="false"
                          data-autofill="false"
                          data-autocomplete="false"
                          aria-describedby="password-help"
                        />
                      </div>
                      <p
                        id="password-help"
                        className="text-xs text-red-600 mt-1 text-left"
                      >
                        Password help
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:gap-4 gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setShowDisableInput(false);
                          setDisablePassword('');
                          setDisablePasswordValue('');
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setShowDisableInput(false);
                            setDisablePassword('');
                            setDisablePasswordValue('');
                          }
                        }}
                        className="flex-1 px-3 sm:px-4 py-2 sm:py-3 bg-white border border-red-300 text-red-700 rounded-lg hover:bg-red-50 hover:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-300 text-xs sm:text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60 min-h-[44px] sm:min-h-[48px]"
                        disabled={is2FALoading}
                        aria-label="Cancel"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleDisable2FA();
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleDisable2FA();
                          }
                        }}
                        className="flex-1 px-3 sm:px-4 py-2 sm:py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 hover:border-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-300 text-xs sm:text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60 min-h-[44px] sm:min-h-[48px]"
                        disabled={is2FALoading}
                        aria-label="Disable 2FA"
                      >
                        {(() => {
                          const modalButtonText = is2FALoading
                            ? 'Disabling...'
                            : 'Disable 2FA';
                          return modalButtonText;
                        })()}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
