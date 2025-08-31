// Environment Configuration
// This file can be modified for different environments (dev, staging, prod)

export const ENV_CONFIG = {
  // API Configuration
  API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  
  // Environment
  ENV: process.env.NEXT_PUBLIC_ENV || 'development',
  
  // Feature flags
  FEATURES: {
    DEBUG_MODE: process.env.NEXT_PUBLIC_DEBUG_MODE === 'true' || false,
  },
};

// Helper function to check if we're in development
export const isDevelopment = () => ENV_CONFIG.ENV === 'development';

// Helper function to check if we're in production
export const isProduction = () => ENV_CONFIG.ENV === 'production';
