import { useTranslation } from 'react-i18next';

// Common backend message patterns and their translation keys
const messageMappings: Record<string, string> = {
  // Login messages
  'Login successful': 'backendMessages.login.success',
  'Login failed': 'backendMessages.login.failed',
  'Invalid email or password': 'backendMessages.login.invalidCredentials',
  'Account is locked': 'backendMessages.login.accountLocked',
  'Too many login attempts': 'backendMessages.login.tooManyAttempts',
  'Please verify your email address before logging in': 'backendMessages.login.emailNotVerified',
  'Two-factor authentication required': 'backendMessages.login.twoFactorRequired',
  'Account is disabled': 'backendMessages.login.accountDisabled',

  // Registration messages
  'Registration successful': 'backendMessages.registration.success',
  'User registered successfully': 'backendMessages.registration.success',
  'Registration failed': 'backendMessages.registration.failed',
  'An account with this email already exists': 'backendMessages.registration.emailAlreadyExists',
  'This username is already taken': 'backendMessages.registration.usernameAlreadyExists',
  'Password is too weak': 'backendMessages.registration.weakPassword',
  'Please enter a valid email address': 'backendMessages.registration.invalidEmail',
  'You must accept the terms and conditions': 'backendMessages.registration.termsNotAccepted',
  'Please check your email to verify your account': 'backendMessages.registration.verificationRequired',

  // Email verification messages
  'Email verified successfully': 'backendMessages.emailVerification.success',
  'Email verification failed': 'backendMessages.emailVerification.failed',
  'Invalid or expired verification link': 'backendMessages.emailVerification.invalidToken',
  'Email is already verified': 'backendMessages.emailVerification.alreadyVerified',
  'Verification email sent successfully': 'backendMessages.emailVerification.resendSuccess',
  'Failed to resend verification email': 'backendMessages.emailVerification.resendFailed',

  // Password reset messages
  'Password reset email sent successfully': 'backendMessages.passwordReset.emailSent',
  'Failed to send password reset email': 'backendMessages.passwordReset.emailFailed',
  'Password reset successfully': 'backendMessages.passwordReset.resetSuccess',
  'Password reset failed': 'backendMessages.passwordReset.resetFailed',
  'Invalid or expired reset link': 'backendMessages.passwordReset.invalidToken',
  'Passwords do not match': 'backendMessages.passwordReset.passwordsDoNotMatch',

  // General messages
  'Authentication failed': 'backendMessages.general.authenticationFailed',
  'Server error': 'backendMessages.general.serverError',
  'Network error': 'backendMessages.general.networkError',
  'You are not authorized': 'backendMessages.general.unauthorized',
  'Access forbidden': 'backendMessages.general.forbidden',
  'Resource not found': 'backendMessages.general.notFound',
  'Validation error': 'backendMessages.general.validationError',
  'Session expired': 'backendMessages.general.sessionExpired',
  'System is under maintenance': 'backendMessages.general.maintenanceMode',
};

// Hook to translate backend messages
export const useBackendMessageTranslator = () => {
  const { t } = useTranslation();

  const translateBackendMessage = (message: string): string => {
    // First, try to find an exact match
    if (messageMappings[message]) {
      return t(messageMappings[message]);
    }

    // Try to find partial matches (for messages that might have additional text)
    for (const [englishMessage, translationKey] of Object.entries(messageMappings)) {
      if (message.toLowerCase().includes(englishMessage.toLowerCase())) {
        return t(translationKey);
      }
    }

    // If no match found, return the original message
    return message;
  };

  return { translateBackendMessage };
};

// Standalone function for use outside of React components
export const translateBackendMessage = (message: string, t: (key: string) => string): string => {
  // First, try to find an exact match
  if (messageMappings[message]) {
    return t(messageMappings[message]);
  }

  // Try to find the longest matching pattern (most specific match)
  let bestMatch: { key: string; length: number } | null = null;
  
  for (const [englishMessage, translationKey] of Object.entries(messageMappings)) {
    if (message.toLowerCase().includes(englishMessage.toLowerCase())) {
      if (!bestMatch || englishMessage.length > bestMatch.length) {
        bestMatch = { key: translationKey, length: englishMessage.length };
      }
    }
  }

  // Return the best match if found, otherwise return original message
  if (bestMatch) {
    return t(bestMatch.key);
  }

  // If no match found, return the original message
  return message;
};
