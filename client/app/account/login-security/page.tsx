'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { LoadingPage } from '../../components/LoadingPage';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  Breadcrumb,
  generateBreadcrumbItems,
} from '../../components/Breadcrumb';
import { HiLockClosed, HiShieldCheck } from 'react-icons/hi2';

interface ValidationErrors {
  currentPassword?: string;
  newPassword?: string;
  confirmNewPassword?: string;
}

export default function LoginSecurityPage() {
  const { user, isLoading, logout } = useAuth();
  const { t, locale } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();

  const [activeTab, setActiveTab] = useState<
    'password' | 'twoFactor'
  >('password');

  // Password change form state
  const [passwordFormData, setPasswordFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });

  const [passwordValidationErrors, setPasswordValidationErrors] =
    useState<ValidationErrors>({});
  const [passwordTouched, setPasswordTouched] = useState({
    currentPassword: false,
    newPassword: false,
    confirmNewPassword: false,
  });

  const [isPasswordFormLoading, setIsPasswordFormLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccessMessage, setPasswordSuccessMessage] = useState('');
  const [passwordErrorKey, setPasswordErrorKey] = useState('');
  const [passwordSuccessKey, setPasswordSuccessKey] = useState('');

  useEffect(() => {
    // Redirect unauthenticated users to login
    if (!isLoading && !user) {
      router.push('/auth');
    }
  }, [user, isLoading, router]);

  // Show loading page while checking authentication
  if (isLoading) {
    return <LoadingPage />;
  }

  // Don't render anything if user is not authenticated (will redirect)
  if (!user) {
    return null;
  }

  // Password validation functions
  const validateCurrentPassword = (password: string): string | undefined => {
    if (!password.trim()) {
      return 'account.loginSecurity.password.currentPasswordRequired';
    }
    return undefined;
  };

  const validateNewPassword = (password: string): string | undefined => {
    if (!password.trim()) {
      return 'account.loginSecurity.password.newPasswordRequired';
    }
    if (password.length < 8) {
      return 'account.loginSecurity.password.passwordTooShort';
    }
    return undefined;
  };

  const validateConfirmNewPassword = (
    password: string,
    confirmPassword: string
  ): string | undefined => {
    if (!confirmPassword.trim()) {
      return 'account.loginSecurity.password.confirmPasswordRequired';
    }
    if (password !== confirmPassword) {
      return 'account.loginSecurity.password.passwordsDoNotMatch';
    }
    return undefined;
  };

  // Validate all password fields
  const validatePasswordForm = (): boolean => {
    const errors: ValidationErrors = {};

    const currentPasswordError = validateCurrentPassword(
      passwordFormData.currentPassword
    );
    if (currentPasswordError) errors.currentPassword = currentPasswordError;

    const newPasswordError = validateNewPassword(passwordFormData.newPassword);
    if (newPasswordError) errors.newPassword = newPasswordError;

    const confirmPasswordError = validateConfirmNewPassword(
      passwordFormData.newPassword,
      passwordFormData.confirmNewPassword
    );
    if (confirmPasswordError) errors.confirmNewPassword = confirmPasswordError;

    setPasswordValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Validate single password field
  const validatePasswordField = (name: string, value: string) => {
    let error: string | undefined;

    switch (name) {
      case 'currentPassword':
        error = validateCurrentPassword(value);
        break;
      case 'newPassword':
        error = validateNewPassword(value);
        break;
      case 'confirmNewPassword':
        error = validateConfirmNewPassword(passwordFormData.newPassword, value);
        break;
    }

    setPasswordValidationErrors((prev) => ({
      ...prev,
      [name]: error,
    }));
  };

  // Handle password form data changes
  const handlePasswordInputChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;
    setPasswordFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error when user starts typing
    if (passwordValidationErrors[name as keyof ValidationErrors]) {
      setPasswordValidationErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  // Handle password field blur for validation
  const handlePasswordBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordTouched((prev) => ({
      ...prev,
      [name]: true,
    }));
    validatePasswordField(name, value);
  };

  // Get password input class based on validation state
  const getPasswordInputClass = (fieldName: keyof ValidationErrors) => {
    const hasError =
      passwordTouched[fieldName] && passwordValidationErrors[fieldName];
    const baseClasses =
      'w-full px-4 py-3 rounded-lg text-white focus:bg-white/15 transition-all duration-300 text-sm sm:text-base';
    const alignmentClasses = locale === 'ar' ? 'text-right' : 'text-left';
    const errorClasses = hasError
      ? 'bg-white/10 border border-red-500/50 placeholder-white/50 focus:border-red-500'
      : 'bg-white/10 border border-white/20 placeholder-white/50 focus:border-purple-500';

    return `${baseClasses} ${alignmentClasses} ${errorClasses}`;
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordErrorKey('');
    setPasswordSuccessMessage('');
    setPasswordSuccessKey('');
    setIsPasswordFormLoading(true);

    // Mark all fields as touched
    setPasswordTouched({
      currentPassword: true,
      newPassword: true,
      confirmNewPassword: true,
    });

    // Validate form before submission
    if (!validatePasswordForm()) {
      setIsPasswordFormLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/users/me/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: passwordFormData.currentPassword,
          newPassword: passwordFormData.newPassword,
          confirmNewPassword: passwordFormData.confirmNewPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setPasswordSuccessKey('account.loginSecurity.password.success');
        setPasswordSuccessMessage('');
        setPasswordError('');
        setPasswordErrorKey('');

        // Reset form
        setPasswordFormData({
          currentPassword: '',
          newPassword: '',
          confirmNewPassword: '',
        });
        setPasswordTouched({
          currentPassword: false,
          newPassword: false,
          confirmNewPassword: false,
        });
        setPasswordValidationErrors({});

        // Logout user after successful password change
        setTimeout(() => {
          logout();
        }, 2000); // Wait 2 seconds to show success message
      } else {
        if (data.messageKey) {
          setPasswordErrorKey(data.messageKey);
          setPasswordError('');
        } else if (data.message) {
          setPasswordError(data.message);
          setPasswordErrorKey('');
        } else {
          // Handle specific error cases
          if (response.status === 401) {
            setPasswordErrorKey(
              'account.loginSecurity.password.currentPasswordIncorrect'
            );
            setPasswordError('');
          } else {
            setPasswordErrorKey('account.messages.generalError');
            setPasswordError('');
          }
        }
      }
    } catch (error) {
      setPasswordErrorKey('account.messages.generalError');
      setPasswordError('');
    } finally {
      setIsPasswordFormLoading(false);
    }
  };

  const tabs = [
    {
      id: 'password' as const,
      label: t('account.loginSecurity.tabs.password'),
      icon: HiLockClosed,
    },
    {
      id: 'twoFactor' as const,
      label: t('account.loginSecurity.tabs.twoFactor'),
      icon: HiShieldCheck,
    },
  ];

  return (
    <div className="min-h-screen account-bg">
      {/* Main Content Area */}
      <div className="p-4 sm:p-6 lg:p-8 xl:p-12">
        <div className="account max-w-4xl mx-auto">
          {/* Breadcrumb */}
          <div
            className={`mb-6 ${
              locale === 'ar' ? 'text-right flex justify-end' : 'text-left'
            }`}
          >
            <Breadcrumb items={generateBreadcrumbItems(pathname, t, locale)} />
          </div>

          <h1
            className={`text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-3 ${
              locale === 'ar' ? 'text-right' : 'text-left'
            }`}
          >
            {t('account.loginSecurity.title')}
          </h1>
          <p
            className={`text-sm sm:text-base text-gray-300 mb-8 ${
              locale === 'ar' ? 'text-right' : 'text-left'
            }`}
          >
            {t('account.loginSecurity.subtitle')}
          </p>

          {/* Tab Navigation */}
          <div className="mb-8">
            <div className="border-b border-white/20">
              <nav
                className={`flex ${locale === 'ar' ? 'flex-row-reverse' : ''}`}
              >
                {tabs.map((tab) => {
                  const IconComponent = tab.icon;
                  const isActive = activeTab === tab.id;

                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center px-4 py-3 text-sm font-medium border-b-2 transition-colors duration-200 ${
                        isActive
                          ? 'border-purple-500 text-purple-400'
                          : 'border-transparent text-white/70 hover:text-white hover:border-white/30'
                      } ${locale === 'ar' ? 'flex-row-reverse' : ''}`}
                    >
                      {IconComponent({
                        className: `w-4 h-4 ${
                          locale === 'ar' ? 'ml-2' : 'mr-2'
                        }`,
                      })}
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Tab Content */}
          <div className="bg-black/20 backdrop-blur-sm rounded-xl p-6 sm:p-8 border border-white/10 shadow-none">
            {activeTab === 'password' && (
              <div>
                <h2
                  className={`text-lg font-semibold text-white mb-2 ${
                    locale === 'ar' ? 'text-right' : 'text-left'
                  }`}
                >
                  {t('account.loginSecurity.password.title')}
                </h2>
                <p
                  className={`text-sm text-gray-300 mb-6 ${
                    locale === 'ar' ? 'text-right' : 'text-left'
                  }`}
                >
                  {t('account.loginSecurity.password.subtitle')}
                </p>

                {/* Security Notice */}
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 sm:p-4 mb-6">
                  <div className={`flex items-start space-x-2 sm:space-x-3 ${locale === 'ar' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className={`text-blue-400 text-xs sm:text-sm font-medium mb-1 ${locale === 'ar' ? 'text-right' : 'text-left'}`}>
                        {t('account.loginSecurity.password.securityNotice')}
                      </p>
                      <p className={`text-blue-300/80 text-xs sm:text-sm ${locale === 'ar' ? 'text-right' : 'text-left'}`}>
                        {t('account.loginSecurity.password.securityNoticeMessage')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Error Message */}
                {(passwordError || passwordErrorKey) && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-6 backdrop-blur-sm">
                    <p
                      className={`text-red-400 text-sm ${
                        locale === 'ar' ? 'text-right' : 'text-left'
                      }`}
                    >
                      {passwordError ||
                        (passwordErrorKey ? t(passwordErrorKey) : '')}
                    </p>
                  </div>
                )}

                {/* Success Message */}
                {(passwordSuccessMessage || passwordSuccessKey) && (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 mb-6 backdrop-blur-sm">
                    <p
                      className={`text-green-400 text-sm ${
                        locale === 'ar' ? 'text-right' : 'text-left'
                      }`}
                    >
                      {passwordSuccessMessage ||
                        (passwordSuccessKey ? t(passwordSuccessKey) : '')}
                    </p>
                  </div>
                )}

                <form onSubmit={handlePasswordSubmit} className="space-y-6">
                  {/* Current Password Field */}
                  <div>
                    <label
                      htmlFor="currentPassword"
                      className={`block text-sm font-medium text-white/80 mb-2 ${
                        locale === 'ar' ? 'text-right' : 'text-left'
                      }`}
                    >
                      <div
                        className={`flex items-center ${
                          locale === 'ar' ? 'flex-row-reverse' : ''
                        }`}
                      >
                        {HiLockClosed({
                          className: `w-4 h-4 ${
                            locale === 'ar' ? 'ml-2' : 'mr-2'
                          }`,
                        })}
                        {t('account.loginSecurity.password.currentPassword')}
                      </div>
                    </label>
                    <input
                      type="password"
                      id="currentPassword"
                      name="currentPassword"
                      value={passwordFormData.currentPassword}
                      onChange={handlePasswordInputChange}
                      onBlur={handlePasswordBlur}
                      className={getPasswordInputClass('currentPassword')}
                      placeholder={t(
                        'account.loginSecurity.password.currentPasswordPlaceholder'
                      )}
                      dir={locale === 'ar' ? 'rtl' : 'ltr'}
                    />
                    {passwordTouched.currentPassword &&
                      passwordValidationErrors.currentPassword && (
                        <p
                          className={`text-red-400 text-xs mt-1 ${
                            locale === 'ar' ? 'text-right' : 'text-left'
                          }`}
                        >
                          {t(passwordValidationErrors.currentPassword)}
                        </p>
                      )}
                  </div>

                  {/* New Password Field */}
                  <div>
                    <label
                      htmlFor="newPassword"
                      className={`block text-sm font-medium text-white/80 mb-2 ${
                        locale === 'ar' ? 'text-right' : 'text-left'
                      }`}
                    >
                      <div
                        className={`flex items-center ${
                          locale === 'ar' ? 'flex-row-reverse' : ''
                        }`}
                      >
                        {HiLockClosed({
                          className: `w-4 h-4 ${
                            locale === 'ar' ? 'ml-2' : 'mr-2'
                          }`,
                        })}
                        {t('account.loginSecurity.password.newPassword')}
                      </div>
                    </label>
                    <input
                      type="password"
                      id="newPassword"
                      name="newPassword"
                      value={passwordFormData.newPassword}
                      onChange={handlePasswordInputChange}
                      onBlur={handlePasswordBlur}
                      className={getPasswordInputClass('newPassword')}
                      placeholder={t(
                        'account.loginSecurity.password.newPasswordPlaceholder'
                      )}
                      dir={locale === 'ar' ? 'rtl' : 'ltr'}
                    />
                    {passwordTouched.newPassword &&
                      passwordValidationErrors.newPassword && (
                        <p
                          className={`text-red-400 text-xs mt-1 ${
                            locale === 'ar' ? 'text-right' : 'text-left'
                          }`}
                        >
                          {t(passwordValidationErrors.newPassword)}
                        </p>
                      )}
                    <p
                      className={`text-white/50 text-xs mt-1 ${
                        locale === 'ar' ? 'text-right' : 'text-left'
                      }`}
                    >
                      {t('account.loginSecurity.password.passwordRequirement')}
                    </p>
                  </div>

                  {/* Confirm New Password Field */}
                  <div>
                    <label
                      htmlFor="confirmNewPassword"
                      className={`block text-sm font-medium text-white/80 mb-2 ${
                        locale === 'ar' ? 'text-right' : 'text-left'
                      }`}
                    >
                      <div
                        className={`flex items-center ${
                          locale === 'ar' ? 'flex-row-reverse' : ''
                        }`}
                      >
                        {HiLockClosed({
                          className: `w-4 h-4 ${
                            locale === 'ar' ? 'ml-2' : 'mr-2'
                          }`,
                        })}
                        {t('account.loginSecurity.password.confirmNewPassword')}
                      </div>
                    </label>
                    <input
                      type="password"
                      id="confirmNewPassword"
                      name="confirmNewPassword"
                      value={passwordFormData.confirmNewPassword}
                      onChange={handlePasswordInputChange}
                      onBlur={handlePasswordBlur}
                      className={getPasswordInputClass('confirmNewPassword')}
                      placeholder={t(
                        'account.loginSecurity.password.confirmNewPasswordPlaceholder'
                      )}
                      dir={locale === 'ar' ? 'rtl' : 'ltr'}
                    />
                    {passwordTouched.confirmNewPassword &&
                      passwordValidationErrors.confirmNewPassword && (
                        <p
                          className={`text-red-400 text-xs mt-1 ${
                            locale === 'ar' ? 'text-right' : 'text-left'
                          }`}
                        >
                          {t(passwordValidationErrors.confirmNewPassword)}
                        </p>
                      )}
                  </div>

                  {/* Submit Button */}
                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={isPasswordFormLoading}
                      className="w-full bg-white text-black font-semibold py-3 px-6 rounded-lg hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 text-sm sm:text-base disabled:cursor-not-allowed min-h-[48px] flex items-center justify-center"
                    >
                      {isPasswordFormLoading ? (
                        <>
                          <svg
                            className="animate-spin -ml-1 mr-2 h-4 w-4 text-black"
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
                          {t('account.loginSecurity.password.changing')}
                        </>
                      ) : (
                        t('account.loginSecurity.password.changePassword')
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {activeTab === 'twoFactor' && (
              <div>
                <h2
                  className={`text-lg font-semibold text-white mb-2 ${
                    locale === 'ar' ? 'text-right' : 'text-left'
                  }`}
                >
                  {t('account.loginSecurity.tabs.twoFactor')}
                </h2>
                <p
                  className={`text-sm text-gray-300 ${
                    locale === 'ar' ? 'text-right' : 'text-left'
                  }`}
                >
                  Two-factor authentication setup coming soon...
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
