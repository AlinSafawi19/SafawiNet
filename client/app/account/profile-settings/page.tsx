'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { LoadingPage } from '../../components/LoadingPage';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  Breadcrumb,
  useBreadcrumbItems,
} from '../../components/Breadcrumb';
import { HiUser, HiEnvelope } from 'react-icons/hi2';

interface ValidationErrors {
  name?: string;
}

export default function AccountInformationPage() {
  const { user, isLoading, updateUser, authenticatedFetch } = useAuth();
  const { t, locale } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();

  const [formData, setFormData] = useState({
    name: '',
  });

  const [validationErrors, setValidationErrors] = useState<ValidationErrors>(
    {}
  );
  const [touched, setTouched] = useState({
    name: false,
  });

  const [isFormLoading, setIsFormLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorKey, setErrorKey] = useState('');
  const [successKey, setSuccessKey] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);

  // Show page immediately, don't wait for auth loading
  useEffect(() => {
    const startTime = performance.now();
    console.log('🚀 Profile Settings: Component mounting at', startTime);
    
    const endTime = performance.now();
    console.log('🚀 Profile Settings: Page showing after', endTime - startTime, 'ms');
  }, []);

  // Initialize form data when user becomes available
  useEffect(() => {
    if (user && !isInitialized) {
      setFormData({
        name: user.name || '',
      });
      setIsInitialized(true);
    }
  }, [user, isInitialized]);

  useEffect(() => {
    // Redirect unauthenticated users to login
    if (!isLoading && !user) {
      router.push('/auth');
    }
  }, [user, isLoading, router]);

  // Validation functions - memoized for performance
  const validateName = useCallback((name: string): string | undefined => {
    if (!name.trim()) {
      return 'account.validation.nameRequired';
    }
    if (name.length > 100) {
      return 'account.validation.nameTooLong';
    }
    return undefined;
  }, []);

  // Validate all fields
  const validateForm = useCallback((): boolean => {
    const errors: ValidationErrors = {};

    const nameError = validateName(formData.name);
    if (nameError) errors.name = nameError;

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData.name, validateName]);

  // Validate single field
  const validateField = useCallback((name: string, value: string) => {
    let error: string | undefined;

    switch (name) {
      case 'name':
        error = validateName(value);
        break;
    }

    setValidationErrors((prev) => ({
      ...prev,
      [name]: error,
    }));
  }, [validateName]);

  // Handle form data changes - memoized for performance
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
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
  }, [validationErrors]);

  // Handle field blur for validation - memoized for performance
  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTouched((prev) => ({
      ...prev,
      [name]: true,
    }));
    validateField(name, value);
  }, [validateField]);

  // Get input class based on validation state - memoized for performance
  const getInputClass = useCallback((fieldName: keyof ValidationErrors) => {
    const hasError = touched[fieldName] && validationErrors[fieldName];
    const baseClasses =
      'w-full px-4 py-3 rounded-lg text-white focus:bg-white/15 transition-all duration-300 text-sm sm:text-base';
    const alignmentClasses = locale === 'ar' ? 'text-right' : 'text-left';
    const errorClasses = hasError
      ? 'bg-white/10 border border-red-500/50 placeholder-white/50 focus:border-red-500'
      : 'bg-white/10 border border-white/20 placeholder-white/50 focus:border-purple-500';

    return `${baseClasses} ${alignmentClasses} ${errorClasses}`;
  }, [touched, validationErrors, locale]);

  // Generate breadcrumb items - must be called before any conditional returns
  const breadcrumbItems = useBreadcrumbItems(pathname, t, locale);

  // Show skeleton while form initializes - don't wait for user data
  if (!isInitialized) {
    return (
      <div className="min-h-screen account-bg">
        <div className="p-4 sm:p-6 lg:p-8 xl:p-12">
          <div className="account max-w-4xl mx-auto">
            {/* Breadcrumb Skeleton */}
            <div className="mb-6">
              <div className="h-4 bg-white/20 rounded w-48 animate-pulse"></div>
            </div>

            {/* Title Skeleton */}
            <div className="mb-3">
              <div className="h-8 bg-white/20 rounded w-64 animate-pulse"></div>
            </div>
            <div className="mb-8">
              <div className="h-4 bg-white/20 rounded w-96 animate-pulse"></div>
            </div>

            {/* Form Skeleton */}
            <div className="bg-black/20 backdrop-blur-sm rounded-xl p-6 sm:p-8 border border-white/10 shadow-none">
              <div className="space-y-6">
                <div>
                  <div className="h-4 bg-white/20 rounded w-24 mb-2 animate-pulse"></div>
                  <div className="h-12 bg-white/20 rounded animate-pulse"></div>
                </div>
                <div className="pt-4">
                  <div className="h-12 bg-white/20 rounded animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show loading only if auth is still loading and we don't have user data
  if (isLoading && !user) {
    return (
      <div className="min-h-screen account-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white/70">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render anything if user is not authenticated (will redirect)
  if (!user) {
    return null;
  }


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
    });

    // Validate form before submission
    if (!validateForm()) {
      setIsFormLoading(false);
      return;
    }

    try {
      const response = await authenticatedFetch('/api/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
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
            <Breadcrumb items={breadcrumbItems} />
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
