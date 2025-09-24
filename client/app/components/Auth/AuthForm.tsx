'use client';

import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useRouter } from 'next/navigation';
import { LoadingPage } from '../LoadingPage';
import { useBackendMessageTranslation } from '../../hooks/useBackendMessageTranslation';

interface ValidationErrors {
  email?: string; // Translation key
  password?: string; // Translation key
}

interface RegisterValidationErrors {
  name?: string; // Translation key
  email?: string; // Translation key
  password?: string; // Translation key
  confirmPassword?: string; // Translation key
}

const AuthForm = memo(function AuthForm() {
  const { login, loginWith2FA, register, user, isLoading } = useAuth();
  const { t, locale } = useLanguage();
  const router = useRouter();
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Use the new backend message translation hook
  const {
    error,
    success: successMessage,
    errorKey,
    successKey,
    setError,
    setErrorKey,
    setSuccessKey,
    setBackendError,
    setBackendSuccess,
    clearMessages,
    clearError,
  } = useBackendMessageTranslation();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>(
    {}
  );
  const [touched, setTouched] = useState({
    email: false,
    password: false,
  });

  // Register form state
  const [registerData, setRegisterData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [registerValidationErrors, setRegisterValidationErrors] = useState<RegisterValidationErrors>({});
  const [registerTouched, setRegisterTouched] = useState({
    name: false,
    email: false,
    password: false,
    confirmPassword: false,
  });
  const [isRegisterLoading, setIsRegisterLoading] = useState(false);

  // 2FA state
  const [show2FAForm, setShow2FAForm] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorUserId, setTwoFactorUserId] = useState('');
  const [is2FALoading, setIs2FALoading] = useState(false);

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  // Component initialization logging - only once (reduced logging for performance)
  const hasInitialized = useRef(false);
  useEffect(() => {
    if (!hasInitialized.current && process.env.NODE_ENV === 'development') {
      hasInitialized.current = true;
    }
  }, []);

  // State change logging - only log significant state changes
  const prevState = useRef({
    isFormLoading,
    isRedirecting,
    show2FAForm,
    hasUser: !!user,
    isLoading,
    hasError: !!(error || errorKey),
    hasSuccess: !!(successMessage || successKey)
  });

  useEffect(() => {
    const currentState = {
      isFormLoading,
      isRedirecting,
      show2FAForm,
      hasUser: !!user,
      isLoading,
      hasError: !!(error || errorKey),
      hasSuccess: !!(successMessage || successKey)
    };

    const hasSignificantStateChange = Object.keys(currentState).some(
      key => prevState.current[key as keyof typeof currentState] !== currentState[key as keyof typeof currentState]
    );

    if (hasSignificantStateChange) {
      prevState.current = currentState;
    }
  }, [isFormLoading, isRedirecting, show2FAForm, user, isLoading, error, errorKey, successMessage, successKey]);

  // Redirect logged-in users
  useEffect(() => {    
    if (!isLoading && user) {
      // Check if user has admin role
      const isAdmin = user.roles && user.roles.includes('ADMIN');

      if (isAdmin) {
        // Redirect admin users to admin dashboard
        setIsRedirecting(true);
        router.push('/admin');
      } else {
        // Redirect customer users to home page
        setIsRedirecting(true);
        router.push('/');
      }
    }
  }, [user, isLoading, router]);

  // Consistent input styling for all form fields
  const inputClassName =
    'w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:border-purple-500 focus:bg-white/15 transition-all duration-300 text-sm sm:text-base';

  // Error input styling
  const errorInputClassName =
    'w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/10 border border-red-500/50 rounded-lg text-white placeholder-white/50 focus:border-red-500 focus:bg-white/15 transition-all duration-300 text-sm sm:text-base';

  // Validation functions
  const validateEmail = (email: string): string | undefined => {
    if (!email.trim()) {
      return 'auth.validation.emailRequired';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'auth.validation.emailInvalid';
    }
    return undefined;
  };

  const validatePassword = (password: string): string | undefined => {
    if (!password.trim()) {
      return 'auth.validation.passwordRequired';
    }
    if (password.length < 8) {
      return 'auth.validation.passwordTooShort';
    }
    return undefined;
  };

  // Register form validation functions
  const validateName = (name: string): string | undefined => {
    if (!name.trim()) {
      return 'auth.validation.nameRequired';
    }
    if (name.trim().length < 1) {
      return 'auth.validation.nameRequired';
    }
    if (name.trim().length > 100) {
      return 'auth.validation.nameTooLong';
    }
    return undefined;
  };

  const validateRegisterEmail = (email: string): string | undefined => {
    if (!email.trim()) {
      return 'auth.validation.emailRequired';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'auth.validation.emailInvalid';
    }
    return undefined;
  };

  const validateRegisterPassword = (password: string): string | undefined => {
    if (!password.trim()) {
      return 'auth.validation.passwordRequired';
    }
    if (password.length < 8) {
      return 'auth.validation.passwordTooShort';
    }
    return undefined;
  };

  const validateConfirmPassword = (confirmPassword: string, password: string): string | undefined => {
    if (!confirmPassword.trim()) {
      return 'auth.validation.confirmPasswordRequired';
    }
    if (confirmPassword !== password) {
      return 'auth.validation.passwordsDoNotMatch';
    }
    return undefined;
  };

  // Validate all fields
  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};

    const emailError = validateEmail(formData.email);
    if (emailError) errors.email = emailError;

    const passwordError = validatePassword(formData.password);
    if (passwordError) errors.password = passwordError;

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Validate single field
  const validateField = (name: string, value: string) => {
    let error: string | undefined;

    switch (name) {
      case 'email':
        error = validateEmail(value);
        break;
      case 'password':
        error = validatePassword(value);
        break;
    }

    setValidationErrors((prev) => ({
      ...prev,
      [name]: error,
    }));
  };

  // Register form validation
  const validateRegisterForm = (): boolean => {
    const errors: RegisterValidationErrors = {};

    const nameError = validateName(registerData.name);
    if (nameError) errors.name = nameError;

    const emailError = validateRegisterEmail(registerData.email);
    if (emailError) errors.email = emailError;

    const passwordError = validateRegisterPassword(registerData.password);
    if (passwordError) errors.password = passwordError;

    const confirmPasswordError = validateConfirmPassword(registerData.confirmPassword, registerData.password);
    if (confirmPasswordError) errors.confirmPassword = confirmPasswordError;

    setRegisterValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Validate single register field
  const validateRegisterField = (name: string, value: string) => {
    let error: string | undefined;

    switch (name) {
      case 'name':
        error = validateName(value);
        break;
      case 'email':
        error = validateRegisterEmail(value);
        break;
      case 'password':
        error = validateRegisterPassword(value);
        break;
      case 'confirmPassword':
        error = validateConfirmPassword(value, registerData.password);
        break;
    }

    setRegisterValidationErrors((prev) => ({
      ...prev,
      [name]: error,
    }));
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    clearError();
    setIsFormLoading(true);

    // Mark all fields as touched
    setTouched({
      email: true,
      password: true,
    });

    // Validate form before submission
    if (!validateForm()) {
      setIsFormLoading(false);
      return;
    }

    try {
      const result = await login(formData.email, formData.password);
        if (result.success) {
          // User is verified, check role and redirect accordingly
          const currentUser = result.user;

          // More robust role checking - handle different possible role field structures
          const roles =
            currentUser?.roles ||
            (currentUser as any)?.role ||
            (currentUser as any)?.userRoles ||
            (currentUser as any)?.userRole;

          const hasAdminRole =
            currentUser &&
            roles &&
            (Array.isArray(roles)
              ? roles.includes('ADMIN')
              : typeof roles === 'string'
              ? roles === 'ADMIN'
              : false);

          if (hasAdminRole) {
            try {
              router.push('/admin');
            } catch (error) {
              window.location.href = '/admin';
            }
          } else {
            // Try router.push first, fallback to window.location if needed
            try {
              router.push('/');
            } catch (error) {
              window.location.href = '/';
            }

            // Fallback redirect after a short delay
            setTimeout(() => {
              if (window.location.pathname === '/auth') {
                window.location.href = '/';
              }
            }, 1000);
          }
        } else if (result.requiresTwoFactor) {
          // Show 2FA form
          setTwoFactorUserId(result.user?.id || '');
          setShow2FAForm(true);
          clearError();
        } else {
          // Handle other login errors
          if (result.messageKey) {
            setErrorKey(result.messageKey);
          } else if (result.message) {
            setBackendError(result.message);
          } else {
            setErrorKey('auth.messages.invalidCredentials');
          }
        }
    } catch (error) {
      setErrorKey('auth.messages.generalError');
    } finally {
      setIsFormLoading(false);
    }
  };

  // Handle 2FA form submission
  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    clearError();
    setIs2FALoading(true);

    if (!twoFactorCode.trim()) {
      setErrorKey('auth.twoFactor.codeRequired');
      setIs2FALoading(false);
      return;
    }

    try {
      const result = await loginWith2FA(twoFactorUserId, twoFactorCode);

      if (result.success) {
        // 2FA successful, redirect based on role
        const currentUser = result.user;
        const roles =
          currentUser?.roles ||
          (currentUser as any)?.role ||
          (currentUser as any)?.userRoles ||
          (currentUser as any)?.userRole;
        const hasAdminRole =
          currentUser &&
          roles &&
          (Array.isArray(roles)
            ? roles.includes('ADMIN')
            : typeof roles === 'string'
            ? roles === 'ADMIN'
            : false);

        if (hasAdminRole) {
          router.push('/admin');
        } else {
          router.push('/');
        }
      } else {
        if (result.messageKey) {
          setErrorKey(result.messageKey);
        } else if (result.message) {
          setBackendError(result.message);
        } else {
          setErrorKey('auth.messages.invalidTwoFactorCode');
        }
      }
    } catch (error) {
      setErrorKey('auth.messages.generalError');
    } finally {
      setIs2FALoading(false);
    }
  };

  // Handle form data changes - optimized to reduce re-renders
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error when user starts typing (only if there's an error)
    if (validationErrors[name as keyof ValidationErrors]) {
      setValidationErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  }, [validationErrors]);

  // Handle register form data changes
  const handleRegisterInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    setRegisterData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error when user starts typing (only if there's an error)
    if (registerValidationErrors[name as keyof RegisterValidationErrors]) {
      setRegisterValidationErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  }, [registerValidationErrors]);

  // Handle field blur for validation - memoized
  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    setTouched((prev) => ({
      ...prev,
      [name]: true,
    }));
    validateField(name, value);
  }, []);

  // Handle register field blur for validation - memoized
  const handleRegisterBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    setRegisterTouched((prev) => ({
      ...prev,
      [name]: true,
    }));
    validateRegisterField(name, value);
  }, [registerData.password]);

  // Get input class based on validation state - memoized
  const getInputClass = useCallback((fieldName: keyof ValidationErrors) => {
    const hasError = touched[fieldName] && validationErrors[fieldName];
    return hasError ? errorInputClassName : inputClassName;
  }, [touched, validationErrors, errorInputClassName, inputClassName]);

  // Get register input class based on validation state - memoized
  const getRegisterInputClass = useCallback((fieldName: keyof RegisterValidationErrors) => {
    const hasError = registerTouched[fieldName] && registerValidationErrors[fieldName];
    return hasError 
      ? 'w-full px-4 py-3 bg-white border border-red-500 rounded-lg text-gray-900 placeholder-gray-500 focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all duration-300 text-sm'
      : 'w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 text-sm';
  }, [registerTouched, registerValidationErrors]);

  // Handle register form submission
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    clearError();
    setIsRegisterLoading(true);

    // Mark all fields as touched
    setRegisterTouched({
      name: true,
      email: true,
      password: true,
      confirmPassword: true,
    });

    // Validate form before submission
    if (!validateRegisterForm()) {
      setIsRegisterLoading(false);
      return;
    }

    try {
      // Call the registration API
      const result = await register(
        registerData.name,
        registerData.email,
        registerData.password
      );

      if (result.success) {
        // Show success message
        if (result.messageKey) {
          setSuccessKey(result.messageKey);
        } else if (result.message) {
          setBackendSuccess(result.message);
        } else {
          setSuccessKey('auth.messages.registrationSuccess');
        }
        
        // Reset form
        setRegisterData({
          name: '',
          email: '',
          password: '',
          confirmPassword: '',
        });
        setRegisterTouched({
          name: false,
          email: false,
          password: false,
          confirmPassword: false,
        });
        setRegisterValidationErrors({});
      } else {
        // Handle registration errors
        if (result.messageKey) {
          setErrorKey(result.messageKey);
        } else if (result.message) {
          setBackendError(result.message);
        } else {
          setErrorKey('auth.messages.registrationFailed');
        }
      }
    } catch (error) {
      setErrorKey('auth.messages.generalError');
    } finally {
      setIsRegisterLoading(false);
    }
  };

  // Render tracking - only log significant changes
  const prevRenderState = useRef({
    isRedirecting,
    show2FAForm,
    isFormLoading,
    is2FALoading,
    hasError: !!(error || errorKey),
    hasSuccess: !!(successMessage || successKey)
  });

  useEffect(() => {
    const currentState = {
      isRedirecting,
      show2FAForm,
      isFormLoading,
      is2FALoading,
      hasError: !!(error || errorKey),
      hasSuccess: !!(successMessage || successKey)
    };

    const hasSignificantChange = Object.keys(currentState).some(
      key => prevRenderState.current[key as keyof typeof currentState] !== currentState[key as keyof typeof currentState]
    );

    if (hasSignificantChange) {
      prevRenderState.current = currentState;
    }
  });

  // Show loading page while redirecting
  if (isRedirecting) {
    return <LoadingPage />;
  }

  return (
    <div
      className={`min-h-screen flex flex-col lg:flex-row bg-zinc-900 ${
        locale === 'ar' ? 'rtl' : 'ltr'
      }`}
    >
      {/* Left side - Form */}
      <div className={`flex-1 ${show2FAForm ? 'lg:basis-full' : 'lg:basis-1/2'} flex items-center justify-center px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 py-3 sm:py-4 md:py-6 lg:py-8 xl:py-10`}>
        <div className="w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg">
          {/* Header */}
          <div className="auth-screen text-center mb-4 sm:mb-6 md:mb-8">
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-white mb-2">
              {show2FAForm
                ? t('auth.twoFactor.title')
                : t('auth.form.welcomeBack')}
            </h1>
            <p className="text-white/70 text-xs sm:text-sm md:text-base">
              {show2FAForm
                ? t('auth.twoFactor.subtitle')
                : t('auth.form.signInSubtitle')}
            </p>
          </div>

          {/* Error Message */}
          {(error || errorKey) && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2 sm:p-3 mb-3 sm:mb-4">
              <p className="text-red-400 text-xs sm:text-sm">
                {error || (errorKey ? t(errorKey) : '')}
              </p>
            </div>
          )}

          {/* Success Message */}
          {(successMessage || successKey) && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-2 sm:p-3 mb-3 sm:mb-4">
              <p className="text-green-400 text-xs sm:text-sm">
                {successMessage || (successKey ? t(successKey) : '')}
              </p>
            </div>
          )}

          {/* 2FA Form */}
          {show2FAForm && (
            <form
              onSubmit={handle2FASubmit}
              className="space-y-3 sm:space-y-4 md:space-y-6"
            >
              <div>
                <label
                  htmlFor="twoFactorCode"
                  className="block text-sm font-medium text-white mb-1"
                >
                  {t('auth.twoFactor.verificationCode')}
                </label>
                <input
                  type="text"
                  id="twoFactorCode"
                  name="twoFactorCode"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value)}
                  placeholder={t('auth.twoFactor.verificationCodePlaceholder')}
                  maxLength={6}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  disabled={is2FALoading}
                />
              </div>

              <button
                type="submit"
                disabled={is2FALoading}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 disabled:cursor-not-allowed disabled:opacity-60 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                {is2FALoading
                  ? t('auth.twoFactor.verifying')
                  : t('auth.twoFactor.verifyCode')}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShow2FAForm(false);
                  setTwoFactorCode('');
                  setError('');
                  setErrorKey('');
                }}
                className="w-full bg-zinc-700 hover:bg-zinc-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                {t('auth.twoFactor.backToLogin')}
              </button>
            </form>
          )}

          {/* Main Form */}
          {!show2FAForm && (
            <form
              onSubmit={handleSubmit}
              className="space-y-3 sm:space-y-4 md:space-y-6"
            >

              <div>
                <label
                  htmlFor="email"
                  className="block text-xs sm:text-sm font-medium text-white/80 mb-1 sm:mb-2"
                >
                  {t('auth.form.emailAddress')}
                </label>
                <input
                  ref={emailRef}
                  type="text"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  className={getInputClass('email')}
                  placeholder={t('auth.form.emailPlaceholder')}
                />
                {touched.email && validationErrors.email && (
                  <p className="text-red-400 text-xs mt-1">
                    {t(validationErrors.email)}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-xs sm:text-sm font-medium text-white/80 mb-1 sm:mb-2"
                >
                  {t('auth.form.password')}
                </label>
                <input
                  ref={passwordRef}
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  className={getInputClass('password')}
                  placeholder={t('auth.form.passwordPlaceholder')}
                />
                {touched.password && validationErrors.password && (
                  <p className="text-red-400 text-xs mt-1">
                    {t(validationErrors.password)}
                  </p>
                )}
              </div>

              {/* Forgot Password Link */}
              <div className="flex justify-end items-center">
                  <button
                    type="button"
                    onClick={() => {
                      router.push('/forgot-password');
                    }}
                    className="text-purple-400 hover:text-purple-300 font-medium transition-colors duration-200 min-h-[32px] px-2 py-1 rounded hover:underline"
                  >
                    {t('auth.form.forgotPassword')}
                  </button>
                </div>


              <button
                type="submit"
                disabled={isFormLoading}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 disabled:cursor-not-allowed disabled:opacity-60 text-white font-semibold py-2.5 sm:py-3 md:py-4 px-4 sm:px-6 rounded-lg hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 text-sm sm:text-base min-h-[44px] sm:min-h-[48px] flex items-center justify-center"
              >
                {isFormLoading ? (
                  t('auth.form.signingIn')
                ) : (
                  t('auth.form.signIn')
                )}
              </button>
            </form>
          )}

        </div>
      </div>

      {/* Right side - Register Form */}
      {!show2FAForm && (
        <div className="flex-1 lg:basis-1/2 bg-site min-h-[300px] sm:min-h-[400px] md:min-h-[500px] lg:min-h-[600px] flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-gray-900 mb-2">
                {t('auth.form.joinUs')}
              </h1>
              <p className="text-sm sm:text-base text-gray-700">
                {t('auth.form.createAccountSubtitle')}
              </p>
            </div>
          
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <div>
              <label htmlFor="signup-name" className="block text-sm font-medium text-gray-800 mb-2">
                {t('auth.form.fullName')}
              </label>
              <input
                id="signup-name"
                name="name"
                type="text"
                value={registerData.name}
                onChange={handleRegisterInputChange}
                onBlur={handleRegisterBlur}
                className={getRegisterInputClass('name')}
                placeholder={t('auth.form.fullNamePlaceholder')}
                disabled={isRegisterLoading}
              />
              {registerTouched.name && registerValidationErrors.name && (
                <p className="text-red-700 text-xs mt-1">
                  {t(registerValidationErrors.name)}
                </p>
              )}
            </div>
            
            <div>
              <label htmlFor="signup-email" className="block text-sm font-medium text-gray-800 mb-2">
                {t('auth.form.emailAddress')}
              </label>
              <input
                id="signup-email"
                name="email"
                type="email"
                value={registerData.email}
                onChange={handleRegisterInputChange}
                onBlur={handleRegisterBlur}
                className={getRegisterInputClass('email')}
                placeholder={t('auth.form.emailPlaceholder')}
                disabled={isRegisterLoading}
              />
              {registerTouched.email && registerValidationErrors.email && (
                <p className="text-red-700 text-xs mt-1">
                  {t(registerValidationErrors.email)}
                </p>
              )}
            </div>
            
            <div>
              <label htmlFor="signup-password" className="block text-sm font-medium text-gray-800 mb-2">
                {t('auth.form.password')}
              </label>
              <input
                id="signup-password"
                name="password"
                type="password"
                value={registerData.password}
                onChange={handleRegisterInputChange}
                onBlur={handleRegisterBlur}
                className={getRegisterInputClass('password')}
                placeholder={t('auth.form.passwordPlaceholder')}
                disabled={isRegisterLoading}
              />
              {registerTouched.password && registerValidationErrors.password && (
                <p className="text-red-700 text-xs mt-1">
                  {t(registerValidationErrors.password)}
                </p>
              )}
            </div>
            
            <div>
              <label htmlFor="signup-confirm-password" className="block text-sm font-medium text-gray-800 mb-2">
                {t('auth.form.confirmPassword')}
              </label>
              <input
                id="signup-confirm-password"
                name="confirmPassword"
                type="password"
                value={registerData.confirmPassword}
                onChange={handleRegisterInputChange}
                onBlur={handleRegisterBlur}
                className={getRegisterInputClass('confirmPassword')}
                placeholder={t('auth.form.confirmPasswordPlaceholder')}
                disabled={isRegisterLoading}
              />
              {registerTouched.confirmPassword && registerValidationErrors.confirmPassword && (
                <p className="text-red-700 text-xs mt-1">
                  {t(registerValidationErrors.confirmPassword)}
                </p>
              )}
            </div>
            
            <button
              type="submit"
              disabled={isRegisterLoading}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 disabled:cursor-not-allowed disabled:opacity-60 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-transparent"
            >
              {isRegisterLoading ? t('auth.form.creatingAccount') : t('auth.form.signUp')}
            </button>
          </form>
        </div>
        </div>
      )}
    </div>
  );
});

export { AuthForm };
