/* eslint-disable react/forbid-dom-props */
'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { LoadingPage } from '../../components/LoadingPage';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  Breadcrumb,
  generateBreadcrumbItems,
} from '../../components/Breadcrumb';
import { buildApiUrl } from '../../config/api';
import { HiLockClosed, HiShieldCheck, HiUser } from 'react-icons/hi2';

interface ProfileValidationErrors {
  name?: string;
}

interface PasswordValidationErrors {
  currentPassword?: string;
  newPassword?: string;
  confirmNewPassword?: string;
}

export default function LoginSecurityPage() {
  const { user, isLoading, logout, updateUser } = useAuth();
  const { t, locale } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();

  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'twoFactor'>(
    'profile'
  );

  // Profile form state
  const [profileFormData, setProfileFormData] = useState({
    name: '',
  });

  const [profileValidationErrors, setProfileValidationErrors] =
    useState<ProfileValidationErrors>({});
  const [profileTouched, setProfileTouched] = useState({
    name: false,
  });

  const [isProfileFormLoading, setIsProfileFormLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccessMessage, setProfileSuccessMessage] = useState('');
  const [profileErrorKey, setProfileErrorKey] = useState('');
  const [profileSuccessKey, setProfileSuccessKey] = useState('');

  // Password change form state
  const [passwordFormData, setPasswordFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });

  const [passwordValidationErrors, setPasswordValidationErrors] =
    useState<PasswordValidationErrors>({});
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

  // 2FA state
  const [is2FALoading, setIs2FALoading] = useState(false);
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [disablePasswordError, setDisablePasswordError] = useState('');
  const [currentPasswordType, setCurrentPasswordType] = useState<'text' | 'password'>('text');
  const [disablePasswordType, setDisablePasswordType] = useState<'text' | 'password'>('text');
  const [currentPasswordValue, setCurrentPasswordValue] = useState('');
  const [disablePasswordValue, setDisablePasswordValue] = useState('');
  const [isPageLoading, setIsPageLoading] = useState(true);
  
  const currentPasswordRef = useRef<HTMLInputElement>(null);
  const disablePasswordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Redirect unauthenticated users to login
    if (!isLoading && !user) {
      router.push('/auth');
    } else if (!isLoading && user) {
      // Initialize profile form data when user becomes available
      setProfileFormData({
        name: user.name || '',
      });
      // Page is ready to render
      setIsPageLoading(false);
    }
  }, [user, isLoading, router]);

  // Set text security styles via refs to avoid inline style warnings
  useEffect(() => {
    if (currentPasswordRef.current) {
      (currentPasswordRef.current.style as any).webkitTextSecurity = currentPasswordType === 'password' ? 'disc' : 'none';
      (currentPasswordRef.current.style as any).textSecurity = currentPasswordType === 'password' ? 'disc' : 'none';
    }
  }, [currentPasswordType]);

  useEffect(() => {
    if (disablePasswordRef.current) {
      (disablePasswordRef.current.style as any).webkitTextSecurity = disablePasswordType === 'password' ? 'disc' : 'none';
      (disablePasswordRef.current.style as any).textSecurity = disablePasswordType === 'password' ? 'disc' : 'none';
    }
  }, [disablePasswordType]);

  // Optimized auto-fill prevention - only on focus, no intervals
  useEffect(() => {
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLInputElement;
      if (target && (target.id === 'currentPassword' || target.name === 'disablePassword')) {
        // Clear field if it contains common auto-filled values
        const commonPasswords = ['password', '123456', 'admin', 'test', 'user', 'login'];
        if (commonPasswords.includes(target.value.toLowerCase())) {
          target.value = '';
          if (target.id === 'currentPassword') {
            setCurrentPasswordValue('');
            setPasswordFormData(prev => ({ ...prev, currentPassword: '' }));
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

  // Profile validation functions - memoized for performance
  const validateName = useCallback((name: string): string | undefined => {
    if (!name.trim()) {
      return 'account.validation.nameRequired';
    }
    if (name.length > 100) {
      return 'account.validation.nameTooLong';
    }
    return undefined;
  }, []);

  // Validate all profile fields - memoized
  const validateProfileForm = useCallback((): boolean => {
    const errors: ProfileValidationErrors = {};

    const nameError = validateName(profileFormData.name);
    if (nameError) errors.name = nameError;

    setProfileValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [profileFormData.name, validateName]);

  // Validate single profile field - memoized
  const validateProfileField = useCallback((name: string, value: string) => {
    let error: string | undefined;

    switch (name) {
      case 'name':
        error = validateName(value);
        break;
    }

    setProfileValidationErrors((prev) => ({
      ...prev,
      [name]: error,
    }));
  }, [validateName]);

  // Handle profile form data changes - memoized
  const handleProfileInputChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;
    setProfileFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error when user starts typing
    if (name in profileValidationErrors) {
      setProfileValidationErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  }, [profileValidationErrors]);

  // Handle profile field blur for validation - memoized
  const handleProfileBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileTouched((prev) => ({
      ...prev,
      [name]: true,
    }));
    validateProfileField(name, value);
  }, [validateProfileField]);

  // Get profile input class based on validation state - memoized
  const getProfileInputClass = useCallback((fieldName: keyof ProfileValidationErrors) => {
    const hasError =
      profileTouched[fieldName as keyof typeof profileTouched] && 
      profileValidationErrors[fieldName];
    const baseClasses =
      'w-full px-4 py-3 rounded-lg text-black dark:text-white focus:bg-gray-50 dark:focus:bg-white/15 transition-all duration-300 text-sm sm:text-base';
    const alignmentClasses = locale === 'ar' ? 'text-right' : 'text-left';
    const errorClasses = hasError
      ? 'bg-gray-50 dark:bg-white/10 border border-red-500 dark:border-red-500/50 placeholder-gray-400 dark:placeholder-white/50 focus:border-red-500'
      : 'bg-gray-50 dark:bg-white/10 border border-gray-300 dark:border-white/20 placeholder-gray-400 dark:placeholder-white/50 focus:border-purple-600 dark:focus:border-purple-500';

    return `${baseClasses} ${alignmentClasses} ${errorClasses}`;
  }, [profileTouched, profileValidationErrors, locale]);

  // Password validation functions - memoized for performance
  const validateCurrentPassword = useCallback((password: string): string | undefined => {
    if (!password.trim()) {
      return 'account.loginSecurity.password.currentPasswordRequired';
    }
    return undefined;
  }, []);

  const validateNewPassword = useCallback((password: string): string | undefined => {
    if (!password.trim()) {
      return 'account.loginSecurity.password.newPasswordRequired';
    }
    if (password.length < 8) {
      return 'account.loginSecurity.password.passwordTooShort';
    }
    return undefined;
  }, []);

  const validateConfirmNewPassword = useCallback((
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
  }, []);

  // Validate all password fields - memoized
  const validatePasswordForm = useCallback((): boolean => {
    const errors: PasswordValidationErrors = {};

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
  }, [passwordFormData, validateCurrentPassword, validateNewPassword, validateConfirmNewPassword]);

  // Validate single password field - memoized
  const validatePasswordField = useCallback((name: string, value: string) => {
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
  }, [passwordFormData.newPassword, validateCurrentPassword, validateNewPassword, validateConfirmNewPassword]);

  // Handle password form data changes - memoized
  const handlePasswordInputChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;
    setPasswordFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error when user starts typing
    if (name in passwordValidationErrors) {
      setPasswordValidationErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  }, [passwordValidationErrors]);

  // Handle password field blur for validation - memoized
  const handlePasswordBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordTouched((prev) => ({
      ...prev,
      [name]: true,
    }));
    validatePasswordField(name, value);
  }, [validatePasswordField]);

  // Get password input class based on validation state - memoized
  const getPasswordInputClass = useCallback((fieldName: keyof PasswordValidationErrors) => {
    const hasError =
      passwordTouched[fieldName as keyof typeof passwordTouched] && 
      passwordValidationErrors[fieldName];
    const baseClasses =
      'w-full px-4 py-3 rounded-lg text-black dark:text-white focus:bg-gray-50 dark:focus:bg-white/15 transition-all duration-300 text-sm sm:text-base';
    const alignmentClasses = locale === 'ar' ? 'text-right' : 'text-left';
    const errorClasses = hasError
      ? 'bg-gray-50 dark:bg-white/10 border border-red-500 dark:border-red-500/50 placeholder-gray-400 dark:placeholder-white/50 focus:border-red-500'
      : 'bg-gray-50 dark:bg-white/10 border border-gray-300 dark:border-white/20 placeholder-gray-400 dark:placeholder-white/50 focus:border-purple-600 dark:focus:border-purple-500';

    return `${baseClasses} ${alignmentClasses} ${errorClasses}`;
  }, [passwordTouched, passwordValidationErrors, locale]);

  // Memoize tabs to prevent unnecessary re-renders
  const tabs = useMemo(() => [
    {
      id: 'profile' as const,
      label: t('account.loginSecurity.tabs.profile'),
      icon: HiUser,
    },
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
  ], [t]);

  // Show loading page while checking authentication or page is loading
  if (isLoading || isPageLoading) {
    return <LoadingPage />;
  }

  // Don't render anything if user is not authenticated (will redirect)
  if (!user) {
    return null;
  }

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setProfileErrorKey('');
    setProfileSuccessMessage('');
    setProfileSuccessKey('');
    setIsProfileFormLoading(true);

    // Mark all fields as touched
    setProfileTouched({
      name: true,
    });

    // Validate form before submission
    if (!validateProfileForm()) {
      setIsProfileFormLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: profileFormData.name.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Update user in context - handle nested user structure
        const userData = data.user?.user || data.user;
        if (userData) {
          updateUser(userData);
          // Directly update form data with the new values
          setProfileFormData({
            name: userData.name || '',
          });
        }

        setProfileSuccessKey('account.messages.updateSuccess');
        setProfileSuccessMessage('');
        setProfileError('');
        setProfileErrorKey('');
      } else {
        if (data.messageKey) {
          setProfileErrorKey(data.messageKey);
          setProfileError('');
        } else if (data.message) {
          setProfileError(data.message);
          setProfileErrorKey('');
        } else {
          setProfileErrorKey('account.messages.updateFailed');
          setProfileError('');
        }
      }
    } catch (error) {
      setProfileErrorKey('account.messages.generalError');
      setProfileError('');
    } finally {
      setIsProfileFormLoading(false);
    }
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
        // Check if force logout is required
        if (data.forceLogout) {
          // Force logout immediately
          await logout();
          window.location.href = '/auth';
          return;
        }

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

  // Helper function to map backend messages to translation keys
  const mapBackendMessageToKey = (message: string): string => {
    const messageMap: { [key: string]: string } = {
      'User not found': 'auth.messages.userNotFound',
      '2FA is not enabled': 'auth.messages.twoFactorNotEnabled',
      'Invalid current password': 'auth.messages.invalidCurrentPassword',
    };
    return (
      messageMap[message] ||
      'account.loginSecurity.twoFactor.disableModal.disableFailed'
    );
  };

  // 2FA handlers
  const handleEnable2FA = async () => {
    setIs2FALoading(true);
    try {
      const url = buildApiUrl('/v1/auth/2fa/enable');
      console.log('2FA enable URL:', url);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        console.log('2FA enable success:', data);
        // Refresh user data to get updated 2FA status without reloading page
        const userResponse = await fetch(buildApiUrl('/users/me'), {
          method: 'GET',
          credentials: 'include',
        });

        if (userResponse.ok) {
          const userData = await userResponse.json();
          const finalUserData = userData.user || userData;
          updateUser(finalUserData);
        }
      } else {
        const errorData = await response.json();
        console.error('2FA enable error:', errorData);
        alert(errorData.message || `Failed to enable 2FA (${response.status})`);
      }
    } catch (error) {
      console.error('2FA enable exception:', error);
      alert('An error occurred while enabling 2FA');
    } finally {
      setIs2FALoading(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!disablePassword.trim()) {
      setDisablePasswordError(
        t('account.loginSecurity.twoFactor.disableModal.passwordRequired')
      );
      return;
    }

    setIs2FALoading(true);
    setDisablePasswordError('');

    try {
      const response = await fetch(buildApiUrl('/v1/auth/2fa/disable'), {
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
        setShowDisableModal(false);
        setDisablePassword('');

        // Check if force logout is required
        if (data.forceLogout) {
          // Force logout immediately
          await logout();
          window.location.href = '/auth';
          return;
        }

        // Refresh user data to get updated 2FA status without reloading page
        const userResponse = await fetch(buildApiUrl('/users/me'), {
          method: 'GET',
          credentials: 'include',
        });

        if (userResponse.ok) {
          const userData = await userResponse.json();
          const finalUserData = userData.user || userData;
          updateUser(finalUserData);
        }
      } else {
        const errorMessage = data.message || 'Failed to disable 2FA';
        const errorKey = mapBackendMessageToKey(errorMessage);
        setDisablePasswordError(t(errorKey));
      }
    } catch (error) {
      setDisablePasswordError(
        t('account.loginSecurity.twoFactor.disableModal.disableError')
      );
    } finally {
      setIs2FALoading(false);
    }
  };

  return (
    <div className="min-h-screen">
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
            className={`text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-black dark:text-white mb-3 ${
              locale === 'ar' ? 'text-right' : 'text-left'
            }`}
          >
            {t('account.loginSecurity.title')}
          </h1>
          <p
            className={`text-sm sm:text-base text-gray-600 dark:text-gray-300 mb-8 ${
              locale === 'ar' ? 'text-right' : 'text-left'
            }`}
          >
            {t('account.loginSecurity.subtitle')}
          </p>

          {/* Tab Navigation */}
          <div className="mb-8">
            <div className="border-b border-gray-300 dark:border-white/20">
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
                      className={`flex items-center px-4 py-3 text-sm font-medium transition-colors duration-200 ${
                        isActive
                          ? 'border-purple-600 dark:border-purple-500 text-purple-700 dark:text-purple-400'
                          : 'border-transparent text-gray-600 dark:text-white/70 hover:text-gray-800 dark:hover:text-white'
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
          <div className="bg-white dark:bg-black/20 backdrop-blur-sm rounded-xl p-6 sm:p-8 border border-gray-200 dark:border-white/10 shadow-none">
            {activeTab === 'profile' && (
              <div>
                <h2
                  className={`text-lg font-semibold text-black dark:text-white mb-2 ${
                    locale === 'ar' ? 'text-right' : 'text-left'
                  }`}
                >
                  {t('account.loginSecurity.profile.title')}
                </h2>
                <p
                  className={`text-sm text-gray-600 dark:text-gray-300 mb-6 ${
                    locale === 'ar' ? 'text-right' : 'text-left'
                  }`}
                >
                  {t('account.loginSecurity.profile.subtitle')}
                </p>

                {/* Error Message */}
                {(profileError || profileErrorKey) && (
                  <div className="bg-red-100 dark:bg-red-500/10 border border-red-300 dark:border-red-500/20 rounded-lg p-3 mb-6 backdrop-blur-sm">
                    <p
                      className={`text-red-700 dark:text-red-400 text-sm ${
                        locale === 'ar' ? 'text-right' : 'text-left'
                      }`}
                    >
                      {profileError || (profileErrorKey ? t(profileErrorKey) : '')}
                    </p>
                  </div>
                )}

                {/* Success Message */}
                {(profileSuccessMessage || profileSuccessKey) && (
                  <div className="bg-green-100 dark:bg-green-500/10 border border-green-300 dark:border-green-500/20 rounded-lg p-3 mb-6 backdrop-blur-sm">
                    <p
                      className={`text-green-700 dark:text-green-400 text-sm ${
                        locale === 'ar' ? 'text-right' : 'text-left'
                      }`}
                    >
                      {profileSuccessMessage || (profileSuccessKey ? t(profileSuccessKey) : '')}
                    </p>
                  </div>
                )}

                <form onSubmit={handleProfileSubmit} className="space-y-6">
                  {/* Name Field */}
                  <div>
                    <label
                      htmlFor="name"
                      className={`block text-sm font-medium text-gray-700 dark:text-white/80 mb-2 ${
                        locale === 'ar' ? 'text-right' : 'text-left'
                      }`}
                    >
                      <div
                        className={`flex items-center ${
                          locale === 'ar' ? 'flex-row-reverse' : ''
                        }`}
                      >
                        {HiUser({
                          className: `w-4 h-4 ${locale === 'ar' ? 'ml-2' : 'mr-2'}`,
                        })}
                        {t('account.form.fullName')}
                      </div>
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={profileFormData.name}
                      onChange={handleProfileInputChange}
                      onBlur={handleProfileBlur}
                      className={getProfileInputClass('name')}
                      placeholder={t('account.form.fullNamePlaceholder')}
                      dir={locale === 'ar' ? 'rtl' : 'ltr'}
                    />
                    {profileTouched.name && profileValidationErrors.name && (
                      <p
                        className={`text-red-600 dark:text-red-400 text-xs mt-1 ${
                          locale === 'ar' ? 'text-right' : 'text-left'
                        }`}
                      >
                        {t(profileValidationErrors.name)}
                      </p>
                    )}
                  </div>

                  {/* Submit Button */}
                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={isProfileFormLoading}
                      className="w-full bg-black dark:bg-white text-white dark:text-black font-semibold py-3 px-6 rounded-lg hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 text-sm sm:text-base disabled:cursor-not-allowed disabled:opacity-60 min-h-[48px] flex items-center justify-center"
                    >
                      {isProfileFormLoading ? (
                        <>
                          {t('account.form.updating')}
                        </>
                      ) : (
                        t('account.form.updateProfile')
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {activeTab === 'password' && (
              <div>
                <h2
                  className={`text-lg font-semibold text-black dark:text-white mb-2 ${
                    locale === 'ar' ? 'text-right' : 'text-left'
                  }`}
                >
                  {t('account.loginSecurity.password.title')}
                </h2>
                <p
                  className={`text-sm text-gray-600 dark:text-gray-300 mb-6 ${
                    locale === 'ar' ? 'text-right' : 'text-left'
                  }`}
                >
                  {t('account.loginSecurity.password.subtitle')}
                </p>

                {/* Security Notice */}
                <div className="bg-purple-100 dark:bg-purple-500/10 border border-purple-300 dark:border-purple-500/20 rounded-lg p-3 sm:p-4 mb-6">
                  <div
                    className={`flex items-start ${
                      locale === 'ar' ? 'flex-row-reverse' : ''
                    }`}
                  >
                    <svg
                      className={`w-4 h-4 sm:w-5 sm:h-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0 ${
                        locale === 'ar' ? 'ml-2 sm:ml-3' : 'mr-2 sm:mr-3'
                      }`}
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
                      <p
                        className={`text-purple-700 dark:text-purple-400 text-xs sm:text-sm font-medium mb-1 ${
                          locale === 'ar' ? 'text-right' : 'text-left'
                        }`}
                      >
                        {t('account.loginSecurity.password.securityNotice')}
                      </p>
                      <p
                        className={`text-purple-600 dark:text-purple-300/80 text-xs sm:text-sm ${
                          locale === 'ar' ? 'text-right' : 'text-left'
                        }`}
                      >
                        {t(
                          'account.loginSecurity.password.securityNoticeMessage'
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Error Message */}
                {(passwordError || passwordErrorKey) && (
                  <div className="bg-red-100 dark:bg-red-500/10 border border-red-300 dark:border-red-500/20 rounded-lg p-3 mb-6 backdrop-blur-sm">
                    <p
                      className={`text-red-700 dark:text-red-400 text-sm ${
                        locale === 'ar' ? 'text-right' : 'text-left'
                      }`}
                    >
                      {passwordErrorKey ? t(passwordErrorKey) : passwordError}
                    </p>
                  </div>
                )}

                {/* Success Message */}
                {(passwordSuccessMessage || passwordSuccessKey) && (
                  <div className="bg-green-100 dark:bg-green-500/10 border border-green-300 dark:border-green-500/20 rounded-lg p-3 mb-6 backdrop-blur-sm">
                    <p
                      className={`text-green-700 dark:text-green-400 text-sm ${
                        locale === 'ar' ? 'text-right' : 'text-left'
                      }`}
                    >
                      {passwordSuccessKey
                        ? t(passwordSuccessKey)
                        : passwordSuccessMessage}
                    </p>
                  </div>
                )}

                <form onSubmit={handlePasswordSubmit} className="space-y-6">
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
                      className={`block text-sm font-medium text-gray-700 dark:text-white/80 mb-2 ${
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
                          setPasswordFormData(prev => ({ ...prev, currentPassword: value }));
                          // Switch to password type after user starts typing
                          if (currentPasswordType === 'text' && value.length > 0) {
                            setCurrentPasswordType('password');
                          }
                        }}
                        onBlur={(e) => {
                          handlePasswordBlur(e);
                        }}
                        onFocus={() => {
                          // Switch to password type when focused
                          setCurrentPasswordType('password');
                        }}
                        className={getPasswordInputClass('currentPassword')}
                        placeholder={t(
                          'account.loginSecurity.password.currentPasswordPlaceholder'
                        )}
                        dir={locale === 'ar' ? 'rtl' : 'ltr'}
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
                    {passwordTouched.currentPassword &&
                      passwordValidationErrors.currentPassword && (
                        <p
                          className={`text-red-600 dark:text-red-400 text-xs mt-1 ${
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
                      className={`block text-sm font-medium text-gray-700 dark:text-white/80 mb-2 ${
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
                          className={`text-red-600 dark:text-red-400 text-xs mt-1 ${
                            locale === 'ar' ? 'text-right' : 'text-left'
                          }`}
                        >
                          {t(passwordValidationErrors.newPassword)}
                        </p>
                      )}
                    <p
                      className={`text-gray-500 dark:text-white/50 text-xs mt-1 ${
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
                      className={`block text-sm font-medium text-gray-700 dark:text-white/80 mb-2 ${
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
                          className={`text-red-600 dark:text-red-400 text-xs mt-1 ${
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
                      className="w-full bg-black dark:bg-white text-white dark:text-black font-semibold py-3 px-6 rounded-lg hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 text-sm sm:text-base disabled:cursor-not-allowed disabled:opacity-60 min-h-[48px] flex items-center justify-center"
                    >
                      {isPasswordFormLoading ? (
                        <>{t('account.loginSecurity.password.changing')}</>
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
                  className={`text-lg font-semibold text-black dark:text-white mb-2 ${
                    locale === 'ar' ? 'text-right' : 'text-left'
                  }`}
                >
                  {t('account.loginSecurity.tabs.twoFactor')}
                </h2>
                <p
                  className={`text-sm text-gray-600 dark:text-gray-300 mb-6 ${
                    locale === 'ar' ? 'text-right' : 'text-left'
                  }`}
                >
                  {t('account.loginSecurity.twoFactor.subtitle')}
                </p>

                {/* Security Notice */}
                <div className="bg-purple-100 dark:bg-purple-500/10 border border-purple-300 dark:border-purple-500/20 rounded-lg p-3 sm:p-4 mb-6">
                  <div
                    className={`flex items-start ${
                      locale === 'ar' ? 'flex-row-reverse' : ''
                    }`}
                  >
                    <svg
                      className={`w-4 h-4 sm:w-5 sm:h-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0 ${
                        locale === 'ar' ? 'ml-2 sm:ml-3' : 'mr-2 sm:mr-3'
                      }`}
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
                      <p
                        className={`text-purple-700 dark:text-purple-400 text-xs sm:text-sm font-medium mb-1 ${
                          locale === 'ar' ? 'text-right' : 'text-left'
                        }`}
                      >
                        {t('account.loginSecurity.twoFactor.securityNotice')}
                      </p>
                      <p
                        className={`text-purple-600 dark:text-purple-300/80 text-xs sm:text-sm ${
                          locale === 'ar' ? 'text-right' : 'text-left'
                        }`}
                      >
                        {t(
                          'account.loginSecurity.twoFactor.securityNoticeMessage'
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2FA Status Section */}
                <div className="bg-white dark:bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-gray-200 dark:border-white/10">
                  <div
                    className={`flex items-center justify-between ${
                      locale === 'ar' ? 'flex-row-reverse' : ''
                    }`}
                  >
                    <div
                      className={`${
                        locale === 'ar' ? 'text-right' : 'text-left'
                      }`}
                    >
                      <div
                        className={`flex items-center mb-2 ${
                          locale === 'ar' ? 'flex-row-reverse' : ''
                        }`}
                      >
                        {HiShieldCheck({
                          className: `w-5 h-5 text-gray-600 dark:text-white/80 ${
                            locale === 'ar' ? 'ml-2' : 'mr-2'
                          }`,
                        })}
                        <h3 className="text-black dark:text-white font-semibold text-lg">
                          {t('account.loginSecurity.twoFactor.title')}
                        </h3>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                        {user?.twoFactorEnabled
                          ? t('account.loginSecurity.twoFactor.enabledMessage')
                          : t(
                              'account.loginSecurity.twoFactor.disabledMessage'
                            )}
                      </p>
                      <div
                        className={`flex items-center ${
                          locale === 'ar' ? 'flex-row-reverse' : ''
                        }`}
                      >
                        <div
                          className={`w-2 h-2 rounded-full ${
                            locale === 'ar' ? 'ml-2' : 'mr-2'
                          } ${
                            user?.twoFactorEnabled
                              ? 'bg-green-400'
                              : 'bg-gray-400'
                          }`}
                        />
                        <span
                          className={`text-sm font-medium ${
                            user?.twoFactorEnabled
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-gray-500 dark:text-gray-400'
                          }`}
                        >
                          {user?.twoFactorEnabled
                            ? t(
                                'account.loginSecurity.twoFactor.status.enabled'
                              )
                            : t(
                                'account.loginSecurity.twoFactor.status.disabled'
                              )}
                        </span>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <button
                        onClick={() => {
                          if (user?.twoFactorEnabled) {
                            // Show disable modal
                            setShowDisableModal(true);
                          } else {
                            // Enable 2FA
                            handleEnable2FA();
                          }
                        }}
                        className={`px-6 py-3 rounded-lg text-sm font-bold transition-all duration-300 min-h-[48px] flex items-center justify-center disabled:cursor-not-allowed disabled:opacity-60 ${
                          user?.twoFactorEnabled
                            ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-500/30 hover:bg-red-200 dark:hover:bg-red-500/30 hover:border-red-400 dark:hover:border-red-500/50'
                            : 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border border-green-300 dark:border-green-500/30 hover:bg-green-200 dark:hover:bg-green-500/30 hover:border-green-400 dark:hover:border-green-500/50'
                        }`}
                        disabled={is2FALoading}
                      >
                        {is2FALoading ? (
                          <>
                            {t(
                              'account.loginSecurity.twoFactor.actions.loading'
                            )}
                          </>
                        ) : user?.twoFactorEnabled ? (
                          t('account.loginSecurity.twoFactor.actions.disable')
                        ) : (
                          t('account.loginSecurity.twoFactor.actions.enable')
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Disable 2FA Modal */}
      {showDisableModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDisableModal(false);
              setDisablePassword('');
              setDisablePasswordError('');
            }
          }}
        >
          <div className="bg-white dark:bg-black/20 backdrop-blur-sm rounded-xl p-6 max-w-md w-full mx-4 border border-gray-200 dark:border-white/10 shadow-none">
            <h3
              className={`text-lg font-semibold text-black dark:text-white mb-4 ${
                locale === 'ar' ? 'text-right' : 'text-left'
              }`}
            >
              {t('account.loginSecurity.twoFactor.disableModal.title')}
            </h3>
            <p
              className={`text-gray-600 dark:text-gray-300 mb-6 ${
                locale === 'ar' ? 'text-right' : 'text-left'
              }`}
            >
              {t('account.loginSecurity.twoFactor.disableModal.message')}
            </p>
            <div className="space-y-6">
              {/* Hidden dummy fields to prevent auto-fill */}
              <div className="hidden">
                <label htmlFor="hidden-username-modal" className="sr-only">
                  Hidden username field
                </label>
                <input 
                  id="hidden-username-modal"
                  type="text" 
                  name="username" 
                  autoComplete="username" 
                  aria-hidden="true"
                  tabIndex={-1}
                />
                <label htmlFor="hidden-password-modal" className="sr-only">
                  Hidden password field
                </label>
                <input 
                  id="hidden-password-modal"
                  type="password" 
                  name="password" 
                  autoComplete="current-password" 
                  aria-hidden="true"
                  tabIndex={-1}
                />
              </div>
              
              <div>
                <div className="relative">
                  <input
                    ref={disablePasswordRef}
                    type="text"
                    value={disablePasswordValue}
                    onChange={(e) => {
                      const value = e.target.value;
                      setDisablePasswordValue(value);
                      setDisablePassword(value);
                      // Switch to password type after user starts typing
                      if (disablePasswordType === 'text' && value.length > 0) {
                        setDisablePasswordType('password');
                      }
                    }}
                    onFocus={() => {
                      // Switch to password type when focused
                      setDisablePasswordType('password');
                    }}
                    placeholder={t(
                      'account.loginSecurity.twoFactor.disableModal.passwordPlaceholder'
                    )}
                    className={`w-full px-4 py-3 rounded-lg text-black dark:text-white focus:bg-gray-50 dark:focus:bg-white/15 transition-all duration-300 text-sm sm:text-base bg-gray-50 dark:bg-white/10 border border-gray-300 dark:border-white/20 placeholder-gray-400 dark:placeholder-white/50 focus:border-purple-600 dark:focus:border-purple-500 ${
                      locale === 'ar' ? 'text-right' : 'text-left'
                    }`}
                    dir={locale === 'ar' ? 'rtl' : 'ltr'}
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
                {disablePasswordError && (
                  <p
                    className={`text-red-600 dark:text-red-400 text-xs mt-1 ${
                      locale === 'ar' ? 'text-right' : 'text-left'
                    }`}
                  >
                    {disablePasswordError}
                  </p>
                )}
              </div>
              <div className={`flex ${locale === 'ar' ? 'gap-4' : 'gap-3'}`}>
                <button
                  onClick={() => {
                    setShowDisableModal(false);
                    setDisablePassword('');
                    setDisablePasswordError('');
                  }}
                  className="flex-1 px-4 py-3 bg-white dark:bg-white/10 border border-gray-300 dark:border-white/20 text-gray-700 dark:text-white rounded-lg hover:shadow-lg hover:shadow-purple-500/10 dark:hover:shadow-purple-500/25 transition-all duration-300 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={is2FALoading}
                >
                  {t('account.loginSecurity.twoFactor.disableModal.cancel')}
                </button>
                <button
                  onClick={handleDisable2FA}
                  className="flex-1 px-4 py-3 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={is2FALoading}
                >
                  {is2FALoading
                    ? t(
                        'account.loginSecurity.twoFactor.disableModal.disabling'
                      )
                    : t('account.loginSecurity.twoFactor.disableModal.disable')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
