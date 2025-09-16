'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { buildApiUrl, API_CONFIG } from '../../config/api';

interface AdminUser {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export default function AdminCreationForm() {
  const { t, locale } = useLanguage();
  const [formData, setFormData] = useState<AdminUser>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [errorKey, setErrorKey] = useState<string>('');
  const [successKey, setSuccessKey] = useState<string>('');
  const [validationErrors, setValidationErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [touched, setTouched] = useState({
    name: false,
    email: false,
    password: false,
    confirmPassword: false,
  });

  // Validation functions
  const validateEmail = useCallback(
    (email: string): string | undefined => {
      if (!email.trim()) {
        return t('auth.admin.validation.emailRequired');
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return t('auth.admin.validation.emailInvalid');
      }
      return undefined;
    },
    [t]
  );

  const validatePassword = useCallback(
    (password: string): string | undefined => {
      if (!password.trim()) {
        return t('auth.admin.validation.passwordRequired');
      }
      if (password.length < 8) {
        return t('auth.admin.validation.passwordTooShort');
      }
      return undefined;
    },
    [t]
  );

  const validateName = useCallback(
    (name: string): string | undefined => {
      if (!name.trim()) {
        return t('auth.admin.validation.nameRequired');
      }
      if (name.length > 100) {
        return t('auth.admin.validation.nameTooLong');
      }
      return undefined;
    },
    [t]
  );

  const validateConfirmPassword = useCallback(
    (password: string, confirmPassword: string): string | undefined => {
      if (!confirmPassword.trim()) {
        return t('auth.admin.validation.confirmPasswordRequired');
      }
      if (password !== confirmPassword) {
        return t('auth.admin.validation.passwordsDoNotMatch');
      }
      return undefined;
    },
    [t]
  );

  // Validate single field
  const validateField = useCallback(
    (name: string, value: string) => {
      let error: string | undefined;

      switch (name) {
        case 'name':
          error = validateName(value);
          break;
        case 'email':
          error = validateEmail(value);
          break;
        case 'password':
          error = validatePassword(value);
          break;
        case 'confirmPassword':
          error = validateConfirmPassword(formData.password, value);
          break;
      }

      setValidationErrors((prev) => ({
        ...prev,
        [name]: error,
      }));
    },
    [
      validateName,
      validateEmail,
      validatePassword,
      validateConfirmPassword,
      formData.password,
    ]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error when user starts typing
    if (validationErrors[name as keyof typeof validationErrors]) {
      setValidationErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  // Re-validate all fields with current language
  const revalidateAllFields = useCallback(() => {
    const nameError = validateName(formData.name);
    const emailError = validateEmail(formData.email);
    const passwordError = validatePassword(formData.password);
    const confirmPasswordError = validateConfirmPassword(
      formData.password,
      formData.confirmPassword
    );

    setValidationErrors({
      name: nameError,
      email: emailError,
      password: passwordError,
      confirmPassword: confirmPasswordError,
    });
  }, [
    formData.name,
    formData.email,
    formData.password,
    formData.confirmPassword,
    validateName,
    validateEmail,
    validatePassword,
    validateConfirmPassword,
  ]);

  // Helper function to map server error messages to translation keys
  const mapServerErrorToTranslationKey = (
    serverMessage: string
  ): string | null => {
    const errorMapping: { [key: string]: string } = {
      'User already exists': 'auth.messages.userAlreadyExists',
      'User with this email already exists': 'auth.messages.userAlreadyExists',
      'Email already exists': 'auth.messages.userAlreadyExists',
      'Invalid email format': 'auth.messages.invalidEmailFormat',
      'Password too weak': 'auth.messages.passwordTooWeak',
      'Name is required': 'auth.messages.nameRequired',
      'Email is required': 'auth.messages.emailRequired',
      'Password is required': 'auth.messages.passwordRequired',
      'Network error': 'auth.messages.networkError',
      'Server error': 'auth.messages.serverError',
    };

    return errorMapping[serverMessage] || null;
  };

  // Re-validate errors when language changes
  useEffect(() => {
    // Re-validate all fields with new language instead of clearing errors
    if (Object.keys(validationErrors).length > 0) {
      // Small delay to ensure translation context is fully updated
      const timeoutId = setTimeout(() => {
        revalidateAllFields();
      }, 100);

      return () => clearTimeout(timeoutId);
    }
    // Keep touched state and message, only re-validate errors
  }, [locale, t, revalidateAllFields, validationErrors]);

  // Handle language changes for backend error messages and success messages
  useEffect(() => {
    // If there's an errorKey or successKey, it will automatically be re-translated when the component re-renders
    // because we're using t(errorKey) and t(successKey) in the JSX. No additional action needed here.
  }, [locale, t, errorKey, successKey]);

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
  const getInputClass = (fieldName: keyof typeof validationErrors) => {
    const hasError = touched[fieldName] && validationErrors[fieldName];
    return hasError
      ? 'w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/10 border border-red-500/50 rounded-lg text-white placeholder-white/50 focus:border-red-500 focus:bg-white/15 transition-all duration-300 text-sm sm:text-base'
      : 'w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:border-purple-500 focus:bg-white/15 transition-all duration-300 text-sm sm:text-base';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);
    setErrorKey('');
    setSuccessKey('');

    // Mark all fields as touched
    setTouched({
      name: true,
      email: true,
      password: true,
      confirmPassword: true,
    });

    // Validate all fields
    const nameError = validateName(formData.name);
    const emailError = validateEmail(formData.email);
    const passwordError = validatePassword(formData.password);
    const confirmPasswordError = validateConfirmPassword(
      formData.password,
      formData.confirmPassword
    );

    const errors = {
      name: nameError,
      email: emailError,
      password: passwordError,
      confirmPassword: confirmPasswordError,
    };

    setValidationErrors(errors);

    // Check if there are any validation errors
    if (Object.values(errors).some((error) => error)) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.USERS.CREATE_USER), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const result = await response.json();
        setSuccessKey('auth.admin.adminUserCreated');
        setMessage(null);
        setErrorKey('');
        // Reset form
        setFormData({ name: '', email: '', password: '', confirmPassword: '' });
        setValidationErrors({});
        setTouched({
          name: false,
          email: false,
          password: false,
          confirmPassword: false,
        });
        // Clear success message after a delay to show it briefly
        setTimeout(() => {
          setSuccessKey('');
        }, 3000);
      } else {
        const errorData = await response.json();
        const serverMessage = errorData.message || 'Server error';
        const translationKey = mapServerErrorToTranslationKey(serverMessage);

        if (translationKey) {
          setErrorKey(translationKey);
          setMessage(null);
        } else {
          setMessage({
            type: 'error',
            text: serverMessage,
          });
          setErrorKey('');
        }
      }
    } catch (error) {
      setErrorKey('auth.messages.networkError');
      setMessage(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 py-3 sm:py-4 md:py-6 lg:py-8 xl:py-10">
      <div className="w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg">
        {/* Header */}
        <div className="text-center mb-4 sm:mb-6 md:mb-8">
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-white mb-2">
            {t('auth.admin.createAdmin')}
          </h1>
          <p className="text-white/70 text-xs sm:text-sm md:text-base">
            {t('auth.admin.createAdminSubtitle')}
          </p>
        </div>

        {/* Message */}
        {(message || errorKey || successKey) && (
          <div
            className={`${
              message?.type === 'success' || successKey
                ? 'bg-green-500/10 border border-green-500/20'
                : 'bg-red-500/10 border border-red-500/20'
            } rounded-lg p-2 sm:p-3 mb-3 sm:mb-4`}
          >
            <p
              className={`${
                message?.type === 'success' || successKey
                  ? 'text-green-400'
                  : 'text-red-400'
              } text-xs sm:text-sm ${locale === 'ar' ? 'text-right' : ''}`}
            >
              {message?.text ||
                (errorKey ? t(errorKey) : '') ||
                (successKey ? t(successKey) : '')}
            </p>
          </div>
        )}

        {/* Admin Creation Form */}
        <form
          onSubmit={handleSubmit}
          className="space-y-3 sm:space-y-4 md:space-y-6"
        >
          <div>
            <label
              htmlFor="name"
              className={`block text-xs sm:text-sm font-medium text-white/80 mb-1 sm:mb-2 ${
                locale === 'ar' ? 'text-right' : ''
              }`}
            >
              {t('auth.admin.fullName')}
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              onBlur={handleBlur}
              className={`${getInputClass('name')} ${
                locale === 'ar' ? 'text-right' : ''
              }`}
              placeholder={t('auth.admin.fullNamePlaceholder')}
              autoComplete="off"
            />
            {touched.name && validationErrors.name && (
              <p
                className={`text-red-400 text-xs mt-1 ${
                  locale === 'ar' ? 'text-right' : ''
                }`}
              >
                {validationErrors.name}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="email"
              className={`block text-xs sm:text-sm font-medium text-white/80 mb-1 sm:mb-2 ${
                locale === 'ar' ? 'text-right' : ''
              }`}
            >
              {t('auth.admin.emailAddress')}
            </label>
            <input
              type="text"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              onBlur={handleBlur}
              className={`${getInputClass('email')} ${
                locale === 'ar' ? 'text-right' : ''
              }`}
              placeholder={t('auth.admin.emailPlaceholder')}
              autoComplete="off"
            />
            {touched.email && validationErrors.email && (
              <p
                className={`text-red-400 text-xs mt-1 ${
                  locale === 'ar' ? 'text-right' : ''
                }`}
              >
                {validationErrors.email}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="password"
              className={`block text-xs sm:text-sm font-medium text-white/80 mb-1 sm:mb-2 ${
                locale === 'ar' ? 'text-right' : ''
              }`}
            >
              {t('auth.admin.password')}
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              onBlur={handleBlur}
              className={`${getInputClass('password')} ${
                locale === 'ar' ? 'text-right' : ''
              }`}
              placeholder={t('auth.admin.passwordPlaceholder')}
              autoComplete="new-password"
            />
            {touched.password && validationErrors.password && (
              <p
                className={`text-red-400 text-xs mt-1 ${
                  locale === 'ar' ? 'text-right' : ''
                }`}
              >
                {validationErrors.password}
              </p>
            )}
            <p
              className={`text-white/50 text-xs mt-1 ${
                locale === 'ar' ? 'text-right' : ''
              }`}
            >
              {t('auth.admin.passwordRequirement')}
            </p>
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className={`block text-xs sm:text-sm font-medium text-white/80 mb-1 sm:mb-2 ${
                locale === 'ar' ? 'text-right' : ''
              }`}
            >
              {t('auth.admin.confirmPassword')}
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              onBlur={handleBlur}
              className={`${getInputClass('confirmPassword')} ${
                locale === 'ar' ? 'text-right' : ''
              }`}
              placeholder={t('auth.admin.confirmPasswordPlaceholder')}
              autoComplete="new-password"
            />
            {touched.confirmPassword && validationErrors.confirmPassword && (
              <p
                className={`text-red-400 text-xs mt-1 ${
                  locale === 'ar' ? 'text-right' : ''
                }`}
              >
                {validationErrors.confirmPassword}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-semibold py-2.5 sm:py-3 md:py-4 px-4 sm:px-6 rounded-lg hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 text-sm sm:text-base disabled:cursor-not-allowed min-h-[44px] sm:min-h-[48px] flex items-center justify-center"
          >
            {isLoading ? (
              <>{t('auth.admin.creatingAdmin')}</>
            ) : (
              t('auth.admin.createAdminUser')
            )}
          </button>
        </form>

        {/* Info */}
        <div className="text-center mt-3 sm:mt-4 md:mt-6">
          <p className="text-white/50 text-xs sm:text-sm">
            {t('auth.admin.fullSystemAccess')}
          </p>
        </div>
      </div>
    </div>
  );
}
