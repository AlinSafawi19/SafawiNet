'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/navigation';

interface ValidationErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export function AuthForm() {
  const { login, register } = useAuth();
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState({
    name: false,
    email: false,
    password: false,
    confirmPassword: false
  });

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);

  // Consistent input styling for all form fields
  const inputClassName = "w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:border-purple-500 focus:bg-white/15 transition-all duration-300 autofill:bg-white/10 autofill:text-white";

  // Error input styling
  const errorInputClassName = "w-full px-4 py-3 bg-white/10 border border-red-500/50 rounded-lg text-white placeholder-white/50 focus:border-red-500 focus:bg-white/15 transition-all duration-300 autofill:bg-white/10 autofill:text-white";

  // Validation functions
  const validateEmail = (email: string): string | undefined => {
    if (!email.trim()) {
      return 'Email is required';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Please enter a valid email address';
    }
    return undefined;
  };

  const validatePassword = (password: string): string | undefined => {
    if (!password.trim()) {
      return 'Password is required';
    }
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    return undefined;
  };

  const validateName = (name: string): string | undefined => {
    if (!name.trim()) {
      return 'Name is required';
    }
    if (name.length > 100) {
      return 'Name must be less than 100 characters';
    }
    return undefined;
  };

  const validateConfirmPassword = (password: string, confirmPassword: string): string | undefined => {
    if (!confirmPassword.trim()) {
      return 'Please confirm your password';
    }
    if (password !== confirmPassword) {
      return 'Passwords do not match';
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
      const confirmPasswordError = validateConfirmPassword(formData.password, formData.confirmPassword);
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

    setValidationErrors(prev => ({
      ...prev,
      [name]: error
    }));
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setFormData({ name: '', email: '', password: '', confirmPassword: '' });
    setError('');
    setSuccessMessage('');
    setValidationErrors({});
    setTouched({ name: false, email: false, password: false, confirmPassword: false });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Mark all fields as touched
    setTouched({
      name: !isLogin,
      email: true,
      password: true,
      confirmPassword: !isLogin
    });

    // Validate form before submission
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      if (isLogin) {
        const success = await login(formData.email, formData.password);
        if (success) {
          router.push('/');
        } else {
          setError('Invalid email or password');
        }
      } else {
        const success = await register(formData.name, formData.email, formData.password);
        if (success) {
          // Show success message and switch to login mode
          setError('');
          setSuccessMessage('Registration successful! Please sign in with your new account.');
          setIsLogin(true);
          setFormData({ name: '', email: '', password: '', confirmPassword: '' });
          setValidationErrors({});
          setTouched({ name: false, email: false, password: false, confirmPassword: false });
        } else {
          setError('Registration failed. Please try again.');
        }
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle form data changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when user starts typing
    if (validationErrors[name as keyof ValidationErrors]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  // Handle field blur for validation
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTouched(prev => ({
      ...prev,
      [name]: true
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
      if (passwordRef.current && passwordRef.current.matches(':-webkit-autofill')) {
        passwordRef.current.classList.add('autofilled');
      }
      if (nameRef.current && nameRef.current.matches(':-webkit-autofill')) {
        nameRef.current.classList.add('autofilled');
      }
      if (confirmPasswordRef.current && confirmPasswordRef.current.matches(':-webkit-autofill')) {
        confirmPasswordRef.current.classList.add('autofilled');
      }
    };

    // Check immediately
    checkAutofill();

    // Check after a delay to catch delayed autofill
    const timer = setTimeout(checkAutofill, 100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen flex bg-zinc-900">
      {/* Left side - Form */}
      <div className="basis-1/2 flex items-center justify-center px-6 sm:px-10 lg:px-14 py-2 sm:py-6 lg:py-10">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-2">
              {isLogin ? 'WELCOME BACK' : 'JOIN US'}
            </h1>
            <p className="text-white/70 text-sm sm:text-base">
              {isLogin
                ? 'Sign in to your account'
                : 'Create your account to get started'
              }
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 mb-4">
              <p className="text-green-400 text-sm">{successMessage}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-white/80 mb-2">
                  Full Name
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
                  placeholder="Enter your full name"
                />
                {touched.name && validationErrors.name && (
                  <p className="text-red-400 text-xs mt-1">{validationErrors.name}</p>
                )}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white/80 mb-2">
                Email Address
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
                placeholder="Enter your email"
              />
              {touched.email && validationErrors.email && (
                <p className="text-red-400 text-xs mt-1">{validationErrors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-white/80 mb-2">
                Password
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
                placeholder="Enter your password"
              />
              {touched.password && validationErrors.password && (
                <p className="text-red-400 text-xs mt-1">{validationErrors.password}</p>
              )}
              {!isLogin && (
                <p className="text-white/50 text-xs mt-1">Password must be at least 8 characters long</p>
              )}
            </div>

            {!isLogin && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-white/80 mb-2">
                  Confirm Password
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
                  placeholder="Confirm your password"
                />
                {touched.confirmPassword && validationErrors.confirmPassword && (
                  <p className="text-red-400 text-xs mt-1">{validationErrors.confirmPassword}</p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-semibold py-3 px-6 rounded-lg hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 text-base disabled:cursor-not-allowed"
            >
              {isLoading ? 'PLEASE WAIT...' : (isLogin ? 'SIGN IN' : 'CREATE ACCOUNT')}
            </button>
          </form>

          {/* Toggle mode */}
          <div className="text-center mt-6">
            <p className="text-white/70 text-sm">
              {isLogin ? "Don't have an account?" : "Already have an account?"}
              <button
                onClick={toggleMode}
                className="ml-2 text-purple-400 hover:text-purple-300 font-medium transition-colors duration-200"
              >
                {isLogin ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Image */}
      <div className="basis-1/2 relative hidden sm:block">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/80 to-pink-900/80 z-10"></div>
        <Image
          src="https://static.wixstatic.com/media/503ea4_ed9a38760ae04aab86b47e82525fdcac~mv2.jpg/v1/fill/w_918,h_585,al_c,q_85,usm_0.66_1.00_0.01,enc_auto/503ea4_ed9a38760ae04aab86b47e82525fdcac~mv2.jpg"
          alt="TALI$A"
          className="w-full h-full object-cover"
          width={1000}
          height={800}
        />
        <div className="absolute inset-0 z-20 flex items-center justify-center">
          <div className="text-center text-white">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">NETWORKING MADE SIMPLE</h2>
            <p className="text-lg text-white/80 max-w-md">
              Join the community of professionals and discover premium networking solutions
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
