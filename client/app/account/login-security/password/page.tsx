/* eslint-disable react/forbid-dom-props */
'use client';

import React, {
    useState,
    useEffect,
    useCallback,
    useRef,
} from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useLanguage } from '../../../contexts/LanguageContext';
import {
    Breadcrumb,
    generateBreadcrumbItems,
} from '../../../components/Breadcrumb';
import { buildApiUrl, API_CONFIG } from '../../../config/api';
import { HiLockClosed } from 'react-icons/hi2';
import { useBackendMessageTranslation } from '../../../hooks/useBackendMessageTranslation';

interface PasswordValidationErrors {
    currentPassword?: string;
    newPassword?: string;
    confirmNewPassword?: string;
}

export default function LoginSecurityPage() {
    const { user, isLoading, logout } = useAuth();
    const { t, locale } = useLanguage();
    const router = useRouter();
    const pathname = usePathname();

    // Password change form state
    const [passwordFormData, setPasswordFormData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: '',
    });

    const [passwordValidationErrors, setPasswordValidationErrors] =
        useState<PasswordValidationErrors>({});
    const [passwordTouched, setPasswordTouched] = useState({
        currentPassword: false,
        newPassword: false,
        confirmNewPassword: false,
    });

    const [isPasswordFormLoading, setIsPasswordFormLoading] = useState(false);

    // Use the backend message translation hook for password messages
    const {
        error: passwordError,
        success: passwordSuccessMessage,
        errorKey: passwordErrorKey,
        successKey: passwordSuccessKey,
        setErrorKey: setPasswordErrorKey,
        setSuccessKey: setPasswordSuccessKey,
        setBackendError: setPasswordBackendError,
        setBackendSuccess: setPasswordBackendSuccess,
        clearError: clearPasswordError,
        clearSuccess: clearPasswordSuccess,
    } = useBackendMessageTranslation();

    const [currentPasswordType, setCurrentPasswordType] = useState<
        'text' | 'password'
    >('text');
    const [currentPasswordValue, setCurrentPasswordValue] = useState('');

    const currentPasswordRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // Redirect unauthenticated users to login
        if (!isLoading && !user) {
            router.push('/auth');
        }
    }, [user, isLoading, router]);

    // Set text security styles via refs to avoid inline style warnings
    useEffect(() => {
        if (currentPasswordRef.current) {
            (currentPasswordRef.current.style as any).webkitTextSecurity =
                currentPasswordType === 'password' ? 'disc' : 'none';
            (currentPasswordRef.current.style as any).textSecurity =
                currentPasswordType === 'password' ? 'disc' : 'none';
        }
    }, [currentPasswordType]);

    // Optimized auto-fill prevention - only on focus, no intervals
    useEffect(() => {
        const handleFocus = (e: FocusEvent) => {
            const target = e.target as HTMLInputElement;
            if (
                target &&
                (target.id === 'currentPassword' || target.name === 'disablePassword')
            ) {
                // Clear field if it contains common auto-filled values
                const commonPasswords = [
                    'password',
                    '123456',
                    'admin',
                    'test',
                    'user',
                    'login',
                ];
                if (commonPasswords.includes(target.value.toLowerCase())) {
                    target.value = '';
                    if (target.id === 'currentPassword') {
                        setCurrentPasswordValue('');
                        setPasswordFormData((prev) => ({ ...prev, currentPassword: '' }));
                    }
                }
            }
        };

        document.addEventListener('focusin', handleFocus);
        return () => document.removeEventListener('focusin', handleFocus);
    }, []);

    // Password validation functions - memoized for performance
    const validateCurrentPassword = useCallback(
        (password: string): string | undefined => {
            if (!password.trim()) {
                return 'account.loginSecurity.password.currentPasswordRequired';
            }
            return undefined;
        },
        []
    );

    const validateNewPassword = useCallback(
        (password: string): string | undefined => {
            if (!password.trim()) {
                return 'account.loginSecurity.password.newPasswordRequired';
            }
            if (password.length < 8) {
                return 'account.loginSecurity.password.passwordTooShort';
            }
            return undefined;
        },
        []
    );

    const validateConfirmNewPassword = useCallback(
        (password: string, confirmPassword: string): string | undefined => {
            if (!confirmPassword.trim()) {
                return 'account.loginSecurity.password.confirmPasswordRequired';
            }
            if (password !== confirmPassword) {
                return 'account.loginSecurity.password.passwordsDoNotMatch';
            }
            return undefined;
        },
        []
    );

    // Validate all password fields - memoized
    const validatePasswordForm = useCallback((): boolean => {
        const errors: PasswordValidationErrors = {};

        const currentPasswordError = validateCurrentPassword(
            passwordFormData.currentPassword
        );
        if (currentPasswordError) errors.currentPassword = currentPasswordError;

        const newPasswordError = validateNewPassword(passwordFormData.newPassword);
        if (newPasswordError) errors.newPassword = newPasswordError;

        const confirmPasswordError = validateConfirmNewPassword(
            passwordFormData.newPassword,
            passwordFormData.confirmNewPassword
        );
        if (confirmPasswordError) errors.confirmNewPassword = confirmPasswordError;

        setPasswordValidationErrors(errors);
        return Object.keys(errors).length === 0;
    }, [
        passwordFormData,
        validateCurrentPassword,
        validateNewPassword,
        validateConfirmNewPassword,
    ]);

    // Validate single password field - memoized
    const validatePasswordField = useCallback(
        (name: string, value: string) => {
            let error: string | undefined;

            switch (name) {
                case 'currentPassword':
                    error = validateCurrentPassword(value);
                    break;
                case 'newPassword':
                    error = validateNewPassword(value);
                    break;
                case 'confirmNewPassword':
                    error = validateConfirmNewPassword(
                        passwordFormData.newPassword,
                        value
                    );
                    break;
            }

            setPasswordValidationErrors((prev) => ({
                ...prev,
                [name]: error,
            }));
        },
        [
            passwordFormData.newPassword,
            validateCurrentPassword,
            validateNewPassword,
            validateConfirmNewPassword,
        ]
    );

    // Handle password form data changes - memoized
    const handlePasswordInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const { name, value } = e.target;
            setPasswordFormData((prev) => ({
                ...prev,
                [name]: value,
            }));

            // Clear error when user starts typing
            if (name in passwordValidationErrors) {
                setPasswordValidationErrors((prev) => ({
                    ...prev,
                    [name]: undefined,
                }));
            }
        },
        [passwordValidationErrors]
    );

    // Handle password field blur for validation - memoized
    const handlePasswordBlur = useCallback(
        (e: React.FocusEvent<HTMLInputElement>) => {
            const { name, value } = e.target;
            setPasswordTouched((prev) => ({
                ...prev,
                [name]: true,
            }));
            validatePasswordField(name, value);
        },
        [validatePasswordField]
    );

    // Get password input class based on validation state - memoized
    const getPasswordInputClass = useCallback(
        (fieldName: keyof PasswordValidationErrors) => {
            const hasError =
                passwordTouched[fieldName as keyof typeof passwordTouched] &&
                passwordValidationErrors[fieldName];
            const baseClasses =
                'w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-black focus:bg-gray-50 transition-all duration-300 text-sm sm:text-base min-h-[44px] sm:min-h-[48px]';
            const alignmentClasses = locale === 'ar' ? 'text-right' : 'text-left';
            const errorClasses = hasError
                ? 'bg-gray-50 border border-red-500 placeholder-gray-400 focus:border-red-500'
                : 'bg-gray-50 border border-gray-300 placeholder-gray-400 focus:border-purple-600';

            return `${baseClasses} ${alignmentClasses} ${errorClasses}`;
        },
        [passwordTouched, passwordValidationErrors, locale]
    );

    // Don't render anything if user is not authenticated (will redirect)
    if (!isLoading && !user) {
        return null;
    }

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        clearPasswordError();
        clearPasswordSuccess();
        setIsPasswordFormLoading(true);

        // Mark all fields as touched
        setPasswordTouched({
            currentPassword: true,
            newPassword: true,
            confirmNewPassword: true,
        });

        // Validate form before submission
        if (!validatePasswordForm()) {
            setIsPasswordFormLoading(false);
            return;
        }

        try {
            const response = await fetch(
                buildApiUrl(API_CONFIG.ENDPOINTS.USERS.CHANGE_PASSWORD),
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include', // This is crucial for sending cookies!
                    body: JSON.stringify({
                        currentPassword: passwordFormData.currentPassword,
                        newPassword: passwordFormData.newPassword,
                        confirmNewPassword: passwordFormData.confirmNewPassword,
                    }),
                }
            );

            const data = await response.json();

            if (response.ok) {
                // Check if force logout is required
                if (data.forceLogout) {
                    // Force logout immediately
                    await logout();
                    window.location.href = '/auth';
                    return;
                }

                // Handle success message from backend or use default
                if (data.message) {
                    setPasswordBackendSuccess(data.message);
                } else {
                    setPasswordSuccessKey('account.loginSecurity.password.success');
                }

                // Reset form
                setPasswordFormData({
                    currentPassword: '',
                    newPassword: '',
                    confirmNewPassword: '',
                });
                setPasswordTouched({
                    currentPassword: false,
                    newPassword: false,
                    confirmNewPassword: false,
                });
                setPasswordValidationErrors({});

                // Logout user after successful password change
                setTimeout(() => {
                    logout();
                }, 2000); // Wait 2 seconds to show success message
            } else {
                if (data.messageKey) {
                    setPasswordErrorKey(data.messageKey);
                } else if (data.message) {
                    setPasswordBackendError(data.message);
                } else {
                    // Handle specific error cases
                    if (response.status === 401) {
                        setPasswordErrorKey(
                            'account.loginSecurity.password.currentPasswordIncorrect'
                        );
                    } else {
                        setPasswordErrorKey('account.messages.generalError');
                    }
                }
            }
        } catch (error) {
            setPasswordErrorKey('account.messages.generalError');
        } finally {
            setIsPasswordFormLoading(false);
        }
    };

    return (
        <div className="min-h-screen">
            {/* Main Content Area */}
            <div className="p-3 sm:p-4 md:p-6 lg:p-8 xl:p-12">
                <div className="account max-w-4xl mx-auto">
                    {/* Breadcrumb */}
                    <div
                        className={`mb-6 ${locale === 'ar' ? 'text-right flex justify-end' : 'text-left'
                            }`}
                    >
                        <Breadcrumb items={generateBreadcrumbItems(pathname, t, locale)} />
                    </div>

                    {/* Tab Content */}
                    <div className="bg-white backdrop-blur-sm rounded-xl p-4 sm:p-6 md:p-8 border border-gray-200 shadow-none">

                        <div>
                            <h2
                                className={`text-base sm:text-lg font-semibold text-black mb-1 sm:mb-2 ${locale === 'ar' ? 'text-right' : 'text-left'
                                    }`}
                            >
                                {t('account.loginSecurity.password.title')}
                            </h2>
                            <p
                                className={`text-xs sm:text-sm text-gray-600 mb-4 sm:mb-6 ${locale === 'ar' ? 'text-right' : 'text-left'
                                    }`}
                            >
                                {t('account.loginSecurity.password.subtitle')}
                            </p>

                            {/* Security Notice */}
                            <div className="bg-purple-100 border border-purple-300 rounded-lg p-3 sm:p-4 mb-6">
                                <div
                                    className={`flex items-start ${locale === 'ar' ? 'flex-row-reverse' : ''
                                        }`}
                                >
                                    <svg
                                        className={`w-4 h-4 sm:w-5 sm:h-5 text-purple-600 mt-0.5 flex-shrink-0 ${locale === 'ar' ? 'ml-2 sm:ml-3' : 'mr-2 sm:mr-3'
                                            }`}
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                    <div>
                                        <p
                                            className={`text-purple-700 text-xs sm:text-sm font-medium mb-1 ${locale === 'ar' ? 'text-right' : 'text-left'
                                                }`}
                                        >
                                            {t('account.loginSecurity.password.securityNotice')}
                                        </p>
                                        <p
                                            className={`text-purple-600 text-xs sm:text-sm ${locale === 'ar' ? 'text-right' : 'text-left'
                                                }`}
                                        >
                                            {t(
                                                'account.loginSecurity.password.securityNoticeMessage'
                                            )}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Error Message */}
                            {(passwordError || passwordErrorKey) && (
                                <div className="bg-red-100 border border-red-300 rounded-lg p-3 mb-6 backdrop-blur-sm">
                                    <p
                                        className={`text-red-700 text-sm ${locale === 'ar' ? 'text-right' : 'text-left'
                                            }`}
                                    >
                                        {passwordError ||
                                            (passwordErrorKey ? t(passwordErrorKey) : '')}
                                    </p>
                                </div>
                            )}

                            {/* Success Message */}
                            {(passwordSuccessMessage || passwordSuccessKey) && (
                                <div className="bg-green-100 border border-green-300 rounded-lg p-3 mb-6 backdrop-blur-sm">
                                    <p
                                        className={`text-green-700 text-sm ${locale === 'ar' ? 'text-right' : 'text-left'
                                            }`}
                                    >
                                        {passwordSuccessMessage ||
                                            (passwordSuccessKey ? t(passwordSuccessKey) : '')}
                                    </p>
                                </div>
                            )}

                            <form
                                onSubmit={handlePasswordSubmit}
                                className="space-y-4 sm:space-y-6"
                            >
                                {/* Hidden dummy fields to prevent auto-fill */}
                                <div className="hidden">
                                    <label htmlFor="hidden-username" className="sr-only">
                                        Hidden username field
                                    </label>
                                    <input
                                        id="hidden-username"
                                        type="text"
                                        name="username"
                                        autoComplete="username"
                                        aria-hidden="true"
                                        tabIndex={-1}
                                    />
                                    <label htmlFor="hidden-password" className="sr-only">
                                        Hidden password field
                                    </label>
                                    <input
                                        id="hidden-password"
                                        type="password"
                                        name="password"
                                        autoComplete="current-password"
                                        aria-hidden="true"
                                        tabIndex={-1}
                                    />
                                </div>

                                {/* Current Password Field */}
                                <div>
                                    <label
                                        htmlFor="currentPassword"
                                        className={`block text-sm font-medium text-gray-700 mb-2 ${locale === 'ar' ? 'text-right' : 'text-left'
                                            }`}
                                    >
                                        <div
                                            className={`flex items-center ${locale === 'ar' ? 'flex-row-reverse' : ''
                                                }`}
                                        >
                                            {HiLockClosed({
                                                className: `w-4 h-4 ${locale === 'ar' ? 'ml-2' : 'mr-2'
                                                    }`,
                                            })}
                                            {t('account.loginSecurity.password.currentPassword')}
                                        </div>
                                    </label>
                                    <div className="relative">
                                        <input
                                            ref={currentPasswordRef}
                                            type="text"
                                            id="currentPassword"
                                            name="currentPassword"
                                            value={currentPasswordValue}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                setCurrentPasswordValue(value);
                                                setPasswordFormData((prev) => ({
                                                    ...prev,
                                                    currentPassword: value,
                                                }));
                                                // Switch to password type after user starts typing
                                                if (
                                                    currentPasswordType === 'text' &&
                                                    value.length > 0
                                                ) {
                                                    setCurrentPasswordType('password');
                                                }
                                            }}
                                            onBlur={(e) => {
                                                handlePasswordBlur(e);
                                            }}
                                            onFocus={() => {
                                                // Switch to password type when focused
                                                setCurrentPasswordType('password');
                                            }}
                                            className={getPasswordInputClass('currentPassword')}
                                            placeholder={t(
                                                'account.loginSecurity.password.currentPasswordPlaceholder'
                                            )}
                                            dir={locale === 'ar' ? 'rtl' : 'ltr'}
                                            autoComplete="off"
                                            autoCorrect="off"
                                            autoCapitalize="off"
                                            spellCheck="false"
                                            data-form-type="other"
                                            data-lpignore="true"
                                            data-1p-ignore="true"
                                            data-bwignore="true"
                                            data-dashlane-ignore="true"
                                            data-bitwarden-ignore="true"
                                            data-keeppass-ignore="true"
                                            data-keepass-ignore="true"
                                            data-roboform-ignore="true"
                                            data-enpass-ignore="true"
                                            data-nordpass-ignore="true"
                                            data-protonpass-ignore="true"
                                            data-ignore="true"
                                            data-save="false"
                                            data-saved="false"
                                            data-autofill="false"
                                            data-autocomplete="false"
                                        />
                                    </div>
                                    {passwordTouched.currentPassword &&
                                        passwordValidationErrors.currentPassword && (
                                            <p
                                                className={`text-red-600 text-xs mt-1 ${locale === 'ar' ? 'text-right' : 'text-left'
                                                    }`}
                                            >
                                                {t(passwordValidationErrors.currentPassword)}
                                            </p>
                                        )}
                                </div>

                                {/* New Password Field */}
                                <div>
                                    <label
                                        htmlFor="newPassword"
                                        className={`block text-sm font-medium text-gray-700 mb-2 ${locale === 'ar' ? 'text-right' : 'text-left'
                                            }`}
                                    >
                                        <div
                                            className={`flex items-center ${locale === 'ar' ? 'flex-row-reverse' : ''
                                                }`}
                                        >
                                            {HiLockClosed({
                                                className: `w-4 h-4 ${locale === 'ar' ? 'ml-2' : 'mr-2'
                                                    }`,
                                            })}
                                            {t('account.loginSecurity.password.newPassword')}
                                        </div>
                                    </label>
                                    <input
                                        type="password"
                                        id="newPassword"
                                        name="newPassword"
                                        value={passwordFormData.newPassword}
                                        onChange={handlePasswordInputChange}
                                        onBlur={handlePasswordBlur}
                                        className={getPasswordInputClass('newPassword')}
                                        placeholder={t(
                                            'account.loginSecurity.password.newPasswordPlaceholder'
                                        )}
                                        dir={locale === 'ar' ? 'rtl' : 'ltr'}
                                    />
                                    {passwordTouched.newPassword &&
                                        passwordValidationErrors.newPassword && (
                                            <p
                                                className={`text-red-600 text-xs mt-1 ${locale === 'ar' ? 'text-right' : 'text-left'
                                                    }`}
                                            >
                                                {t(passwordValidationErrors.newPassword)}
                                            </p>
                                        )}
                                    <p
                                        className={`text-gray-500 text-xs mt-1 ${locale === 'ar' ? 'text-right' : 'text-left'
                                            }`}
                                    >
                                        {t('account.loginSecurity.password.passwordRequirement')}
                                    </p>
                                </div>

                                {/* Confirm New Password Field */}
                                <div>
                                    <label
                                        htmlFor="confirmNewPassword"
                                        className={`block text-sm font-medium text-gray-700 mb-2 ${locale === 'ar' ? 'text-right' : 'text-left'
                                            }`}
                                    >
                                        <div
                                            className={`flex items-center ${locale === 'ar' ? 'flex-row-reverse' : ''
                                                }`}
                                        >
                                            {HiLockClosed({
                                                className: `w-4 h-4 ${locale === 'ar' ? 'ml-2' : 'mr-2'
                                                    }`,
                                            })}
                                            {t('account.loginSecurity.password.confirmNewPassword')}
                                        </div>
                                    </label>
                                    <input
                                        type="password"
                                        id="confirmNewPassword"
                                        name="confirmNewPassword"
                                        value={passwordFormData.confirmNewPassword}
                                        onChange={handlePasswordInputChange}
                                        onBlur={handlePasswordBlur}
                                        className={getPasswordInputClass('confirmNewPassword')}
                                        placeholder={t(
                                            'account.loginSecurity.password.confirmNewPasswordPlaceholder'
                                        )}
                                        dir={locale === 'ar' ? 'rtl' : 'ltr'}
                                    />
                                    {passwordTouched.confirmNewPassword &&
                                        passwordValidationErrors.confirmNewPassword && (
                                            <p
                                                className={`text-red-600 text-xs mt-1 ${locale === 'ar' ? 'text-right' : 'text-left'
                                                    }`}
                                            >
                                                {t(passwordValidationErrors.confirmNewPassword)}
                                            </p>
                                        )}
                                </div>

                                {/* Submit Button */}
                                <div className="pt-4">
                                    <button
                                        type="submit"
                                        disabled={isPasswordFormLoading}
                                        className="w-full bg-black text-white font-semibold py-3 px-6 rounded-lg hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 text-sm sm:text-base disabled:cursor-not-allowed disabled:opacity-60 min-h-[48px] flex items-center justify-center"
                                    >
                                        {isPasswordFormLoading ? (
                                            <>{t('account.loginSecurity.password.changing')}</>
                                        ) : (
                                            t('account.loginSecurity.password.changePassword')
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
