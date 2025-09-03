'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useRouter } from 'next/navigation';
import { LoadingPage } from '../LoadingPage';

interface ValidationErrors {
  name?: string; // Translation key
  email?: string; // Translation key
  password?: string; // Translation key
  confirmPassword?: string; // Translation key
}

export function AuthForm() {
  const { login, register, user, isLoading } = useAuth();
  const { t, locale } = useLanguage();
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorKey, setErrorKey] = useState('');
  const [successKey, setSuccessKey] = useState('');
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>(
    {}
  );
  const [touched, setTouched] = useState({
    name: false,
    email: false,
    password: false,
    confirmPassword: false,
  });

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);

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
    'w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:border-purple-500 focus:bg-white/15 transition-all duration-300 autofill:bg-white/10 autofill:text-white text-sm sm:text-base';

  // Error input styling
  const errorInputClassName =
    'w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/10 border border-red-500/50 rounded-lg text-white placeholder-white/50 focus:border-red-500 focus:bg-white/15 transition-all duration-300 autofill:bg-white/10 autofill:text-white text-sm sm:text-base';

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

  const validateName = (name: string): string | undefined => {
    if (!name.trim()) {
      return 'auth.validation.nameRequired';
    }
    if (name.length > 100) {
      return 'auth.validation.nameTooLong';
    }
    return undefined;
  };

  const validateConfirmPassword = (
    password: string,
    confirmPassword: string
  ): string | undefined => {
    if (!confirmPassword.trim()) {
      return 'auth.validation.confirmPasswordRequired';
    }
    if (password !== confirmPassword) {
      return 'auth.validation.passwordsDoNotMatch';
    }
    return undefined;
  };

  // Validate all fields
  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};

    if (!isLogin) {
      const nameError = validateName(formData.name);
      if (nameError) errors.name = nameError;
    }

    const emailError = validateEmail(formData.email);
    if (emailError) errors.email = emailError;

    const passwordError = validatePassword(formData.password);
    if (passwordError) errors.password = passwordError;

    if (!isLogin) {
      const confirmPasswordError = validateConfirmPassword(
        formData.password,
        formData.confirmPassword
      );
      if (confirmPasswordError) errors.confirmPassword = confirmPasswordError;
    }

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
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setFormData({ name: '', email: '', password: '', confirmPassword: '' });
    setError('');
    setSuccessMessage('');
    setErrorKey('');
    setSuccessKey('');
    setValidationErrors({});
    setTouched({
      name: false,
      email: false,
      password: false,
      confirmPassword: false,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsFormLoading(true);

    // Mark all fields as touched
    setTouched({
      name: !isLogin,
      email: true,
      password: true,
      confirmPassword: !isLogin,
    });

    // Validate form before submission
    if (!validateForm()) {
      setIsFormLoading(false);
      return;
    }

    try {
      if (isLogin) {
        const result = await login(formData.email, formData.password);
        if (result.success) {
          // User is verified, check role and redirect accordingly
          const currentUser = result.user;
          console.log('🔐 Login successful, user data:', currentUser);
          console.log('🔐 User roles:', currentUser?.roles);
          console.log('🔐 User roles type:', typeof currentUser?.roles);
          console.log('🔐 User roles is array:', Array.isArray(currentUser?.roles));
          console.log('🔐 User roles stringified:', JSON.stringify(currentUser?.roles));
          
          // More robust role checking - handle different possible role field structures
          const roles = currentUser?.roles || (currentUser as any)?.role || (currentUser as any)?.userRoles || (currentUser as any)?.userRole;
          console.log('🔐 Extracted roles from various possible fields:', {
            roles: currentUser?.roles,
            role: (currentUser as any)?.role,
            userRoles: (currentUser as any)?.userRoles,
            userRole: (currentUser as any)?.userRole,
            finalRoles: roles
          });
          
          const hasAdminRole = currentUser && 
            roles && 
            (Array.isArray(roles) ? roles.includes('ADMIN') : 
             typeof roles === 'string' ? roles === 'ADMIN' :
             false);
          
          console.log('🔐 Has admin role:', hasAdminRole);
          console.log('🔐 Role check breakdown:', {
            hasUser: !!currentUser,
            hasRoles: !!currentUser?.roles,
            rolesType: typeof currentUser?.roles,
            isArray: Array.isArray(currentUser?.roles),
            rolesValue: currentUser?.roles,
            includesAdmin: Array.isArray(currentUser?.roles) ? currentUser.roles.includes('ADMIN') : false
          });
          
          if (hasAdminRole) {
            console.log('🔐 Redirecting admin user to /admin');
            try {
              router.push('/admin');
            } catch (error) {
              console.log('🔐 Router push failed, using window.location');
              window.location.href = '/admin';
            }
          } else {
            console.log('🔐 Redirecting customer user to /');
            // Try router.push first, fallback to window.location if needed
            try {
              router.push('/');
            } catch (error) {
              console.log('🔐 Router push failed, using window.location');
              window.location.href = '/';
            }
            
            // Fallback redirect after a short delay
            setTimeout(() => {
              if (window.location.pathname === '/auth') {
                console.log('🔐 Fallback redirect to /');
                window.location.href = '/';
              }
            }, 1000);
          }
        } else {
          if (result.messageKey) {
            setErrorKey(result.messageKey);
            setError('');
          } else if (result.message) {
            setError(result.message);
            setErrorKey('');
          } else {
            setErrorKey('auth.messages.invalidCredentials');
            setError('');
          }
        }
      } else {
        const result = await register(
          formData.name,
          formData.email,
          formData.password
        );
        if (result.success) {
          // Show server success message and switch to login mode
          setError('');
          setErrorKey('');
          if (result.messageKey) {
            setSuccessKey(result.messageKey);
            setSuccessMessage('');
          } else if (result.message) {
            setSuccessMessage(result.message);
            setSuccessKey('');
          } else {
            setSuccessKey('auth.messages.registrationSuccess');
            setSuccessMessage('');
          }
          setIsLogin(true);
          setFormData({
            name: '',
            email: '',
            password: '',
            confirmPassword: '',
          });
          setValidationErrors({});
          setTouched({
            name: false,
            email: false,
            password: false,
            confirmPassword: false,
          });
        } else {
          if (result.messageKey) {
            setErrorKey(result.messageKey);
            setError('');
          } else if (result.message) {
            setError(result.message);
            setErrorKey('');
          } else {
            setErrorKey('auth.messages.registrationFailed');
            setError('');
          }
        }
      }
    } catch (error) {
      setErrorKey('auth.messages.generalError');
      setError('');
    } finally {
      setIsFormLoading(false);
    }
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
    return hasError ? errorInputClassName : inputClassName;
  };

  // Handle autofill detection and styling
  useEffect(() => {
    const handleAnimationStart = (e: AnimationEvent) => {
      if (e.animationName === 'onAutoFillStart') {
        const target = e.target as HTMLInputElement;
        target.classList.add('autofilled');
      }
    };

    const handleAnimationEnd = (e: AnimationEvent) => {
      if (e.animationName === 'onAutoFillCancel') {
        const target = e.target as HTMLInputElement;
        target.classList.remove('autofilled');
      }
    };

    document.addEventListener('animationstart', handleAnimationStart);
    document.addEventListener('animationend', handleAnimationEnd);

    return () => {
      document.removeEventListener('animationstart', handleAnimationStart);
      document.removeEventListener('animationend', handleAnimationEnd);
    };
  }, []);

  // Check for autofill on mount and after a delay
  useEffect(() => {
    const checkAutofill = () => {
      if (emailRef.current && emailRef.current.matches(':-webkit-autofill')) {
        emailRef.current.classList.add('autofilled');
      }
      if (
        passwordRef.current &&
        passwordRef.current.matches(':-webkit-autofill')
      ) {
        passwordRef.current.classList.add('autofilled');
      }
      if (nameRef.current && nameRef.current.matches(':-webkit-autofill')) {
        nameRef.current.classList.add('autofilled');
      }
      if (
        confirmPasswordRef.current &&
        confirmPasswordRef.current.matches(':-webkit-autofill')
      ) {
        confirmPasswordRef.current.classList.add('autofilled');
      }
    };

    // Check immediately
    checkAutofill();

    // Check after a delay to catch delayed autofill
    const timer = setTimeout(checkAutofill, 100);

    return () => clearTimeout(timer);
  }, []);

  // Show loading page while redirecting
  if (isRedirecting) {
    return <LoadingPage />;
  }

  return (
    <div
      className={`min-h-screen flex flex-col lg:flex-row bg-zinc-900 ${locale === 'ar' ? 'rtl' : 'ltr'
        }`}
    >
      {/* Left side - Form */}
      <div className="flex-1 lg:basis-1/2 flex items-center justify-center px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 py-3 sm:py-4 md:py-6 lg:py-8 xl:py-10">
        <div className="w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg">
          {/* Header */}
          <div className="auth-screen text-center mb-4 sm:mb-6 md:mb-8">
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-white mb-2">
              {isLogin ? t('auth.form.welcomeBack') : t('auth.form.joinUs')}
            </h1>
            <p className="text-white/70 text-xs sm:text-sm md:text-base">
              {isLogin
                ? t('auth.form.signInSubtitle')
                : t('auth.form.createAccountSubtitle')}
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

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="space-y-3 sm:space-y-4 md:space-y-6"
          >
            {!isLogin && (
              <div>
                <label
                  htmlFor="name"
                  className="block text-xs sm:text-sm font-medium text-white/80 mb-1 sm:mb-2"
                >
                  {t('auth.form.fullName')}
                </label>
                <input
                  ref={nameRef}
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  className={getInputClass('name')}
                  placeholder={t('auth.form.fullNamePlaceholder')}
                />
                {touched.name && validationErrors.name && (
                  <p className="text-red-400 text-xs mt-1">
                    {t(validationErrors.name)}
                  </p>
                )}
              </div>
            )}

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
              {!isLogin && (
                <p className="text-white/50 text-xs mt-1">
                  {t('auth.form.passwordRequirement')}
                </p>
              )}
            </div>

            {/* Forgot Password Link - Only show in login mode */}
            {isLogin && (
              <div className="flex justify-end">
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
            )}

            {!isLogin && (
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-xs sm:text-sm font-medium text-white/80 mb-1 sm:mb-2"
                >
                  {t('auth.form.confirmPassword')}
                </label>
                <input
                  ref={confirmPasswordRef}
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  className={getInputClass('confirmPassword')}
                  placeholder={t('auth.form.confirmPasswordPlaceholder')}
                />
                {touched.confirmPassword &&
                  validationErrors.confirmPassword && (
                    <p className="text-red-400 text-xs mt-1">
                      {t(validationErrors.confirmPassword)}
                    </p>
                  )}
              </div>
            )}

            <button
              type="submit"
              disabled={isFormLoading}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-semibold py-2.5 sm:py-3 md:py-4 px-4 sm:px-6 rounded-lg hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 text-sm sm:text-base disabled:cursor-not-allowed min-h-[44px] sm:min-h-[48px] flex items-center justify-center"
            >
              {isFormLoading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                  {isLogin
                    ? t('auth.form.signingIn')
                    : t('auth.form.creatingAccount')}
                </>
              ) : isLogin ? (
                t('auth.form.signIn')
              ) : (
                t('auth.form.createAccount')
              )}
            </button>
          </form>

          {/* Toggle mode */}
          <div className="text-center mt-3 sm:mt-4 md:mt-6">
            <p className="text-white/70 text-xs sm:text-sm">
              {isLogin
                ? t('auth.form.dontHaveAccount')
                : t('auth.form.alreadyHaveAccount')}
              <button
                onClick={toggleMode}
                className="ml-1 sm:ml-2 text-purple-400 hover:text-purple-300 font-medium transition-colors duration-200 min-h-[32px] px-2 py-1 rounded"
              >
                {isLogin ? t('auth.form.signUp') : t('auth.form.signInLink')}
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Image */}
      <div className="flex-1 lg:basis-1/2 relative hidden sm:block">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/80 to-pink-900/80 z-10"></div>
        <Image
          src="https://static.wixstatic.com/media/503ea4_ed9a38760ae04aab86b47e82525fdcac~mv2.jpg/v1/fill/w_918,h_585,al_c,q_85,usm_0.66_1.00_0.01,enc_auto/503ea4_ed9a38760ae04aab86b47e82525fdcac~mv2.jpg"
          alt={t('auth.hero.imageAlt')}
          className="w-full h-full object-cover"
          width={1000}
          height={800}
        />
        <div className="auth-screen absolute inset-0 z-20 flex items-center justify-center px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="text-center text-white">
            <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold mb-2 sm:mb-3 md:mb-4">
              {t('auth.hero.title')}
            </h1>
            <p className="text-xs sm:text-sm md:text-base lg:text-lg text-white/80 max-w-[200px] sm:max-w-xs md:max-w-sm lg:max-w-md">
              {t('auth.hero.subtitle')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
