/* eslint-disable react/forbid-dom-props */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import {
  Breadcrumb,
  generateBreadcrumbItems,
} from '../../../components/Breadcrumb';
import { buildApiUrl, API_CONFIG } from '../../../config/api';
import { HiUser } from 'react-icons/hi2';
import MessageDisplay from '../../../components/MessageDisplay';

export default function LoginSecurityPage() {
  const { user, isLoading, updateUser } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Profile form state
  const [profileFormData, setProfileFormData] = useState({
    name: '',
  });

  // Track original name to detect changes
  const [originalName, setOriginalName] = useState('');

  const [isProfileFormLoading, setIsProfileFormLoading] = useState(false);
  const [profileErrorMessage, setProfileErrorMessage] = useState<
    string | undefined
  >(undefined);
  const [profileSuccessMessage, setProfileSuccessMessage] = useState<
    string | undefined
  >(undefined);
  const [nameValidationError, setNameValidationError] = useState<
    string | undefined
  >(undefined);

  useEffect(() => {
    // Redirect unauthenticated users to login
    if (!isLoading && !user) {
      router.push('/auth');
    }
  }, [user, isLoading, router]);

  // Initialize form data when user loads
  useEffect(() => {
    if (user && user.name) {
      setProfileFormData({
        name: user.name,
      });
      setOriginalName(user.name);
    }
  }, [user]);

  // Name validation function
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

  // Check if name has changed - memoized
  const hasNameChanged = useCallback((): boolean => {
    return profileFormData.name.trim() !== originalName.trim();
  }, [profileFormData.name, originalName]);

  // Handle profile form data changes - memoized
  const handleProfileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      setProfileFormData((prev) => ({
        ...prev,
        [name]: value,
      }));

      // Validate name input
      if (name === 'name') {
        const validationError = validateName(value);
        setNameValidationError(validationError);
      }

      setProfileErrorMessage(undefined);
      setProfileSuccessMessage(undefined);
    },
    []
  );

  // Get profile input class - memoized
  const getProfileInputClass = useCallback(() => {
    return 'w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-black focus:bg-gray-50 transition-all duration-300 text-sm sm:text-base min-h-[44px] sm:min-h-[48px] text-left bg-gray-50 border border-gray-300 placeholder-gray-400 focus:border-purple-600';
  }, []);

  // Don't render anything if user is not authenticated (will redirect)
  if (!isLoading && !user) {
    return null;
  }

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileErrorMessage(undefined);
    setProfileSuccessMessage(undefined);
    setIsProfileFormLoading(true);

    // Validate name before submission
    const nameValidationError = validateName(profileFormData.name);
    if (nameValidationError) {
      setNameValidationError(nameValidationError);
      setIsProfileFormLoading(false);
      return;
    }

    // Check if name has actually changed
    if (!hasNameChanged()) {
      setProfileErrorMessage('No changes made');
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
        setProfileSuccessMessage(
          data.message || 'Profile updated successfully'
        );
        setNameValidationError(undefined);
      } else {
        console.warn('❌ Name Page: Profile update failed', {
          message: data.message || data.error,
        });
        setProfileErrorMessage(
          data.message ||
            data.error ||
            'Failed to update profile. Please try again.'
        );
      }
    } catch (error) {
      console.error('💥 Name Page: Profile update error caught', error);
      setProfileErrorMessage(
        error instanceof Error
          ? error.message
          : 'An internal server error occurred. Please try again'
      );
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
          <div className="mb-6 text-left">
            <Breadcrumb items={generateBreadcrumbItems(pathname)} />
          </div>

          {/* Tab Content */}
          <div className="bg-white backdrop-blur-sm rounded-xl p-4 sm:p-6 md:p-8 border border-gray-200 shadow-none">
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-black mb-1 sm:mb-2 text-left">
                Profile Information
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-6 text-left">
                Update your personal information and contact details
              </p>

              {/* Messages */}
              <MessageDisplay
                successMessage={profileSuccessMessage}
                errorMessage={profileErrorMessage}
                className="mb-6"
              />

              <form
                onSubmit={handleProfileSubmit}
                className="space-y-4 sm:space-y-6"
              >
                {/* Name Field */}
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-700 mb-2 text-left"
                  >
                    <div className="flex items-center">
                      {HiUser({
                        className: 'w-4 h-4 mr-2',
                      })}
                      Name
                    </div>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={profileFormData.name}
                    onChange={handleProfileInputChange}
                    className={`${getProfileInputClass()} ${
                      nameValidationError
                        ? 'border-red-500 focus:border-red-500'
                        : ''
                    }`}
                    placeholder={'Enter your name'}
                    dir={'ltr'}
                  />
                  {nameValidationError && (
                    <p className="mt-1 text-sm text-red-600 text-left">
                      {nameValidationError}
                    </p>
                  )}
                </div>

                {/* Submit Button */}
                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isProfileFormLoading || !hasNameChanged() || !!nameValidationError}
                    className={`w-full font-semibold py-3 px-6 rounded-lg transition-all duration-300 text-sm sm:text-base min-h-[48px] flex items-center justify-center ${
                      !hasNameChanged() || nameValidationError
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-black text-white hover:shadow-lg hover:shadow-purple-500/25 disabled:cursor-not-allowed disabled:opacity-60'
                    }`}
                  >
                    {isProfileFormLoading ? (
                      <>{'Updating...'}</>
                    ) : !hasNameChanged() ? (
                      'No Changes Made'
                    ) : nameValidationError ? (
                      'Please Fix Errors'
                    ) : (
                      'Update Profile'
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
