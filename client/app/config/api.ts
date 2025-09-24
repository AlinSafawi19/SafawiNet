import { ENV_CONFIG } from './environment';

// API Configuration
export const API_CONFIG = {
  // Use environment configuration for API URL
  BASE_URL: ENV_CONFIG.API_URL,

  // API endpoints
  ENDPOINTS: {
    AUTH: {
      LOGIN: '/v1/auth/login',
      REGISTER: '/v1/auth/register',
      LOGOUT: '/v1/auth/logout',
      REFRESH: '/v1/auth/refresh',
      TWO_FACTOR_LOGIN: '/v1/auth/2fa/login',
      FORGOT_PASSWORD: '/v1/auth/forgot-password',
      RESET_PASSWORD: '/v1/auth/reset-password',
      VERIFY_EMAIL: '/v1/auth/verify-email',
      ENABLE_2FA: '/v1/auth/2fa/enable',
      DISABLE_2FA: '/v1/auth/2fa/disable',
    },
    USERS: {
      ME: '/users/me',
      PREFERENCES: '/users/me/preferences',
      PROFILE: '/users/me',
      UPDATE_PROFILE: '/users/me',
      CHANGE_PASSWORD: '/users/me/change-password',
      CREATE_USER: '/users',
    },
    LOYALTY: {
      ME: '/v1/loyalty/me',
      TRANSACTIONS: '/v1/loyalty/transactions',
    },
  },
};

// Helper function to build full API URLs
export const buildApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};
