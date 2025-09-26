'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface BackendMessageState {
  error: string;
  success: string;
  errorKey: string;
  successKey: string;
}

interface BackendMessageActions {
  setError: (message: string) => void;
  setSuccess: (message: string) => void;
  setErrorKey: (key: string) => void;
  setSuccessKey: (key: string) => void;
  setBackendError: (message: string) => void;
  setBackendSuccess: (message: string) => void;
  clearMessages: () => void;
  clearError: () => void;
  clearSuccess: () => void;
}


export const useBackendMessageTranslation = (): BackendMessageState &
  BackendMessageActions => {
  
  const { t } = useLanguage();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [errorKey, setErrorKey] = useState('');
  const [successKey, setSuccessKey] = useState('');

  // Memoize the message map to prevent recreation on every render
  const messageMap = useMemo(() => ({
    // Authentication messages
    'Invalid email or password': 'auth.messages.invalidCredentials',
    'Invalid credentials': 'auth.messages.invalidCredentials',
    'User with this email already exists': 'auth.messages.userAlreadyExists',
    'Invalid email format': 'auth.messages.invalidEmailFormat',
    'Password is too weak': 'auth.messages.passwordTooWeak',
    'Server error occurred': 'auth.messages.serverError',
    'Account temporarily locked due to too many failed attempts': 'auth.messages.accountLocked',
    'Invalid 2FA code': 'auth.messages.invalidTwoFactorCode',
    'Invalid or expired password reset token': 'auth.messages.invalidPasswordResetToken',
    'If an account with this email exists, a password reset link has been sent.': 'auth.messages.passwordResetEmailSent',
    'Password reset successfully. Please log in with your new password.': 'auth.messages.passwordResetSuccess',
    'Email verified successfully': 'auth.messages.emailVerified',
    'Verification email sent successfully': 'auth.messages.verificationEmailSent',
    'Please verify your email before signing in': 'auth.messages.emailVerificationRequired',
    'Two-factor authentication required': 'auth.messages.twoFactorRequired',
    'Invalid refresh token': 'auth.messages.invalidRefreshToken',
    'User not found': 'auth.messages.userNotFound',
    '2FA is already enabled': 'auth.messages.twoFactorAlreadyEnabled',
    '2FA setup not found. Please run setup first.': 'auth.messages.twoFactorSetupNotFound',
    'Invalid TOTP code': 'auth.messages.invalidTOTPCode',
    'Two-factor authentication enabled successfully': 'auth.messages.twoFactorEnabled',
    '2FA is not enabled': 'auth.messages.twoFactorNotEnabled',
    'Invalid code': 'auth.messages.invalidCode',
    'Two-factor authentication disabled successfully': 'auth.messages.twoFactorDisabled',
    'Email address is already in use by another account': 'auth.messages.emailAlreadyInUse',
    'Invalid or expired verification token': 'auth.messages.invalidVerificationToken',
    'Token refreshed successfully': 'auth.messages.tokenRefreshed',
    'Logged out successfully': 'auth.messages.loggedOut',
    'No refresh token provided': 'auth.messages.noRefreshTokenProvided',
    'User is already verified': 'auth.messages.userAlreadyVerified',
    'Session not found': 'auth.messages.sessionNotFound',
    'Cannot delete current session': 'auth.messages.cannotDeleteCurrentSession',
    'Notification not found': 'auth.messages.notificationNotFound',
    // Registration messages
    'Registration successful! Please check your email to verify your account before signing in.': 'auth.messages.registrationSuccess',
    'Registration failed. Please try again.': 'auth.messages.registrationFailed',
    'An error occurred. Please try again.': 'auth.messages.generalError',
    // Password change messages
    'Password changed successfully. You will be logged out in a moment': 'account.loginSecurity.password.success',
    'Current password is incorrect': 'account.loginSecurity.password.currentPasswordIncorrect',
    'New passwords do not match': 'account.loginSecurity.password.passwordsDoNotMatch',
    'New password must be at least 8 characters long': 'account.loginSecurity.password.passwordTooShort',
    'Current password is required': 'account.loginSecurity.password.currentPasswordRequired',
    'New password is required': 'account.loginSecurity.password.newPasswordRequired',
    'Please confirm your new password': 'account.loginSecurity.password.confirmPasswordRequired',
    'An internal server error occurred. Please try again': 'account.loginSecurity.password.internalServerError',
    'Failed to change password. Please try again': 'account.loginSecurity.password.passwordChangeFailed',
    // Profile update messages
    'Profile updated successfully': 'account.messages.updateSuccess',
    'Failed to update profile. Please try again': 'account.messages.updateFailed',
    'No changes were made to your profile': 'account.messages.noChanges',
    // 2FA messages
    'Failed to enable 2FA': 'account.loginSecurity.twoFactor.disableModal.disableFailed',
    'Failed to disable 2FA': 'account.loginSecurity.twoFactor.disableModal.disableFailed',
    'An error occurred while enabling 2FA': 'account.loginSecurity.twoFactor.disableModal.disableError',
    'An error occurred while disabling 2FA': 'account.loginSecurity.twoFactor.disableModal.disableError',
    // Admin creation messages
    'Admin user created successfully': 'auth.admin.adminUserCreated',
    'Admin user created successfully!': 'auth.admin.adminUserCreated',
    'User created successfully': 'auth.admin.adminUserCreated',
    'User already exists': 'auth.admin.validation.userAlreadyExists',
    'Insufficient permissions. Required roles: SUPERADMIN': 'auth.admin.validation.insufficientPermissions',
    'Forbidden - Superadmin role required': 'auth.admin.validation.superadminRequired',
    'Insufficient permissions to create admin user': 'auth.admin.validation.insufficientPermissions',
    'Invalid admin creation data': 'auth.admin.validation.invalidData',
    'Admin user creation failed': 'auth.admin.validation.creationFailed',
    Unauthorized: 'auth.messages.unauthorized',
    'Network error. Please try again.': 'auth.admin.networkError',
    'Network error': 'auth.admin.networkError',
    // Rate limiting messages
    'ThrottlerException: Too Many Requests': 'auth.messages.rateLimitExceeded',
    'Too Many Requests': 'auth.messages.rateLimitExceeded',
    'Rate limit exceeded. Please try again later.': 'auth.messages.rateLimitExceeded',
  }), []);

  // Memoized mapBackendMessageToKey function
  const mapBackendMessageToKey = useCallback((message: string): string => {
    return (messageMap as Record<string, string>)[message] || 'auth.messages.generalError';
  }, [messageMap]);

  // Update translated messages when language changes - memoized to prevent unnecessary re-renders
  const translatedError = useMemo(() => {
    return errorKey ? t(errorKey) : '';
  }, [errorKey, t]);

  const translatedSuccess = useMemo(() => {
    return successKey ? t(successKey) : '';
  }, [successKey, t]);

  // Update error and success when translations change
  useEffect(() => {
    setError(translatedError);
  }, [translatedError]);

  useEffect(() => {
    setSuccess(translatedSuccess);
  }, [translatedSuccess]);

  const setBackendError = useCallback((message: string) => {
    const key = mapBackendMessageToKey(message);
    setErrorKey(key);
    setError(''); // Clear raw message since we're using key
  }, [mapBackendMessageToKey]);

  const setBackendSuccess = useCallback((message: string) => {
    const key = mapBackendMessageToKey(message);
    setSuccessKey(key);
    setSuccess(''); // Clear raw message since we're using key
  }, [mapBackendMessageToKey]);

  const clearMessages = useCallback(() => {
    setError('');
    setSuccess('');
    setErrorKey('');
    setSuccessKey('');
  }, []);

  const clearError = useCallback(() => {
    setError('');
    setErrorKey('');
  }, []);

  const clearSuccess = useCallback(() => {
    setSuccess('');
    setSuccessKey('');
  }, []);

  // Memoize the return object to prevent unnecessary re-renders
  return useMemo(() => ({
    error,
    success,
    errorKey,
    successKey,
    setError,
    setSuccess,
    setErrorKey,
    setSuccessKey,
    setBackendError,
    setBackendSuccess,
    clearMessages,
    clearError,
    clearSuccess,
  }), [
    error,
    success,
    errorKey,
    successKey,
    setError,
    setSuccess,
    setErrorKey,
    setSuccessKey,
    setBackendError,
    setBackendSuccess,
    clearMessages,
    clearError,
    clearSuccess,
  ]);
};
