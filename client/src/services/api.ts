const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface AuthResponse {
  message?: string;
  user: {
    id: string;
    email: string;
    name: string;
    isVerified: boolean;
    createdAt: string;
    updatedAt: string;
  };
  requiresVerification?: boolean;
  requiresTwoFactor?: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
  preferences?: {
    theme?: 'light' | 'dark' | 'auto';
    language?: string;
    timezone?: string;
    dateFormat?: string;
    timeFormat?: string;
    notifications?: {
      sound?: boolean;
      desktop?: boolean;
    };
  };
}

export interface ApiError {
  message: string;
  statusCode?: number;
}

export interface VerifyEmailRequest {
  token: string;
}

export interface VerifyEmailResponse {
  message: string;
}

class ApiService {
  // Check if user is authenticated by making a request to get current user
  async isAuthenticated(): Promise<boolean> {
    try {
      await this.getCurrentUser();
      return true;
    } catch (error) {
      return false;
    }
  }

  // Make authenticated request with automatic token refresh
  private async makeAuthenticatedRequest<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(url, {
      ...options,
      credentials: 'include', // Include cookies in requests
      headers: {
        ...options.headers,
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 401) {
      // Try to refresh token
      try {
        const refreshResponse = await fetch(`${API_BASE_URL}/v1/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (refreshResponse.ok) {
          // Retry the original request with new token
          const retryResponse = await fetch(url, {
            ...options,
            credentials: 'include',
            headers: {
              ...options.headers,
              'Content-Type': 'application/json',
            },
          });
          
          if (retryResponse.ok) {
            return await retryResponse.json();
          }
        }
      } catch (error) {
        // Refresh failed, redirect to login
        throw new Error('Authentication failed');
      }
      
      throw new Error('Authentication failed');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  // Login user
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/v1/auth/login`, {
      method: 'POST',
      credentials: 'include', // Include cookies in requests
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Login failed: ${response.status}`);
    }

    return await response.json();
  }

  // Register user
  async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/v1/auth/register`, {
      method: 'POST',
      credentials: 'include', // Include cookies in requests
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Registration failed: ${response.status}`);
    }

    return await response.json();
  }

  // Logout user
  async logout(): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/v1/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      // Don't throw error on logout failure
      console.error('Logout error:', error);
    }
  }

  // Get current user
  async getCurrentUser(): Promise<UserProfile> {
    const response = await this.makeAuthenticatedRequest<{ user: UserProfile }>(`${API_BASE_URL}/users/me`);
    return response.user;
  }

  // Verify email
  async verifyEmail(token: string): Promise<VerifyEmailResponse> {
    const response = await fetch(`${API_BASE_URL}/v1/auth/verify-email`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Email verification failed: ${response.status}`);
    }

    return await response.json();
  }

  // Resend verification email
  async resendVerificationEmail(email: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/v1/auth/resend-verification`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to resend verification email: ${response.status}`);
    }

    return await response.json();
  }

  // Forgot password
  async forgotPassword(email: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/v1/auth/forgot-password`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to send password reset email: ${response.status}`);
    }

    return await response.json();
  }

  // Reset password
  async resetPassword(token: string, password: string, confirmPassword: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/v1/auth/reset-password`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token, password, confirmPassword }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Password reset failed: ${response.status}`);
    }

    return await response.json();
  }

  // Update user preferences
  async updatePreferences(preferences: Partial<UserProfile['preferences']>): Promise<{ message: string }> {
    const response = await this.makeAuthenticatedRequest<{ message: string }>(`${API_BASE_URL}/users/me/preferences`, {
      method: 'PUT',
      body: JSON.stringify(preferences),
    });

    return response;
  }
}

export const apiService = new ApiService();
