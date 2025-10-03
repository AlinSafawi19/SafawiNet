'use client';

import { useState, useCallback, useMemo } from 'react';
import { API_CONFIG, buildApiUrl } from '../../config/api';
import MessageDisplay from '../MessageDisplay';

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
  const [formData, setFormData] = useState<AdminUser>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const [adminCreationSuccessMessage, setAdminCreationSuccessMessage] =
    useState<string | undefined>(undefined);
  const [adminCreationErrorMessage, setAdminCreationErrorMessage] = useState<
    string | undefined
  >(undefined);

  // Validation state for admin creation form
  const [validationErrors, setValidationErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  // Validation functions (same as AuthForm)
  const validateName = (name: string): string | undefined => {
    if (!name || name.trim().length === 0) {
      return 'Name is required';
    }
      if (name.length < 1) {
      return 'Name must be 1 character or more';
    }
    if (name.length > 100) {
      return 'Name must be 100 characters or less';
    }
    return undefined;
  };

  const validateEmail = (email: string): string | undefined => {
    if (!email || email.trim().length === 0) {
      return 'Email is required';
    }
    if (email.length > 255) {
      return 'Email must be 255 characters or less';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Invalid email format';
    }
    return undefined;
  };

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

  // Handle input changes with validation clearing
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));

      // Clear messages when user starts typing
      setAdminCreationErrorMessage(undefined);
      setAdminCreationSuccessMessage(undefined);

      // Clear validation error for this field
      const fieldName = name as keyof typeof validationErrors;
      if (validationErrors[fieldName]) {
        setValidationErrors(prev => ({
          ...prev,
          [fieldName]: undefined
        }));
      }
    },
    [validationErrors]
  );

  // Handle validation on blur
  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
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
          // Also re-validate confirmPassword if it has a value
          if (formData.confirmPassword) {
            const confirmPasswordError = validateConfirmPassword(
              value,
              formData.confirmPassword
            );
            setValidationErrors(prev => ({
              ...prev,
              confirmPassword: confirmPasswordError
            }));
          }
          break;
        case 'confirmPassword':
          error = validateConfirmPassword(
            formData.password,
            value
          );
          break;
      }

      if (error) {
        setValidationErrors(prev => ({
          ...prev,
          [name]: error
        }));
      }
    },
    [formData.password, formData.confirmPassword]
  );

  // Memoize input class to prevent recreation on every render
  const inputClassName = useMemo(
    () =>
      'w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:border-purple-600 focus:bg-white transition-all duration-300 text-sm sm:text-base',
    []
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields before submission
    const nameError = validateName(formData.name);
    const emailError = validateEmail(formData.email);
    const passwordError = validatePassword(formData.password);
    const confirmPasswordError = validateConfirmPassword(
      formData.password,
      formData.confirmPassword
    );

    const validationErrors = {
      name: nameError,
      email: emailError,
      password: passwordError,
      confirmPassword: confirmPasswordError,
    };

    setValidationErrors(validationErrors);

    // If there are any validation errors, don't submit
    if (nameError || emailError || passwordError || confirmPasswordError) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(
        buildApiUrl(API_CONFIG.ENDPOINTS.USERS.CREATE_USER),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(formData),
        }
      );

      const data = await response.json();

      if (response.ok && data) {
        console.log('✅ AdminCreationForm: Admin created successfully', {
          message: data.message,
        });
        setAdminCreationSuccessMessage(
          data.message || 'Admin user created successfully'
        );

        // Reset form
        setFormData({ name: '', email: '', password: '', confirmPassword: '' });

        // Clear success message after a delay to show it briefly
        setTimeout(() => {
          // Call onSuccess callback if provided
          if (onSuccess) {
            onSuccess();
          }
        }, 3000);
      } else {
        console.warn('❌ AdminCreationForm: Admin creation failed', {
          message: data.error || data.message,
        });
        setAdminCreationErrorMessage(
          data.error ||
            data.message ||
            'Failed to create admin user. Please try again.'
        );
      }
    } catch (error) {
      console.error('💥 AdminCreationForm: Admin creation error caught', error);
      setAdminCreationErrorMessage(
        error instanceof Error
          ? error.message
          : 'An unexpected error occurred. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 py-3 sm:py-4 md:py-6 lg:py-8 xl:py-10">
      <div className="w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg">
        {/* Header */}
        <div className="text-center mb-4 sm:mb-6 md:mb-8">
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl text-gray-900 font-bold mb-2">
            Create Admin User
          </h1>
          <p className="text-xs sm:text-sm md:text-base text-gray-600">
            Full system access
          </p>
        </div>

        {/* Messages */}
        <MessageDisplay
          successMessage={adminCreationSuccessMessage}
          errorMessage={adminCreationErrorMessage}
          className="mb-4"
        />

        {/* Admin Creation Form */}
        <form
          onSubmit={handleSubmit}
          className="space-y-3 sm:space-y-4 md:space-y-6"
        >
          <div>
            <label
              htmlFor="name"
              className="block text-xs sm:text-sm font-medium mb-1 sm:mb-2 text-gray-700"
            >
              Full Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              onBlur={handleBlur}
              className={`${inputClassName} ${
                validationErrors.name
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
                  : ''
              }`}
              placeholder={'Full Name'}
              autoComplete="off"
              disabled={isLoading}
            />
            {validationErrors.name && (
              <p className="mt-1 text-sm text-red-600">
                {validationErrors.name}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-xs sm:text-sm font-medium mb-1 sm:mb-2 text-gray-700"
            >
              Email Address
            </label>
            <input
              type="text"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              onBlur={handleBlur}
              className={`${inputClassName} ${
                validationErrors.email
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
                  : ''
              }`}
              placeholder={'Email Address'}
              autoComplete="off"
              disabled={isLoading}
            />
            {validationErrors.email && (
              <p className="mt-1 text-sm text-red-600">
                {validationErrors.email}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs sm:text-sm font-medium mb-1 sm:mb-2 text-gray-700"
            >
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              onBlur={handleBlur}
              className={`${inputClassName} ${
                validationErrors.password
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
                  : ''
              }`}
              placeholder={'Password (minimum 8 characters)'}
              autoComplete="new-password"
              disabled={isLoading}
            />
            {validationErrors.password && (
              <p className="mt-1 text-sm text-red-600">
                {validationErrors.password}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-xs sm:text-sm font-medium mb-1 sm:mb-2 text-gray-700"
            >
              Confirm Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              onBlur={handleBlur}
              className={`${inputClassName} ${
                validationErrors.confirmPassword
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
                  : ''
              }`}
              placeholder={'Confirm Password'}
              autoComplete="new-password"
              disabled={isLoading}
            />
            {validationErrors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600">
                {validationErrors.confirmPassword}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full font-semibold py-2.5 sm:py-3 md:py-4 px-4 sm:px-6 rounded-lg transition-all duration-300 text-sm sm:text-base disabled:cursor-not-allowed min-h-[44px] sm:min-h-[48px] flex items-center justify-center bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white hover:shadow-lg hover:shadow-purple-500/25"
          >
            {isLoading ? 'Creating Admin...' : 'Create Admin User'}
          </button>
        </form>
      </div>
    </div>
  );
}
