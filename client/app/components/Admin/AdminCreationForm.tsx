'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useBackendMessageTranslation } from '../../hooks/useBackendMessageTranslation';
import { buildApiUrl, API_CONFIG } from '../../config/api';
import { logInfo, logError } from '../../utils/errorLogger';
import { optimizedApi } from '../../services/optimized-api.service';

interface AdminUser {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface AdminCreationFormProps {
  onSuccess?: () => void;
}

export default function AdminCreationForm({
  onSuccess,
}: AdminCreationFormProps) {
  const { t, locale } = useLanguage();
  const { isDark } = useTheme();
  const {
    error,
    success,
    errorKey,
    successKey,
    setBackendError,
    setBackendSuccess,
    clearMessages,
    clearError,
    clearSuccess,
  } = useBackendMessageTranslation();

  const [formData, setFormData] = useState<AdminUser>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
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

    // Clear validation error when user starts typing
    if (validationErrors[name as keyof typeof validationErrors]) {
      setValidationErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }

    // Clear backend error when user starts typing
    if (error) {
      clearError();
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

  // Handle specific error types based on errorKey
  useEffect(() => {
    if (errorKey) {
      // Handle specific error types that might require special UI treatment
      switch (errorKey) {
        case 'auth.messages.userAlreadyExists':
          // Could highlight the email field or show additional context
          break;
        case 'auth.admin.validation.insufficientPermissions':
          // Could show a different message or redirect
          break;
        case 'auth.admin.networkError':
          // Could show retry button or different styling
          break;
        default:
          // Handle other error types
          break;
      }
    }
  }, [errorKey]);

  // Handle field blur for validation
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTouched((prev) => ({
      ...prev,
      [name]: true,
    }));
    validateField(name, value);
  };

  // Get input class based on validation state and theme
  const getInputClass = (fieldName: keyof typeof validationErrors) => {
    const hasError = touched[fieldName] && validationErrors[fieldName];

    if (isDark) {
      return hasError
        ? 'w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/10 border border-red-400 rounded-lg text-white placeholder-white/50 focus:border-red-400 focus:bg-white/15 transition-all duration-300 text-sm sm:text-base'
        : 'w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:border-purple-400 focus:bg-white/15 transition-all duration-300 text-sm sm:text-base';
    } else {
      return hasError
        ? 'w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 border border-red-500 rounded-lg text-gray-900 placeholder-gray-500 focus:border-red-500 focus:bg-white transition-all duration-300 text-sm sm:text-base'
        : 'w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:border-purple-600 focus:bg-white transition-all duration-300 text-sm sm:text-base';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    clearMessages();

    // Log form submission attempt
    logInfo('Admin creation form submission', {
      component: 'AdminCreationForm',
      action: 'handleSubmit',
      metadata: { email: formData.email },
    });

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
      logInfo('Admin creation form validation failed', {
        component: 'AdminCreationForm',
        action: 'handleSubmit',
        metadata: { errors },
      });
      setIsLoading(false);
      return;
    }

    try {
      const response = await optimizedApi.post(
        API_CONFIG.ENDPOINTS.USERS.CREATE_USER,
        formData,
        {
          component: 'AdminCreationForm',
          action: 'createAdmin',
          metadata: { email: formData.email },
        }
      );

      if (response.success && response.data) {
        // Use setBackendSuccess which automatically maps to translation keys
        setBackendSuccess(
          response.data.message || 'Admin user created successfully!'
        );

        // Log successful admin creation
        logInfo('Admin user created successfully', {
          component: 'AdminCreationForm',
          action: 'createAdmin',
          metadata: {
            email: formData.email,
            adminId: response.data.user?.id,
          },
        });

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
          clearSuccess();
          // Call onSuccess callback if provided
          if (onSuccess) {
            onSuccess();
          }
        }, 3000);
      } else {
        // Use setBackendError which automatically maps to translation keys
        setBackendError(response.error || 'Server error');

        // Log admin creation failure
        logError(
          'Admin user creation failed',
          new Error(response.error || 'Unknown error'),
          {
            component: 'AdminCreationForm',
            action: 'createAdmin',
            metadata: { email: formData.email },
          }
        );
      }
    } catch (error) {
      // Use setBackendError for network errors - it will map to appropriate translation key
      logError(
        'Admin creation form submission failed',
        error instanceof Error ? error : new Error(String(error)),
        {
          component: 'AdminCreationForm',
          action: 'handleSubmit',
          metadata: { email: formData.email },
        }
      );
      setBackendError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 py-3 sm:py-4 md:py-6 lg:py-8 xl:py-10">
      <div className="w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg">
        {/* Header */}
        <div className="text-center mb-4 sm:mb-6 md:mb-8">
          <h1
            className={`text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold mb-2 ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}
          >
            {t('auth.admin.createAdminUser')}
          </h1>
          <p
            className={`text-xs sm:text-sm md:text-base ${
              isDark ? 'text-white/70' : 'text-gray-600'
            }`}
          >
            {t('auth.admin.fullSystemAccess')}
          </p>
        </div>

        {/* Message */}
        {(error || success) && (
          <div
            className={`${
              success
                ? isDark
                  ? 'bg-green-500/10 border border-green-400/30'
                  : 'bg-green-50 border border-green-300'
                : isDark
                ? 'bg-red-500/10 border border-red-400/30'
                : 'bg-red-50 border border-red-300'
            } rounded-lg p-2 sm:p-3 mb-3 sm:mb-4`}
          >
            <p
              className={`${
                success
                  ? isDark
                    ? 'text-green-400'
                    : 'text-green-600'
                  : isDark
                  ? 'text-red-400'
                  : 'text-red-600'
              } text-xs sm:text-sm ${locale === 'ar' ? 'text-right' : ''}`}
            >
              {success || error}
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
              className={`block text-xs sm:text-sm font-medium mb-1 sm:mb-2 ${
                isDark ? 'text-white/80' : 'text-gray-700'
              } ${locale === 'ar' ? 'text-right' : ''}`}
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
                className={`text-xs mt-1 ${
                  isDark ? 'text-red-400' : 'text-red-600'
                } ${locale === 'ar' ? 'text-right' : ''}`}
              >
                {validationErrors.name}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="email"
              className={`block text-xs sm:text-sm font-medium mb-1 sm:mb-2 ${
                isDark ? 'text-white/80' : 'text-gray-700'
              } ${locale === 'ar' ? 'text-right' : ''}`}
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
                className={`text-xs mt-1 ${
                  isDark ? 'text-red-400' : 'text-red-600'
                } ${locale === 'ar' ? 'text-right' : ''}`}
              >
                {validationErrors.email}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="password"
              className={`block text-xs sm:text-sm font-medium mb-1 sm:mb-2 ${
                isDark ? 'text-white/80' : 'text-gray-700'
              } ${locale === 'ar' ? 'text-right' : ''}`}
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
                className={`text-xs mt-1 ${
                  isDark ? 'text-red-400' : 'text-red-600'
                } ${locale === 'ar' ? 'text-right' : ''}`}
              >
                {validationErrors.password}
              </p>
            )}
            <p
              className={`text-xs mt-1 ${
                isDark ? 'text-white/50' : 'text-gray-500'
              } ${locale === 'ar' ? 'text-right' : ''}`}
            >
              {t('auth.admin.passwordRequirement')}
            </p>
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className={`block text-xs sm:text-sm font-medium mb-1 sm:mb-2 ${
                isDark ? 'text-white/80' : 'text-gray-700'
              } ${locale === 'ar' ? 'text-right' : ''}`}
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
                className={`text-xs mt-1 ${
                  isDark ? 'text-red-400' : 'text-red-600'
                } ${locale === 'ar' ? 'text-right' : ''}`}
              >
                {validationErrors.confirmPassword}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full font-semibold py-2.5 sm:py-3 md:py-4 px-4 sm:px-6 rounded-lg transition-all duration-300 text-sm sm:text-base disabled:cursor-not-allowed min-h-[44px] sm:min-h-[48px] flex items-center justify-center ${
              isDark
                ? 'bg-purple-600 hover:bg-purple-700 disabled:bg-purple-500 text-white hover:shadow-lg hover:shadow-purple-500/25'
                : 'bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white hover:shadow-lg hover:shadow-purple-500/25'
            }`}
          >
            {isLoading ? (
              <>{t('auth.admin.creatingAdmin')}</>
            ) : (
              t('auth.admin.createAdminUser')
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
