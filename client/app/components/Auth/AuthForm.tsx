'use client';

import { useState, useEffect, useRef, useCallback, memo, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import MessageDisplay from '../MessageDisplay';

const AuthForm = memo(function AuthForm() {
  const { login, loginWith2FA, register, user, isLoading } = useAuth();
  const router = useRouter();
  const [isFormLoading, setIsFormLoading] = useState(false);

  const [isRegisterLoading, setIsRegisterLoading] = useState(false);

  // 2FA state
  const [show2FAForm, setShow2FAForm] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorUserId, setTwoFactorUserId] = useState('');
  const [is2FALoading, setIs2FALoading] = useState(false);

  const [loginErrorMessage, setLoginErrorMessage] = useState<
    string | undefined
  >(undefined);
  const [registerErrorMessage, setRegisterErrorMessage] = useState<
    string | undefined
  >(undefined);
  const [registerSuccessMessage, setRegisterSuccessMessage] = useState<
    string | undefined
  >(undefined);

  // Validation state for login form
  const [loginValidationErrors, setLoginValidationErrors] = useState<{
    email?: string;
    password?: string;
  }>({});

  // Validation state for 2FA form
  const [twoFactorValidationErrors, setTwoFactorValidationErrors] = useState<{
    twoFactorCode?: string;
  }>({});

  // Validation state for register form
  const [registerValidationErrors, setRegisterValidationErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  // Use refs for input values to prevent re-renders on every keystroke
  const formDataRef = useRef({
    email: '',
    password: '',
  });

  const registerDataRef = useRef({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  // Redirect logged-in users
  useEffect(() => {
    if (!isLoading && user) {
      // Check if user has admin role
      const isAdmin = user.roles && user.roles.includes('ADMIN');

      if (isAdmin) {
        // Redirect admin users to admin dashboard
        router.push('/admin');
      } else {
        // Redirect customer users to home page
        router.push('/');
      }
    }
  }, [user, isLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate login fields before submission
    const emailError = validateLoginEmail(formDataRef.current.email);
    const passwordError = validateLoginPassword(formDataRef.current.password);

    const validationErrors = {
      email: emailError,
      password: passwordError,
    };

    setLoginValidationErrors(validationErrors);

    // If there are any validation errors, don't submit
    if (emailError || passwordError) {
      return;
    }

    setIsFormLoading(true);

    try {
      const result = await login(
        formDataRef.current.email,
        formDataRef.current.password
      );

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
            console.warn(
              '⚠️ AuthForm: Router.push failed, using window.location',
              error
            );
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
      } else {
        console.warn('❌ AuthForm: Login failed', {
          message: result.message,
        });
        setLoginErrorMessage(
          result.message || 'Login failed. Please try again.'
        );
      }
    } catch (error) {
      console.error('💥 AuthForm: Login error caught', error);
      setLoginErrorMessage(
        error instanceof Error
          ? error.message
          : 'An unexpected error occurred. Please try again.'
      );
    } finally {
      setIsFormLoading(false);
    }
  };

  // Handle 2FA form submission
  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate 2FA code before submission
    const codeError = validateTwoFactorCode(twoFactorCode);

    if (codeError) {
      setTwoFactorValidationErrors({ twoFactorCode: codeError });
      return;
    }

    setIs2FALoading(true);

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
        console.warn('❌ AuthForm: 2FA failed', {
          message: result.message,
        });
        setLoginErrorMessage(
          result.message ||
            'Two-factor authentication failed. Please try again.'
        );
      }
    } catch (error) {
      console.error('💥 AuthForm: 2FA error caught', error);
      setLoginErrorMessage(
        error instanceof Error
          ? error.message
          : 'An unexpected error occurred. Please try again.'
      );
    } finally {
      setIs2FALoading(false);
    }
  };

  // Handle form data changes - optimized to reduce re-renders
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;

      // Update ref instead of state to prevent re-renders
      formDataRef.current = {
        ...formDataRef.current,
        [name]: value,
      };
    },
    [] // No dependencies needed
  );

  // Handle register form data changes
  const handleRegisterInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;

      // Update ref instead of state to prevent re-renders
      registerDataRef.current = {
        ...registerDataRef.current,
        [name]: value,
      };
    },
    [] // No dependencies needed
  );

  // Clear messages when user starts typing in login form
  const handleLoginInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setLoginErrorMessage(undefined);
      handleInputChange(e);

      // Clear validation error for this field
      const fieldName = e.target.name as keyof typeof loginValidationErrors;
      if (loginValidationErrors[fieldName]) {
        setLoginValidationErrors(prev => ({
          ...prev,
          [fieldName]: undefined
        }));
      }
    },
    [handleInputChange, loginValidationErrors]
  );

  // Handle validation on blur for login form
  const handleLoginBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      let error: string | undefined;

      switch (name) {
        case 'email':
          error = validateLoginEmail(value);
          break;
        case 'password':
          error = validateLoginPassword(value);
          break;
      }

      if (error) {
        setLoginValidationErrors(prev => ({
          ...prev,
          [name]: error
        }));
      }
    },
    []
  );

  // Handle validation on blur for 2FA form
  const handle2FABlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      let error: string | undefined;

      if (name === 'twoFactorCode') {
        error = validateTwoFactorCode(value);
      }

      if (error) {
        setTwoFactorValidationErrors(prev => ({
          ...prev,
          [name]: error
        }));
      }
    },
    []
  );

  // Validation functions for login form (simple required validation)
  const validateLoginEmail = (email: string): string | undefined => {
    if (!email || email.trim().length === 0) {
      return 'Email is required';
    }
    return undefined;
  };

  const validateLoginPassword = (password: string): string | undefined => {
    if (!password || password.trim().length === 0) {
      return 'Password is required';
    }
    return undefined;
  };

  // Validation functions for 2FA form (exactly 6 digits)
  const validateTwoFactorCode = (code: string): string | undefined => {
    if (!code || code.trim().length === 0) {
      return 'Verification code is required';
    }
    
    // Check if code contains only digits
    if (!/^\d+$/.test(code)) {
      return 'Verification code must contain only numbers';
    }
    
    // Check length (must be exactly 6 digits for 2FA)
    if (code.length !== 6) {
      return 'Verification code must be exactly 6 digits';
    }
    
    return undefined;
  };

  // Validation functions for register form (detailed validation)
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

  // Clear messages when user starts typing in registration form
  const handleRegistrationInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setRegisterErrorMessage(undefined);
      setRegisterSuccessMessage(undefined);
      handleRegisterInputChange(e);

      // Clear validation error for this field
      const fieldName = e.target.name as keyof typeof registerValidationErrors;
      if (registerValidationErrors[fieldName]) {
        setRegisterValidationErrors(prev => ({
          ...prev,
          [fieldName]: undefined
        }));
      }
    },
    [handleRegisterInputChange, registerValidationErrors]
  );

  // Handle validation on blur
  const handleRegisterBlur = useCallback(
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
          if (registerDataRef.current.confirmPassword) {
            const confirmPasswordError = validateConfirmPassword(
              value,
              registerDataRef.current.confirmPassword
            );
            setRegisterValidationErrors(prev => ({
              ...prev,
              confirmPassword: confirmPasswordError
            }));
          }
          break;
        case 'confirmPassword':
          error = validateConfirmPassword(
            registerDataRef.current.password,
            value
          );
          break;
      }

      if (error) {
        setRegisterValidationErrors(prev => ({
          ...prev,
          [name]: error
        }));
      }
    },
    []
  );

  // Memoize input class names to prevent recreation on every render
  const inputClassName = useMemo(
    () =>
      'w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:border-purple-500 focus:bg-white/15 transition-all duration-300 text-sm sm:text-base',
    []
  );

  const registerInputClassName = useMemo(
    () =>
      'w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 text-sm',
    []
  );

  // Handle register form submission
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields before submission
    const nameError = validateName(registerDataRef.current.name);
    const emailError = validateEmail(registerDataRef.current.email);
    const passwordError = validatePassword(registerDataRef.current.password);
    const confirmPasswordError = validateConfirmPassword(
      registerDataRef.current.password,
      registerDataRef.current.confirmPassword
    );

    const validationErrors = {
      name: nameError,
      email: emailError,
      password: passwordError,
      confirmPassword: confirmPasswordError,
    };

    setRegisterValidationErrors(validationErrors);

    // If there are any validation errors, don't submit
    if (nameError || emailError || passwordError || confirmPasswordError) {
      return;
    }

    setIsRegisterLoading(true);

    try {
      // Call the registration API
      const result = await register(
        registerDataRef.current.name,
        registerDataRef.current.email,
        registerDataRef.current.password,
        registerDataRef.current.confirmPassword
      );

      if (result.success) {
        setRegisterSuccessMessage(result.message);

        // Clear form inputs by resetting their values
        const nameInput = document.getElementById(
          'signup-name'
        ) as HTMLInputElement;
        const emailInput = document.getElementById(
          'signup-email'
        ) as HTMLInputElement;
        const passwordInput = document.getElementById(
          'signup-password'
        ) as HTMLInputElement;
        const confirmPasswordInput = document.getElementById(
          'signup-confirm-password'
        ) as HTMLInputElement;

        if (nameInput) nameInput.value = '';
        if (emailInput) emailInput.value = '';
        if (passwordInput) passwordInput.value = '';
        if (confirmPasswordInput) confirmPasswordInput.value = '';
      } else {
        console.warn('❌ AuthForm: Registration failed', {
          message: result.message,
        });
        setRegisterErrorMessage(
          result.message || 'Registration failed. Please try again.'
        );
      }
    } catch (error: any) {
      console.error('💥 AuthForm: Registration error caught', error);
      setRegisterErrorMessage(
        error.message || 'An unexpected error occurred. Please try again.'
      );
    } finally {
      setIsRegisterLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-zinc-900 ltr">
      {/* Left side - Form */}
      <div
        className={`flex-1 ${
          show2FAForm ? 'lg:basis-full' : 'lg:basis-1/2'
        } flex items-center justify-center px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 py-3 sm:py-4 md:py-6 lg:py-8 xl:py-10`}
      >
        <div className="w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg">
          {/* Header */}
          <div className="auth-screen text-center mb-4 sm:mb-6 md:mb-8">
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-white mb-2">
              {show2FAForm ? 'Two-Factor Authentication' : 'Welcome Back'}
            </h1>
            <p className="text-white/70 text-xs sm:text-sm md:text-base">
              {show2FAForm
                ? 'Please enter the 6-digit code sent to your email'
                : 'Please enter your email and password to login'}
            </p>
          </div>

          {/* 2FA Form */}
          {show2FAForm && (
            <>
              {/* Messages for 2FA */}
              <MessageDisplay
                errorMessage={loginErrorMessage}
                className="mb-4"
              />

              <form
                onSubmit={handle2FASubmit}
                className="space-y-3 sm:space-y-4 md:space-y-6"
              >
                <div>
                  <label
                    htmlFor="twoFactorCode"
                    className="block text-sm font-medium text-white mb-1"
                  >
                    Verification Code
                  </label>
                  <input
                    type="text"
                    id="twoFactorCode"
                    name="twoFactorCode"
                    value={twoFactorCode}
                    onChange={(e) => {
                      setTwoFactorCode(e.target.value);
                      setLoginErrorMessage(undefined); // Clear error when typing
                      // Clear validation error when typing
                      if (twoFactorValidationErrors.twoFactorCode) {
                        setTwoFactorValidationErrors(prev => ({
                          ...prev,
                          twoFactorCode: undefined
                        }));
                      }
                    }}
                    onBlur={handle2FABlur}
                    placeholder="Enter 6-digit verification code"
                    className={`w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                      twoFactorValidationErrors.twoFactorCode
                        ? 'border-red-500 focus:border-red-500'
                        : ''
                    }`}
                    disabled={is2FALoading}
                  />
                  {twoFactorValidationErrors.twoFactorCode && (
                    <p className="mt-1 text-sm text-red-400">
                      {twoFactorValidationErrors.twoFactorCode}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={is2FALoading}
                  className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 disabled:cursor-not-allowed disabled:opacity-60 text-white font-medium py-2 px-4 rounded-md transition-colors"
                >
                  {is2FALoading ? 'Verifying...' : 'Verify Code'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShow2FAForm(false);
                    setTwoFactorCode('');
                    setLoginErrorMessage(undefined); // Clear error when going back
                  }}
                  className="w-full bg-zinc-700 hover:bg-zinc-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
                >
                  Back to Login
                </button>
              </form>
            </>
          )}

          {/* Messages for main form */}
          {!show2FAForm && (
            <MessageDisplay errorMessage={loginErrorMessage} className="mb-4" />
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
                  Email Address
                </label>
                <input
                  ref={emailRef}
                  type="text"
                  id="email"
                  name="email"
                  defaultValue=""
                  onChange={handleLoginInputChange}
                  onBlur={handleLoginBlur}
                  className={`${inputClassName} ${
                    loginValidationErrors.email
                      ? 'border-red-500 focus:border-red-500'
                      : ''
                  }`}
                  placeholder="Enter your email"
                />
                {loginValidationErrors.email && (
                  <p className="mt-1 text-sm text-red-400">
                    {loginValidationErrors.email}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-xs sm:text-sm font-medium text-white/80 mb-1 sm:mb-2"
                >
                  Password
                </label>
                <input
                  ref={passwordRef}
                  type="password"
                  id="password"
                  name="password"
                  defaultValue=""
                  onChange={handleLoginInputChange}
                  onBlur={handleLoginBlur}
                  className={`${inputClassName} ${
                    loginValidationErrors.password
                      ? 'border-red-500 focus:border-red-500'
                      : ''
                  }`}
                  placeholder="Enter your password"
                />
                {loginValidationErrors.password && (
                  <p className="mt-1 text-sm text-red-400">
                    {loginValidationErrors.password}
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
                  Forgot Password
                </button>
              </div>

              <button
                type="submit"
                disabled={isFormLoading}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 disabled:cursor-not-allowed disabled:opacity-60 text-white font-semibold py-2.5 sm:py-3 md:py-4 px-4 sm:px-6 rounded-lg hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 text-sm sm:text-base min-h-[44px] sm:min-h-[48px] flex items-center justify-center"
              >
                {isFormLoading ? 'Signing In...' : 'Sign In'}
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
                Join Us
              </h1>
              <p className="text-sm sm:text-base text-gray-700">
                Create your account to get started
              </p>
            </div>

            {/* Messages */}
            <MessageDisplay
              successMessage={registerSuccessMessage}
              errorMessage={registerErrorMessage}
              className="mb-4"
            />

            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="signup-name"
                  className="block text-sm font-medium text-gray-800 mb-2"
                >
                  Full Name
                </label>
                <input
                  id="signup-name"
                  name="name"
                  type="text"
                  defaultValue=""
                  onChange={handleRegistrationInputChange}
                  onBlur={handleRegisterBlur}
                  className={`${registerInputClassName} ${
                    registerValidationErrors.name
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
                      : ''
                  }`}
                  placeholder="Enter your full name"
                  disabled={isRegisterLoading}
                />
                {registerValidationErrors.name && (
                  <p className="mt-1 text-sm text-red-600">
                    {registerValidationErrors.name}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="signup-email"
                  className="block text-sm font-medium text-gray-800 mb-2"
                >
                  Email Address
                </label>
                <input
                  id="signup-email"
                  name="email"
                  type="text"
                  defaultValue=""
                  onChange={handleRegistrationInputChange}
                  onBlur={handleRegisterBlur}
                  className={`${registerInputClassName} ${
                    registerValidationErrors.email
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
                      : ''
                  }`}
                  placeholder="Enter your email"
                  disabled={isRegisterLoading}
                />
                {registerValidationErrors.email && (
                  <p className="mt-1 text-sm text-red-600">
                    {registerValidationErrors.email}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="signup-password"
                  className="block text-sm font-medium text-gray-800 mb-2"
                >
                  Password
                </label>
                <input
                  id="signup-password"
                  name="password"
                  type="password"
                  defaultValue=""
                  onChange={handleRegistrationInputChange}
                  onBlur={handleRegisterBlur}
                  className={`${registerInputClassName} ${
                    registerValidationErrors.password
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
                      : ''
                  }`}
                  placeholder="Enter your password (minimum 8 characters)"
                  disabled={isRegisterLoading}
                />
                {registerValidationErrors.password && (
                  <p className="mt-1 text-sm text-red-600">
                    {registerValidationErrors.password}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="signup-confirm-password"
                  className="block text-sm font-medium text-gray-800 mb-2"
                >
                  Confirm Password
                </label>
                <input
                  id="signup-confirm-password"
                  name="confirmPassword"
                  type="password"
                  defaultValue=""
                  onChange={handleRegistrationInputChange}
                  onBlur={handleRegisterBlur}
                  className={`${registerInputClassName} ${
                    registerValidationErrors.confirmPassword
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
                      : ''
                  }`}
                  placeholder="Confirm your password"
                  disabled={isRegisterLoading}
                />
                {registerValidationErrors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">
                    {registerValidationErrors.confirmPassword}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isRegisterLoading}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 disabled:cursor-not-allowed disabled:opacity-60 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-transparent"
              >
                {isRegisterLoading ? 'Creating Account...' : 'Sign Up'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
});

export { AuthForm };
