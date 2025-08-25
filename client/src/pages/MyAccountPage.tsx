import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiChevronRight, HiEye, HiEyeOff, HiUser, HiLogout } from 'react-icons/hi';
import { useAuth } from '../contexts/AuthContext';

// Validation interfaces
interface ValidationErrors {
    email?: string;
    password?: string;
    username?: string;
    confirmPassword?: string;
}

interface FieldValidation {
    isValid: boolean;
    message: string;
}

const MyAccountPage: React.FC = () => {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Login form state
    const [loginForm, setLoginForm] = useState({
        email: '',
        password: ''
    });

    // Register form state
    const [registerForm, setRegisterForm] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: ''
    });

    // Validation state
    const [loginValidation, setLoginValidation] = useState<ValidationErrors>({});
    const [registerValidation, setRegisterValidation] = useState<ValidationErrors>({});
    const [isFormValid, setIsFormValid] = useState({ login: false, register: false });
    const [showLoginValidation, setShowLoginValidation] = useState(false);
    const [showRegisterValidation, setShowRegisterValidation] = useState(false);

    const [isLoading, setIsLoading] = useState(false);
    const [loginError, setLoginError] = useState('');
    const [loginSuccess, setLoginSuccess] = useState('');
    const [registerError, setRegisterError] = useState('');
    const [registerSuccess, setRegisterSuccess] = useState('');

    const navigate = useNavigate();
    const { user, isAuthenticated, login, register, logout } = useAuth();

    // Validation functions
    const validateEmail = (email: string): FieldValidation => {
        if (!email) {
            return { isValid: false, message: 'Email is required' };
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return { isValid: false, message: 'Invalid email format' };
        }
        return { isValid: true, message: '' };
    };

    const validatePassword = (password: string): FieldValidation => {
        if (!password) {
            return { isValid: false, message: 'Password is required' };
        }
        if (password.length < 8) {
            return { isValid: false, message: 'Password must be at least 8 characters' };
        }
        return { isValid: true, message: '' };
    };

    const validateUsername = (username: string): FieldValidation => {
        if (!username) {
            return { isValid: false, message: 'Full name is required' };
        }
        if (username.length > 100) {
            return { isValid: false, message: 'Name too long (max 100 characters)' };
        }
        if (username.trim().length === 0) {
            return { isValid: false, message: 'Name cannot be empty' };
        }
        return { isValid: true, message: '' };
    };

    const validateConfirmPassword = (password: string, confirmPassword: string): FieldValidation => {
        if (!confirmPassword) {
            return { isValid: false, message: 'Please confirm your password' };
        }
        if (password !== confirmPassword) {
            return { isValid: false, message: 'Passwords do not match' };
        }
        return { isValid: true, message: '' };
    };

    // Real-time validation for login form
    const validateLoginForm = () => {
        const emailValidation = validateEmail(loginForm.email);
        const passwordValidation = validatePassword(loginForm.password);

        const newValidation: ValidationErrors = {};
        if (!emailValidation.isValid) newValidation.email = emailValidation.message;
        if (!passwordValidation.isValid) newValidation.password = passwordValidation.message;

        setLoginValidation(newValidation);
        setIsFormValid(prev => ({ ...prev, login: emailValidation.isValid && passwordValidation.isValid }));
    };

    // Real-time validation for register form
    const validateRegisterForm = () => {
        const usernameValidation = validateUsername(registerForm.username);
        const emailValidation = validateEmail(registerForm.email);
        const passwordValidation = validatePassword(registerForm.password);
        const confirmPasswordValidation = validateConfirmPassword(registerForm.password, registerForm.confirmPassword);

        const newValidation: ValidationErrors = {};
        if (!usernameValidation.isValid) newValidation.username = usernameValidation.message;
        if (!emailValidation.isValid) newValidation.email = emailValidation.message;
        if (!passwordValidation.isValid) newValidation.password = passwordValidation.message;
        if (!confirmPasswordValidation.isValid) newValidation.confirmPassword = confirmPasswordValidation.message;

        setRegisterValidation(newValidation);
        setIsFormValid(prev => ({
            ...prev,
            register: usernameValidation.isValid && emailValidation.isValid &&
                passwordValidation.isValid && confirmPasswordValidation.isValid
        }));
    };

    // Effect to validate forms when inputs change
    useEffect(() => {
        validateLoginForm();
    }, [loginForm]);

    useEffect(() => {
        validateRegisterForm();
    }, [registerForm]);

    // Redirect if already authenticated
    useEffect(() => {
        if (isAuthenticated && user?.isVerified) {
            navigate('/');
        }
    }, [isAuthenticated, user, navigate]);

    const handleLoginSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Show validation after first submission attempt
        setShowLoginValidation(true);

        // Final validation before submission
        validateLoginForm();
        if (!isFormValid.login) {
            return;
        }

        setLoginError('');
        setLoginSuccess('');
        setIsLoading(true);

        try {
            await login(loginForm.email, loginForm.password);
            setLoginSuccess('Login successful! Redirecting to your account...');
            // Clear validation display on successful login
            setShowLoginValidation(false);
            setTimeout(() => navigate('/my-account'), 1000);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Login failed';
            setLoginError(errorMessage);

            // Clear any previous register messages when login fails
            setRegisterSuccess('');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegisterSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Show validation after first submission attempt
        setShowRegisterValidation(true);

        // Final validation before submission
        validateRegisterForm();
        if (!isFormValid.register) {
            return;
        }

        setRegisterError('');
        setRegisterSuccess('');

        setIsLoading(true);

        try {
            const response = await register(registerForm.username, registerForm.email, registerForm.password);
            // Display the message from the API response
            if (response && response.message) {
                setRegisterSuccess(response.message);
            } else {
                setRegisterSuccess('Registration successful! Please check your email for verification.');
            }

            // Clear the registration form after successful registration
            setRegisterForm({
                username: '',
                email: '',
                password: '',
                confirmPassword: ''
            });

            // Clear validation errors and hide validation display
            setRegisterValidation({});
            setShowRegisterValidation(false);

            // Clear any previous login messages
            setLoginError('');
            setLoginSuccess('');

            // Don't redirect unverified users - they need to verify email first
            // setTimeout(() => navigate('/my-account'), 2000);
        } catch (error) {
            setRegisterError(error instanceof Error ? error.message : 'Registration failed');
        } finally {
            setIsLoading(false);
        }
    };

    const togglePasswordVisibility = () => setShowPassword(!showPassword);
    const toggleConfirmPasswordVisibility = () => setShowConfirmPassword(!showConfirmPassword);

    // Helper function to render validation message
    const renderValidationMessage = (message: string, isValid: boolean, showValidation: boolean) => {
        if (!message || !showValidation) return null;
        return (
            <p className={`text-sm mt-1 ${isValid ? 'text-green-600' : 'text-red-600'}`}>
                {message}
            </p>
        );
    };

    // If user is authenticated, show account dashboard
    if (isAuthenticated && user) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white py-16 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    {/* Breadcrumb */}
                    <nav className="mb-12">
                        <ol className="flex items-center space-x-3 text-sm text-gray-500 font-light">
                            <li>
                                <a href="/" className="hover:text-red-500 transition-colors duration-300 relative group">
                                    Home
                                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-red-500 transition-all duration-300 ease-out group-hover:w-full"></span>
                                </a>
                            </li>
                            <li className="text-gray-300"><HiChevronRight className="w-4 h-4" /></li>
                            <li className="text-gray-900 font-light">My Account</li>
                        </ol>
                    </nav>

                    {/* Account Dashboard */}
                    <div className="bg-white border border-gray-100 rounded-none shadow-sm overflow-hidden">
                        <div className="p-12 lg:p-16">
                            <div className="max-w-4xl mx-auto">
                                <div className="mb-12">
                                    <div className="inline-block mb-4">
                                        <span className="text-red-500 text-sm font-light tracking-widest uppercase border-b border-red-200 pb-2">
                                            Welcome Back
                                        </span>
                                    </div>
                                    <h2 className="text-4xl lg:text-5xl font-extralight text-gray-900 leading-tight tracking-wide mb-4">
                                        {user.name}
                                    </h2>
                                    <p className="text-gray-600 font-light leading-relaxed">
                                        Manage your account settings and preferences.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                                    <div className="bg-gray-50 p-8">
                                        <div className="flex items-center mb-4">
                                            <HiUser className="w-6 h-6 text-red-500 mr-3" />
                                            <h3 className="text-xl font-light text-gray-900">Account Information</h3>
                                        </div>
                                        <div className="space-y-3">
                                            <div>
                                                <span className="text-sm text-gray-500 font-light">Email:</span>
                                                <p className="text-gray-900 font-light">{user.email}</p>
                                            </div>
                                            <div>
                                                <span className="text-sm text-gray-500 font-light">Member Since:</span>
                                                <p className="text-gray-900 font-light">
                                                    {new Date(user.createdAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <div>
                                                <span className="text-sm text-gray-500 font-light">Status:</span>
                                                <p className="text-gray-900 font-light">
                                                    {user.isVerified ? 'Verified' : 'Pending Verification'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 p-8">
                                        <div className="flex items-center mb-4">
                                            <HiLogout className="w-6 h-6 text-red-500 mr-3" />
                                            <h3 className="text-xl font-light text-gray-900">Account Actions</h3>
                                        </div>
                                        <div className="space-y-4">
                                            <button
                                                onClick={logout}
                                                className="w-full bg-transparent border border-gray-300 text-gray-900 py-3 px-6 font-light tracking-wide hover:border-red-500 hover:text-red-500 transition-all duration-300"
                                            >
                                                Sign Out
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white py-16 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                {/* Breadcrumb */}
                <nav className="mb-12">
                    <ol className="flex items-center space-x-3 text-sm text-gray-500 font-light">
                        <li>
                            <a href="/" className="hover:text-red-500 transition-colors duration-300 relative group">
                                Home
                                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-red-500 transition-all duration-300 ease-out group-hover:w-full"></span>
                            </a>
                        </li>
                        <li className="text-gray-300"><HiChevronRight className="w-4 h-4" /></li>
                        <li className="text-gray-900 font-light">My Account</li>
                    </ol>
                </nav>

                {/* Main Content */}
                <div className="bg-white border border-gray-100 rounded-none shadow-sm overflow-hidden">
                    <div className="flex flex-col lg:flex-row">
                        {/* Login Section */}
                        <div className="flex-1 p-12 lg:p-16">
                            <div className="max-w-md mx-auto">
                                <div className="mb-12">
                                    <div className="inline-block mb-4">
                                        <span className="text-red-500 text-sm font-light tracking-widest uppercase border-b border-red-200 pb-2">
                                            Welcome Back
                                        </span>
                                    </div>
                                    <h2 className="text-4xl lg:text-5xl font-extralight text-gray-900 leading-tight tracking-wide mb-4">
                                        Sign In
                                    </h2>
                                    <p className="text-gray-600 font-light leading-relaxed">
                                        Access your personalized shopping experience with ease and elegance.
                                    </p>
                                </div>

                                {loginSuccess && (
                                    <div className="text-green-600 text-sm bg-green-50 p-4 border border-green-100 font-light mb-6">
                                        {loginSuccess}
                                    </div>
                                )}

                                <form onSubmit={handleLoginSubmit} className="space-y-8">
                                    <div>
                                        <label htmlFor="login-email" className="block text-sm font-light text-gray-700 mb-3 tracking-wide">
                                            Email Address
                                        </label>
                                        <div className="relative">
                                            <input
                                                id="login-email"
                                                type="email"
                                                value={loginForm.email}
                                                onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                                                className={`w-full px-6 py-4 pr-12 border rounded-none focus:outline-none transition-all duration-300 font-light placeholder-gray-400 ${showLoginValidation && loginForm.email.length > 0
                                                    ? loginValidation.email
                                                        ? 'border-red-300 focus:border-red-500'
                                                        : 'border-green-300 focus:border-green-500'
                                                    : 'border-gray-200 focus:border-gray-400'
                                                    }`}
                                                placeholder="Enter your email"
                                            />

                                            {renderValidationMessage(loginValidation.email || '', !loginValidation.email, showLoginValidation)}
                                        </div>
                                    </div>

                                    <div>
                                        <label htmlFor="login-password" className="block text-sm font-light text-gray-700 mb-3 tracking-wide">
                                            Password
                                        </label>
                                        <div className="relative">
                                            <input
                                                id="login-password"
                                                type={showPassword ? 'text' : 'password'}
                                                value={loginForm.password}
                                                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                                                className={`w-full px-6 py-4 pr-20 border rounded-none focus:outline-none transition-all duration-300 font-light placeholder-gray-400 ${showLoginValidation && loginForm.password.length > 0
                                                    ? loginValidation.password
                                                        ? 'border-red-300 focus:border-red-500'
                                                        : 'border-green-300 focus:border-green-500'
                                                    : 'border-gray-200 focus:border-gray-400'
                                                    }`}
                                                placeholder="Enter your password"
                                            />
                                            <button
                                                type="button"
                                                onClick={togglePasswordVisibility}
                                                className="absolute inset-y-0 right-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors duration-300"
                                            >
                                                {showPassword ? (
                                                    <HiEyeOff className="h-5 w-5" />
                                                ) : (
                                                    <HiEye className="h-5 w-5" />
                                                )}
                                            </button>

                                            {renderValidationMessage(loginValidation.password || '', !loginValidation.password, showLoginValidation)}
                                        </div>
                                    </div>

                                    {loginError && (
                                        <div className="text-red-500 text-sm bg-red-50 p-4 border border-red-100 font-light">
                                            {loginError}
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="group relative w-full bg-transparent border border-gray-300 text-gray-900 py-4 px-6 font-light tracking-wide hover:border-red-500 transition-all duration-300 overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <span className="relative z-10 group-hover:text-white transition-colors duration-300">
                                            {isLoading ? 'Signing In...' : 'Sign In'}
                                        </span>
                                        <div className="absolute inset-0 bg-red-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
                                    </button>

                                    <div className="text-center">
                                        <a href="#" className="text-sm text-gray-500 hover:text-red-500 transition-colors duration-300 font-light relative group">
                                            Forgot your password?
                                            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-red-500 transition-all duration-300 ease-out group-hover:w-full"></span>
                                        </a>
                                    </div>
                                </form>
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="hidden lg:flex items-center justify-center px-6">
                            <div className="relative">
                                <div className="absolute top-1/2 left-0 transform -translate-y-1/2 bg-white border border-gray-200 rounded-full w-12 h-12 flex items-center justify-center">
                                    <span className="text-sm text-gray-400 font-light tracking-wide">or</span>
                                </div>
                            </div>
                        </div>

                        {/* Register Section */}
                        <div className="flex-1 p-12 lg:p-16 bg-gray-50">
                            <div className="max-w-md mx-auto">
                                <div className="mb-12">
                                    <div className="inline-block mb-4">
                                        <span className="text-red-500 text-sm font-light tracking-widest uppercase border-b border-red-200 pb-2">
                                            New Customer
                                        </span>
                                    </div>
                                    <h2 className="text-4xl lg:text-5xl font-extralight text-gray-900 leading-tight tracking-wide mb-4">
                                        Create Account
                                    </h2>
                                    <p className="text-gray-600 font-light leading-relaxed">
                                        Join our community and unlock exclusive benefits and personalized experiences.
                                    </p>
                                </div>

                                {registerSuccess && (
                                    <div className="text-green-600 text-sm bg-green-50 p-4 border border-green-100 font-light mb-6">
                                        {registerSuccess}
                                    </div>
                                )}

                                <form onSubmit={handleRegisterSubmit} className="space-y-8">
                                    <div>
                                        <label htmlFor="register-name" className="block text-sm font-light text-gray-700 mb-3 tracking-wide">
                                            Full Name
                                        </label>
                                        <div className="relative">
                                            <input
                                                id="register-name"
                                                type="text"
                                                value={registerForm.username}
                                                onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value })}
                                                className={`w-full px-6 py-4 pr-12 border rounded-none focus:outline-none transition-all duration-300 font-light placeholder-gray-400 ${showRegisterValidation && registerForm.username.length > 0
                                                    ? registerValidation.username
                                                        ? 'border-red-300 focus:border-red-500'
                                                        : 'border-green-300 focus:border-green-500'
                                                    : 'border-gray-200 focus:border-gray-400'
                                                    }`}
                                                placeholder="Enter your full name"
                                            />

                                            {renderValidationMessage(registerValidation.username || '', !registerValidation.username, showRegisterValidation)}
                                        </div>
                                    </div>

                                    <div>
                                        <label htmlFor="register-email" className="block text-sm font-light text-gray-700 mb-3 tracking-wide">
                                            Email Address
                                        </label>
                                        <div className="relative">
                                            <input
                                                id="register-email"
                                                type="email"
                                                value={registerForm.email}
                                                onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                                                className={`w-full px-6 py-4 pr-12 border rounded-none focus:outline-none transition-all duration-300 font-light placeholder-gray-400 ${showRegisterValidation && registerForm.email.length > 0
                                                    ? registerValidation.email
                                                        ? 'border-red-300 focus:border-red-500'
                                                        : 'border-green-300 focus:border-green-500'
                                                    : 'border-gray-200 focus:border-gray-400'
                                                    }`}
                                                placeholder="Enter your email"
                                            />

                                            {renderValidationMessage(registerValidation.email || '', !registerValidation.email, showRegisterValidation)}
                                        </div>
                                    </div>

                                    <div>
                                        <label htmlFor="register-password" className="block text-sm font-light text-gray-700 mb-3 tracking-wide">
                                            Password
                                        </label>
                                        <div className="relative">
                                            <input
                                                id="register-password"
                                                type={showConfirmPassword ? 'text' : 'password'}
                                                value={registerForm.password}
                                                onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                                                className={`w-full px-6 py-4 pr-20 border rounded-none focus:outline-none transition-all duration-300 font-light placeholder-gray-400 ${showRegisterValidation && registerForm.password.length > 0
                                                    ? registerValidation.password
                                                        ? 'border-red-300 focus:border-red-500'
                                                        : 'border-green-300 focus:border-green-500'
                                                    : 'border-gray-200 focus:border-gray-400'
                                                    }`}
                                                placeholder="Create a password"
                                            />
                                            <button
                                                type="button"
                                                onClick={toggleConfirmPasswordVisibility}
                                                className="absolute inset-y-0 right-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors duration-300"
                                            >
                                                {showConfirmPassword ? (
                                                    <HiEyeOff className="h-5 w-5" />
                                                ) : (
                                                    <HiEye className="h-5 w-5" />
                                                )}
                                            </button>

                                            {renderValidationMessage(registerValidation.password || '', !registerValidation.password, showRegisterValidation)}
                                        </div>
                                    </div>

                                    <div>
                                        <label htmlFor="register-confirm-password" className="block text-sm font-light text-gray-700 mb-3 tracking-wide">
                                            Confirm Password
                                        </label>
                                        <div className="relative">
                                            <input
                                                id="register-confirm-password"
                                                type="password"
                                                value={registerForm.confirmPassword}
                                                onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                                                className={`w-full px-6 py-4 pr-12 border rounded-none focus:outline-none transition-all duration-300 font-light placeholder-gray-400 ${showRegisterValidation && registerForm.confirmPassword.length > 0
                                                    ? registerValidation.confirmPassword
                                                        ? 'border-red-300 focus:border-red-500'
                                                        : 'border-green-300 focus:border-green-500'
                                                    : 'border-gray-200 focus:border-gray-400'
                                                    }`}
                                                placeholder="Confirm your password"
                                            />

                                            {renderValidationMessage(registerValidation.confirmPassword || '', !registerValidation.confirmPassword, showRegisterValidation)}
                                        </div>
                                    </div>

                                    <p className="text-xs text-gray-500 leading-relaxed font-light">
                                        By creating an account, you agree to our terms of service and privacy policy. Your personal data will be handled with the utmost care and security.
                                    </p>

                                    {registerError && (
                                        <div className="text-red-500 text-sm bg-red-50 p-4 border border-red-100 font-light">
                                            {registerError}
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="group relative w-full bg-transparent border border-gray-300 text-gray-900 py-4 px-6 font-light tracking-wide hover:border-red-500 transition-all duration-300 overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <span className="relative z-10 group-hover:text-white transition-colors duration-300">
                                            {isLoading ? 'Creating Account...' : 'Create Account'}
                                        </span>
                                        <div className="absolute inset-0 bg-red-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
                                    </button>

                                    <div className="mt-12 pt-8 border-t border-gray-200">
                                        <h3 className="text-xl font-light text-gray-900 mb-6 tracking-wide">
                                            Exclusive Benefits
                                        </h3>
                                        <ul className="space-y-4">
                                            <li className="flex items-start">
                                                <div className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-4 flex-shrink-0"></div>
                                                <span className="text-gray-600 font-light leading-relaxed">Expedited checkout process for seamless shopping</span>
                                            </li>
                                            <li className="flex items-start">
                                                <div className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-4 flex-shrink-0"></div>
                                                <span className="text-gray-600 font-light leading-relaxed">Comprehensive order tracking and management</span>
                                            </li>
                                            <li className="flex items-start">
                                                <div className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-4 flex-shrink-0"></div>
                                                <span className="text-gray-600 font-light leading-relaxed">Personalized recommendations and exclusive offers</span>
                                            </li>
                                            <li className="flex items-start">
                                                <div className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-4 flex-shrink-0"></div>
                                                <span className="text-gray-600 font-light leading-relaxed">Complete purchase history and warranty tracking</span>
                                            </li>
                                        </ul>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MyAccountPage;
