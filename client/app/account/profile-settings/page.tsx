'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { LoadingPage } from '../../components/LoadingPage';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  Breadcrumb,
  generateBreadcrumbItems,
} from '../../components/Breadcrumb';
import { HiUser, HiEnvelope } from 'react-icons/hi2';

interface ValidationErrors {
  name?: string;
  recoveryEmail?: string;
}

export default function AccountInformationPage() {
  const { user, isLoading, updateUser } = useAuth();
  const { t, locale } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();

  const [formData, setFormData] = useState({
    name: '',
    recoveryEmail: '',
  });

  const [validationErrors, setValidationErrors] = useState<ValidationErrors>(
    {}
  );
  const [touched, setTouched] = useState({
    name: false,
    recoveryEmail: false,
  });

  const [isFormLoading, setIsFormLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorKey, setErrorKey] = useState('');
  const [successKey, setSuccessKey] = useState('');
  const hasInitialized = useRef(false);

  // Initialize form data only once when user first loads
  useEffect(() => {
    if (user && !hasInitialized.current) {
      setFormData({
        name: user.name || '',
        recoveryEmail: user.recoveryEmail || '',
      });
      hasInitialized.current = true;
    }
  }, [user]); // Depend on user object

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

  // Validation functions
  const validateName = (name: string): string | undefined => {
    if (!name.trim()) {
      return 'account.validation.nameRequired';
    }
    if (name.length > 100) {
      return 'account.validation.nameTooLong';
    }
    return undefined;
  };

  const validateRecoveryEmail = (email: string): string | undefined => {
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return 'account.validation.invalidRecoveryEmail';
    }
    return undefined;
  };

  // Validate all fields
  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};

    const nameError = validateName(formData.name);
    if (nameError) errors.name = nameError;

    const recoveryEmailError = validateRecoveryEmail(formData.recoveryEmail);
    if (recoveryEmailError) errors.recoveryEmail = recoveryEmailError;

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Validate single field
  const validateField = (name: string, value: string) => {
    let error: string | undefined;

    switch (name) {
      case 'name':
        error = validateName(value);
        break;
      case 'recoveryEmail':
        error = validateRecoveryEmail(value);
        break;
    }

    setValidationErrors((prev) => ({
      ...prev,
      [name]: error,
    }));
  };

  // Handle form data changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error when user starts typing
    if (validationErrors[name as keyof ValidationErrors]) {
      setValidationErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  // Handle field blur for validation
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTouched((prev) => ({
      ...prev,
      [name]: true,
    }));
    validateField(name, value);
  };

  // Get input class based on validation state
  const getInputClass = (fieldName: keyof ValidationErrors) => {
    const hasError = touched[fieldName] && validationErrors[fieldName];
    const baseClasses =
      'w-full px-4 py-3 rounded-lg text-white focus:bg-white/15 transition-all duration-300 text-sm sm:text-base';
    const alignmentClasses = locale === 'ar' ? 'text-right' : 'text-left';
    const errorClasses = hasError
      ? 'bg-white/10 border border-red-500/50 placeholder-white/50 focus:border-red-500'
      : 'bg-white/10 border border-white/20 placeholder-white/50 focus:border-purple-500';

    return `${baseClasses} ${alignmentClasses} ${errorClasses}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setErrorKey('');
    setSuccessMessage('');
    setSuccessKey('');
    setIsFormLoading(true);

    // Mark all fields as touched
    setTouched({
      name: true,
      recoveryEmail: true,
    });

    // Validate form before submission
    if (!validateForm()) {
      setIsFormLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          recoveryEmail: formData.recoveryEmail.trim() || null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Update user in context - handle nested user structure
        const userData = data.user?.user || data.user;
        if (userData) {
          updateUser(userData);
          // Directly update form data with the new values
          setFormData({
            name: userData.name || '',
            recoveryEmail: userData.recoveryEmail || '',
          });
        }

        setSuccessKey('account.messages.updateSuccess');
        setSuccessMessage('');
        setError('');
        setErrorKey('');
      } else {
        if (data.messageKey) {
          setErrorKey(data.messageKey);
          setError('');
        } else if (data.message) {
          setError(data.message);
          setErrorKey('');
        } else {
          setErrorKey('account.messages.updateFailed');
          setError('');
        }
      }
    } catch (error) {
      setErrorKey('account.messages.generalError');
      setError('');
    } finally {
      setIsFormLoading(false);
    }
  };

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
            {t('account.profileSettings')}
          </h1>
          <p
            className={`text-sm sm:text-base text-gray-300 mb-8 ${
              locale === 'ar' ? 'text-right' : 'text-left'
            }`}
          >
            {t('account.profileSettingsDesc')}
          </p>

          {/* Form Container */}
          <div className="bg-black/20 backdrop-blur-sm rounded-xl p-6 sm:p-8 border border-white/10 shadow-none">
            {/* Error Message */}
            {(error || errorKey) && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-6 backdrop-blur-sm">
                <p
                  className={`text-red-400 text-sm ${
                    locale === 'ar' ? 'text-right' : 'text-left'
                  }`}
                >
                  {error || (errorKey ? t(errorKey) : '')}
                </p>
              </div>
            )}

            {/* Success Message */}
            {(successMessage || successKey) && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 mb-6 backdrop-blur-sm">
                <p
                  className={`text-green-400 text-sm ${
                    locale === 'ar' ? 'text-right' : 'text-left'
                  }`}
                >
                  {successMessage || (successKey ? t(successKey) : '')}
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name Field */}
              <div>
                <label
                  htmlFor="name"
                  className={`block text-sm font-medium text-white/80 mb-2 ${
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
                  value={formData.name}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  className={getInputClass('name')}
                  placeholder={t('account.form.fullNamePlaceholder')}
                  dir={locale === 'ar' ? 'rtl' : 'ltr'}
                />
                {touched.name && validationErrors.name && (
                  <p
                    className={`text-red-400 text-xs mt-1 ${
                      locale === 'ar' ? 'text-right' : 'text-left'
                    }`}
                  >
                    {t(validationErrors.name)}
                  </p>
                )}
              </div>

              {/* Recovery Email Field */}
              <div>
                <label
                  htmlFor="recoveryEmail"
                  className={`block text-sm font-medium text-white/80 mb-2 ${
                    locale === 'ar' ? 'text-right' : 'text-left'
                  }`}
                >
                  <div
                    className={`flex items-center ${
                      locale === 'ar' ? 'flex-row-reverse' : ''
                    }`}
                  >
                    {HiEnvelope({
                      className: `w-4 h-4 ${locale === 'ar' ? 'ml-2' : 'mr-2'}`,
                    })}
                    {t('account.form.recoveryEmail')}
                  </div>
                </label>
                <input
                  type="text"
                  id="recoveryEmail"
                  name="recoveryEmail"
                  value={formData.recoveryEmail}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  className={getInputClass('recoveryEmail')}
                  placeholder={t('account.form.recoveryEmailPlaceholder')}
                  dir={locale === 'ar' ? 'rtl' : 'ltr'}
                />
                {touched.recoveryEmail && validationErrors.recoveryEmail && (
                  <p
                    className={`text-red-400 text-xs mt-1 ${
                      locale === 'ar' ? 'text-right' : 'text-left'
                    }`}
                  >
                    {t(validationErrors.recoveryEmail)}
                  </p>
                )}
                <p
                  className={`text-white/50 text-xs mt-1 ${
                    locale === 'ar' ? 'text-right' : 'text-left'
                  }`}
                >
                  {t('account.form.recoveryEmailHelp')}
                </p>
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isFormLoading}
                  className="w-full bg-white text-black font-semibold py-3 px-6 rounded-lg hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 text-sm sm:text-base disabled:cursor-not-allowed min-h-[48px] flex items-center justify-center"
                >
                  {isFormLoading ? (
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
                      {t('account.form.updating')}
                    </>
                  ) : (
                    t('account.form.updateProfile')
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
