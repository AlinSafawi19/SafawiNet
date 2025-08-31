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
    },
    USERS: {
      ME: '/users/me',
      PREFERENCES: '/users/me/preferences',
      PROFILE: '/users/me',
    },
  },
};

// Helper function to build full API URLs
export const buildApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};
