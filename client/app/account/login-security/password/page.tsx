/* eslint-disable react/forbid-dom-props */
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import {
  Breadcrumb,
  generateBreadcrumbItems,
} from '../../../components/Breadcrumb';
import { buildApiUrl, API_CONFIG } from '../../../config/api';
import { HiLockClosed } from 'react-icons/hi2';
import MessageDisplay from '../../../components/MessageDisplay';

export default function LoginSecurityPage() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Password change form state
  const [passwordFormData, setPasswordFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });

  const [isPasswordFormLoading, setIsPasswordFormLoading] = useState(false);
  const [passwordErrorMessage, setPasswordErrorMessage] = useState<
    string | undefined
  >(undefined);
  const [passwordSuccessMessage, setPasswordSuccessMessage] = useState<
    string | undefined
  >(undefined);

  // Validation errors state
  const [validationErrors, setValidationErrors] = useState({
    newPassword: '',
    confirmNewPassword: '',
  });

  const [currentPasswordType, setCurrentPasswordType] = useState<
    'text' | 'password'
  >('text');
  const [currentPasswordValue, setCurrentPasswordValue] = useState('');

  const currentPasswordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Redirect unauthenticated users to login
    if (!isLoading && !user) {
      router.push('/auth');
    }
  }, [user, isLoading, router]);

  // Set text security styles via refs to avoid inline style warnings
  useEffect(() => {
    if (currentPasswordRef.current) {
      (currentPasswordRef.current.style as any).webkitTextSecurity =
        currentPasswordType === 'password' ? 'disc' : 'none';
      (currentPasswordRef.current.style as any).textSecurity =
        currentPasswordType === 'password' ? 'disc' : 'none';
    }
  }, [currentPasswordType]);

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
            setCurrentPasswordValue('');
            setPasswordFormData((prev) => ({ ...prev, currentPassword: '' }));
          }
        }
      }
    };

    document.addEventListener('focusin', handleFocus);
    return () => document.removeEventListener('focusin', handleFocus);
  }, []);

  // Password validation functions
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

  const validateConfirmPassword = (password: string, confirmPassword: string): string | undefined => {
    if (!confirmPassword || confirmPassword.trim().length === 0) {
      return 'Password confirmation is required';
    }
    if (confirmPassword.length > 128) {
      return 'Password confirmation must be 128 characters or less';
    }
    if (password !== confirmPassword) {
      return "Password and confirmation password don't match";
    }
    return undefined;
  };

  // Handle password form data changes - memoized
  const handlePasswordInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      setPasswordFormData((prev) => ({
        ...prev,
        [name]: value,
      }));

      // Clear messages when user starts typing
      setPasswordErrorMessage(undefined);
      setPasswordSuccessMessage(undefined);

      // Validate fields on change
      if (name === 'newPassword') {
        const error = validatePassword(value);
        setValidationErrors(prev => ({
          ...prev,
          newPassword: error || '',
        }));
      } else if (name === 'confirmNewPassword') {
        const error = validateConfirmPassword(passwordFormData.newPassword, value);
        setValidationErrors(prev => ({
          ...prev,
          confirmNewPassword: error || '',
        }));
      }
    },
    [passwordFormData.newPassword]
  );

  // Get password input class
  const getPasswordInputClass = useCallback(() => {
    return 'w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-black focus:bg-gray-50 transition-all duration-300 text-sm sm:text-base min-h-[44px] sm:min-h-[48px] text-left bg-gray-50 border border-gray-300 placeholder-gray-400 focus:border-purple-600';
  }, []);

  // Get password input class with validation styling
  const getPasswordInputClassWithValidation = useCallback((fieldName: string) => {
    const baseClass = 'w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-black focus:bg-gray-50 transition-all duration-300 text-sm sm:text-base min-h-[44px] sm:min-h-[48px] text-left bg-gray-50 placeholder-gray-400';
    const errorClass = validationErrors[fieldName as keyof typeof validationErrors] 
      ? 'border-red-500 focus:border-red-500' 
      : 'border-gray-300 focus:border-purple-600';
    return `${baseClass} ${errorClass}`;
  }, [validationErrors]);

  // Don't render anything if user is not authenticated (will redirect)
  if (!isLoading && !user) {
    return null;
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordErrorMessage(undefined);
    setPasswordSuccessMessage(undefined);

    // Validate all fields before submission
    const newPasswordError = validatePassword(passwordFormData.newPassword);
    const confirmPasswordError = validateConfirmPassword(passwordFormData.newPassword, passwordFormData.confirmNewPassword);

    setValidationErrors({
      newPassword: newPasswordError || '',
      confirmNewPassword: confirmPasswordError || '',
    });

    // If there are validation errors, don't submit
    if (newPasswordError || confirmPasswordError) {
      return;
    }

    setIsPasswordFormLoading(true);

    try {
      const response = await fetch(
        buildApiUrl(API_CONFIG.ENDPOINTS.USERS.CHANGE_PASSWORD),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // This is crucial for sending cookies!
          body: JSON.stringify({
            currentPassword: passwordFormData.currentPassword,
            newPassword: passwordFormData.newPassword,
            confirmNewPassword: passwordFormData.confirmNewPassword,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        // Check if force logout is required
        if (data.forceLogout) {
          // Force logout immediately
          await logout();
          window.location.href = '/auth';
          return;
        }

        setPasswordSuccessMessage(
          data.message || 'Password changed successfully'
        );

        // Reset form
        setPasswordFormData({
          currentPassword: '',
          newPassword: '',
          confirmNewPassword: '',
        });
        setValidationErrors({
          newPassword: '',
          confirmNewPassword: '',
        });

        // Logout user after successful password change
        setTimeout(() => {
          logout();
        }, 2000); // Wait 2 seconds to show success message
      } else {
        console.warn('❌ Password Page: Password change failed', {
          message: data.message || data.error,
        });
        setPasswordErrorMessage(
          data.message ||
            data.error ||
            'Failed to change password. Please try again.'
        );
      }
    } catch (error) {
      console.error('💥 Password Page: Password change error caught', error);
      setPasswordErrorMessage(
        error instanceof Error
          ? error.message
          : 'An internal server error occurred. Please try again'
      );
    } finally {
      setIsPasswordFormLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Main Content Area */}
      <div className="p-3 sm:p-4 md:p-6 lg:p-8 xl:p-12">
        <div className="account max-w-4xl mx-auto">
          {/* Breadcrumb */}
          <div className="mb-6 text-left">
            <Breadcrumb items={generateBreadcrumbItems(pathname)} />
          </div>

          {/* Tab Content */}
          <div className="bg-white backdrop-blur-sm rounded-xl p-4 sm:p-6 md:p-8 border border-gray-200 shadow-none">
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-black mb-1 sm:mb-2 text-left">
                Change Password
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-6 text-left">
                Update your password to keep your account secure
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
                      For your security, you will be automatically logged out
                      from all devices and browsers after changing your password
                    </p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <MessageDisplay
                successMessage={passwordSuccessMessage}
                errorMessage={passwordErrorMessage}
                className="mb-6"
              />

              <form
                onSubmit={handlePasswordSubmit}
                className="space-y-4 sm:space-y-6"
              >
                {/* Hidden dummy fields to prevent auto-fill */}
                <div className="hidden">
                  <label htmlFor="hidden-username" className="sr-only">
                    Hidden username field
                  </label>
                  <input
                    id="hidden-username"
                    type="text"
                    name="username"
                    autoComplete="username"
                    aria-hidden="true"
                    tabIndex={-1}
                  />
                  <label htmlFor="hidden-password" className="sr-only">
                    Hidden password field
                  </label>
                  <input
                    id="hidden-password"
                    type="password"
                    name="password"
                    autoComplete="current-password"
                    aria-hidden="true"
                    tabIndex={-1}
                  />
                </div>

                {/* Current Password Field */}
                <div>
                  <label
                    htmlFor="currentPassword"
                    className="block text-sm font-medium text-gray-700 mb-2 text-left"
                  >
                    <div className="flex items-center">
                      {HiLockClosed({
                        className: 'w-4 h-4 mr-2',
                      })}
                      Current Password
                    </div>
                  </label>
                  <div className="relative">
                    <input
                      ref={currentPasswordRef}
                      type="text"
                      id="currentPassword"
                      name="currentPassword"
                      value={currentPasswordValue}
                      onChange={(e) => {
                        const value = e.target.value;
                        setCurrentPasswordValue(value);
                        setPasswordFormData((prev) => ({
                          ...prev,
                          currentPassword: value,
                        }));
                        // Switch to password type after user starts typing
                        if (
                          currentPasswordType === 'text' &&
                          value.length > 0
                        ) {
                          setCurrentPasswordType('password');
                        }
                      }}
                      onFocus={() => {
                        // Switch to password type when focused
                        setCurrentPasswordType('password');
                      }}
                      className={getPasswordInputClass()}
                      placeholder="Enter your current password"
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
                    />
                  </div>
                </div>

                {/* New Password Field */}
                <div>
                  <label
                    htmlFor="newPassword"
                    className="block text-sm font-medium text-gray-700 mb-2 text-left"
                  >
                    <div className="flex items-center">
                      {HiLockClosed({
                        className: 'w-4 h-4 mr-2',
                      })}
                      New Password
                    </div>
                  </label>
                  <input
                    type="password"
                    id="newPassword"
                    name="newPassword"
                    value={passwordFormData.newPassword}
                    onChange={handlePasswordInputChange}
                    className={getPasswordInputClassWithValidation('newPassword')}
                    placeholder="Enter your new password"
                    dir="ltr"
                  />
                  {validationErrors.newPassword ? (
                    <p className="text-red-500 text-xs mt-1 text-left">
                      {validationErrors.newPassword}
                    </p>
                  ) : (
                    <p className="text-gray-500 text-xs mt-1 text-left">
                      Password must be at least 8 characters long
                    </p>
                  )}
                </div>

                {/* Confirm New Password Field */}
                <div>
                  <label
                    htmlFor="confirmNewPassword"
                    className="block text-sm font-medium text-gray-700 mb-2 text-left"
                  >
                    <div className="flex items-center">
                      {HiLockClosed({
                        className: 'w-4 h-4 mr-2',
                      })}
                      Confirm new password
                    </div>
                  </label>
                  <input
                    type="password"
                    id="confirmNewPassword"
                    name="confirmNewPassword"
                    value={passwordFormData.confirmNewPassword}
                    onChange={handlePasswordInputChange}
                    className={getPasswordInputClassWithValidation('confirmNewPassword')}
                    placeholder="Confirm New Password"
                    dir="ltr"
                  />
                  {validationErrors.confirmNewPassword && (
                    <p className="text-red-500 text-xs mt-1 text-left">
                      {validationErrors.confirmNewPassword}
                    </p>
                  )}
                </div>

                {/* Submit Button */}
                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isPasswordFormLoading}
                    className="w-full bg-black text-white font-semibold py-3 px-6 rounded-lg hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 text-sm sm:text-base disabled:cursor-not-allowed disabled:opacity-60 min-h-[48px] flex items-center justify-center"
                  >
                    {isPasswordFormLoading ? (
                      <>{'Changing...'}</>
                    ) : (
                      'Change Password'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
