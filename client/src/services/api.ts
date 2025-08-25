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
  tokens?: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
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
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  // Set tokens (called after successful login/register)
  setTokens(accessToken: string, refreshToken: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
  }

  // Clear tokens (called on logout)
  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
  }

  // Get current access token
  getAccessToken(): string | null {
    return this.accessToken;
  }

  // Get current refresh token
  getRefreshToken(): string | null {
    return this.refreshToken;
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  // Make authenticated request with automatic token refresh
  private async makeAuthenticatedRequest<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<T> {
    if (!this.accessToken) {
      throw new Error('No access token available');
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 401) {
      // Token expired, try to refresh
      if (this.refreshToken) {
        try {
          const refreshResponse = await this.refreshAccessToken();
          if (refreshResponse) {
            // Retry the original request with new token
            const retryResponse = await fetch(url, {
              ...options,
              headers: {
                ...options.headers,
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
              },
            });
            
            if (retryResponse.ok) {
              return await retryResponse.json();
            }
          }
        } catch (error) {
          // Refresh failed, clear tokens
          this.clearTokens();
          throw new Error('Authentication failed');
        }
      }
      
      // No refresh token or refresh failed
      this.clearTokens();
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
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Login failed: ${response.status}`);
    }

    const data = await response.json();
    
    // Only set tokens if login was successful, user is verified, and tokens are provided
    if (data.tokens && !data.requiresVerification && !data.requiresTwoFactor) {
      this.setTokens(data.tokens.accessToken, data.tokens.refreshToken);
    }
    
    return data;
  }

  // Register user
  async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/v1/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Registration failed: ${response.status}`);
    }

    const data = await response.json();
    
    // Only set tokens if they are present in the response
    if (data.tokens && data.tokens.accessToken && data.tokens.refreshToken) {
      this.setTokens(data.tokens.accessToken, data.tokens.refreshToken);
    }
    
    return data;
  }

  // Refresh access token
  async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) {
      return false;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/v1/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      this.setTokens(data.tokens.accessToken, data.tokens.refreshToken);
      return true;
    } catch (error) {
      return false;
    }
  }

  // Get current user profile
  async getCurrentUser(): Promise<UserProfile> {
    return this.makeAuthenticatedRequest<UserProfile>(`${API_BASE_URL}/users/me`);
  }

  // Logout user (revoke tokens on server side)
  async logout(): Promise<void> {
    if (this.accessToken) {
      try {
        await fetch(`${API_BASE_URL}/v1/sessions`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        });
      } catch (error) {
        // Ignore logout errors, still clear local tokens
      }
    }
    
    this.clearTokens();
  }

  // Verify email with token
  async verifyEmail(token: string): Promise<VerifyEmailResponse> {
    const response = await fetch(`${API_BASE_URL}/v1/auth/verify-email`, {
      method: 'POST',
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
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;
