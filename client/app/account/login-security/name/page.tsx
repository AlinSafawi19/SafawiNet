/* eslint-disable react/forbid-dom-props */
'use client';

import React, {
    useState,
    useEffect,
    useCallback,
} from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useLanguage } from '../../../contexts/LanguageContext';
import {
    Breadcrumb,
    generateBreadcrumbItems,
} from '../../../components/Breadcrumb';
import { buildApiUrl, API_CONFIG } from '../../../config/api';
import { HiUser } from 'react-icons/hi2';

interface ProfileValidationErrors {
    name?: string;
}

export default function LoginSecurityPage() {
    const { user, isLoading, updateUser } = useAuth();
    const { t, locale } = useLanguage();
    const router = useRouter();
    const pathname = usePathname();

    // Profile form state
    const [profileFormData, setProfileFormData] = useState({
        name: '',
    });

    // Track original name to detect changes
    const [originalName, setOriginalName] = useState('');

    const [profileValidationErrors, setProfileValidationErrors] =
        useState<ProfileValidationErrors>({});
    const [profileTouched, setProfileTouched] = useState({
        name: false,
    });

    const [isProfileFormLoading, setIsProfileFormLoading] = useState(false);
    const [profileError, setProfileError] = useState('');
    const [profileSuccessMessage, setProfileSuccessMessage] = useState('');
    const [profileErrorKey, setProfileErrorKey] = useState('');
    const [profileSuccessKey, setProfileSuccessKey] = useState('');


    useEffect(() => {
        // Redirect unauthenticated users to login
        if (!isLoading && !user) {
            router.push('/auth');
        }
    }, [user, isLoading, router]);

    // Profile validation functions - memoized for performance
    const validateName = useCallback((name: string): string | undefined => {
        if (!name.trim()) {
            return 'account.validation.nameRequired';
        }
        if (name.length > 100) {
            return 'account.validation.nameTooLong';
        }
        return undefined;
    }, []);

    // Check if name has changed - memoized
    const hasNameChanged = useCallback((): boolean => {
        return profileFormData.name.trim() !== originalName.trim();
    }, [profileFormData.name, originalName]);

      // Validate all profile fields - memoized
  const validateProfileForm = useCallback((): boolean => {
    const errors: ProfileValidationErrors = {};

    const nameError = validateName(profileFormData.name);
    if (nameError) errors.name = nameError;

    setProfileValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [profileFormData.name, validateName]);

    // Validate single profile field - memoized
    const validateProfileField = useCallback(
        (name: string, value: string) => {
            let error: string | undefined;

            switch (name) {
                case 'name':
                    error = validateName(value);
                    break;
            }

            setProfileValidationErrors((prev) => ({
                ...prev,
                [name]: error,
            }));
        },
        [validateName]
    );

    // Handle profile form data changes - memoized
    const handleProfileInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const { name, value } = e.target;
            setProfileFormData((prev) => ({
                ...prev,
                [name]: value,
            }));

            // Clear error when user starts typing
            if (name in profileValidationErrors) {
                setProfileValidationErrors((prev) => ({
                    ...prev,
                    [name]: undefined,
                }));
            }
        },
        [profileValidationErrors]
    );

    // Handle profile field blur for validation - memoized
    const handleProfileBlur = useCallback(
        (e: React.FocusEvent<HTMLInputElement>) => {
            const { name, value } = e.target;
            setProfileTouched((prev) => ({
                ...prev,
                [name]: true,
            }));
            validateProfileField(name, value);
        },
        [validateProfileField]
    );

    // Get profile input class based on validation state - memoized
    const getProfileInputClass = useCallback(
        (fieldName: keyof ProfileValidationErrors) => {
            const hasError =
                profileTouched[fieldName as keyof typeof profileTouched] &&
                profileValidationErrors[fieldName];
            const baseClasses =
                'w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-black focus:bg-gray-50 transition-all duration-300 text-sm sm:text-base min-h-[44px] sm:min-h-[48px]';
            const alignmentClasses = locale === 'ar' ? 'text-right' : 'text-left';
            const errorClasses = hasError
                ? 'bg-gray-50 border border-red-500 placeholder-gray-400 focus:border-red-500'
                : 'bg-gray-50 border border-gray-300 placeholder-gray-400 focus:border-purple-600';

            return `${baseClasses} ${alignmentClasses} ${errorClasses}`;
        },
        [profileTouched, profileValidationErrors, locale]
    );

    // Don't render anything if user is not authenticated (will redirect)
    if (!isLoading && !user) {
        return null;
    }

    const handleProfileSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setProfileError('');
        setProfileErrorKey('');
        setProfileSuccessMessage('');
        setProfileSuccessKey('');
        setIsProfileFormLoading(true);

        // Mark all fields as touched
        setProfileTouched({
            name: true,
        });

        // Check if name has actually changed
        if (!hasNameChanged()) {
            setProfileErrorKey('account.messages.noChanges');
            setProfileError('');
            setIsProfileFormLoading(false);
            return;
        }

        // Validate form before submission
        if (!validateProfileForm()) {
            setIsProfileFormLoading(false);
            return;
        }

        try {
            const response = await fetch(
                buildApiUrl(API_CONFIG.ENDPOINTS.USERS.UPDATE_PROFILE),
                {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        name: profileFormData.name.trim(),
                    }),
                }
            );

            const data = await response.json();

            if (response.ok) {
                // Update user in context - handle nested user structure
                const userData = data.user?.user || data.user;
                if (userData) {
                    updateUser(userData);
                    // Directly update form data with the new values
                    const newName = userData.name || '';
                    setProfileFormData({
                        name: newName,
                    });
                    // Update original name to reflect the new value
                    setOriginalName(newName);
                }

                setProfileSuccessKey('account.messages.updateSuccess');
                setProfileSuccessMessage('');
                setProfileError('');
                setProfileErrorKey('');
            } else {
                if (data.messageKey) {
                    setProfileErrorKey(data.messageKey);
                    setProfileError('');
                } else if (data.message) {
                    setProfileError(data.message);
                    setProfileErrorKey('');
                } else {
                    setProfileErrorKey('account.messages.updateFailed');
                    setProfileError('');
                }
            }
        } catch (error) {
            setProfileErrorKey('account.messages.generalError');
            setProfileError('');
        } finally {
            setIsProfileFormLoading(false);
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
                                {t('account.loginSecurity.profile.title')}
                            </h2>
                            <p
                                className={`text-xs sm:text-sm text-gray-600 mb-4 sm:mb-6 ${locale === 'ar' ? 'text-right' : 'text-left'
                                    }`}
                            >
                                {t('account.loginSecurity.profile.subtitle')}
                            </p>

                            {/* Error Message */}
                            {(profileError || profileErrorKey) && (
                                <div className="bg-red-100 border border-red-300 rounded-lg p-3 mb-6 backdrop-blur-sm">
                                    <p
                                        className={`text-red-700 text-sm ${locale === 'ar' ? 'text-right' : 'text-left'
                                            }`}
                                    >
                                        {profileError ||
                                            (profileErrorKey ? t(profileErrorKey) : '')}
                                    </p>
                                </div>
                            )}

                            {/* Success Message */}
                            {(profileSuccessMessage || profileSuccessKey) && (
                                <div className="bg-green-100 border border-green-300 rounded-lg p-3 mb-6 backdrop-blur-sm">
                                    <p
                                        className={`text-green-700 text-sm ${locale === 'ar' ? 'text-right' : 'text-left'
                                            }`}
                                    >
                                        {profileSuccessMessage ||
                                            (profileSuccessKey ? t(profileSuccessKey) : '')}
                                    </p>
                                </div>
                            )}

                            <form
                                onSubmit={handleProfileSubmit}
                                className="space-y-4 sm:space-y-6"
                            >
                                {/* Name Field */}
                                <div>
                                    <label
                                        htmlFor="name"
                                        className={`block text-sm font-medium text-gray-700 mb-2 ${locale === 'ar' ? 'text-right' : 'text-left'
                                            }`}
                                    >
                                        <div
                                            className={`flex items-center ${locale === 'ar' ? 'flex-row-reverse' : ''
                                                }`}
                                        >
                                            {HiUser({
                                                className: `w-4 h-4 ${locale === 'ar' ? 'ml-2' : 'mr-2'
                                                    }`,
                                            })}
                                            {t('account.form.fullName')}
                                        </div>
                                    </label>
                                    <input
                                        type="text"
                                        id="name"
                                        name="name"
                                        value={profileFormData.name}
                                        onChange={handleProfileInputChange}
                                        onBlur={handleProfileBlur}
                                        className={getProfileInputClass('name')}
                                        placeholder={t('account.form.fullNamePlaceholder')}
                                        dir={locale === 'ar' ? 'rtl' : 'ltr'}
                                    />
                                    {profileTouched.name && profileValidationErrors.name && (
                                        <p
                                            className={`text-red-600 text-xs mt-1 ${locale === 'ar' ? 'text-right' : 'text-left'
                                                }`}
                                        >
                                            {t(profileValidationErrors.name)}
                                        </p>
                                    )}
                                </div>

                                {/* Submit Button */}
                                <div className="pt-4">
                                    <button
                                        type="submit"
                                        disabled={isProfileFormLoading || !hasNameChanged()}
                                        className={`w-full font-semibold py-3 px-6 rounded-lg transition-all duration-300 text-sm sm:text-base min-h-[48px] flex items-center justify-center ${!hasNameChanged()
                                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                : 'bg-black text-white hover:shadow-lg hover:shadow-purple-500/25 disabled:cursor-not-allowed disabled:opacity-60'
                                            }`}
                                    >
                                        {isProfileFormLoading ? (
                                            <>{t('account.form.updating')}</>
                                        ) : !hasNameChanged() ? (
                                            t('account.form.noChanges')
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
        </div>
    );
}
