import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const RegisterSchema = z.object({
  email: z.string().email('Invalid email format').describe('User email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').describe('User password (minimum 8 characters)'),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long').describe('User full name'),
});

export const VerifyEmailSchema = z.object({
  token: z.string().min(1, 'Token is required').describe('Email verification token received via email'),
});

export const LoginSchema = z.object({
  email: z.string().email('Invalid email format').describe('User email address'),
  password: z.string().min(1, 'Password is required').describe('User password'),
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required').describe('Refresh token for obtaining new access token'),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email('Invalid email format').describe('User email address for password reset'),
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required').describe('Password reset token received via email'),
  password: z.string().min(8, 'Password must be at least 8 characters').describe('New password (minimum 8 characters)'),
});

// DTOs for Swagger documentation
export class RegisterDto extends createZodDto(RegisterSchema) {
  static examples = {
    register: {
      summary: 'Register a new user',
      value: {
        email: 'john.doe@example.com',
        password: 'securePassword123',
        name: 'John Doe'
      }
    }
  };
}

export class VerifyEmailDto extends createZodDto(VerifyEmailSchema) {
  static examples = {
    verifyEmail: {
      summary: 'Verify email with token',
      value: {
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
      }
    }
  };
}

export class LoginDto extends createZodDto(LoginSchema) {
  static examples = {
    login: {
      summary: 'Login with email and password',
      value: {
        email: 'john.doe@example.com',
        password: 'securePassword123'
      }
    }
  };
}

export class RefreshTokenDto extends createZodDto(RefreshTokenSchema) {
  static examples = {
    refreshToken: {
      summary: 'Refresh access token',
      value: {
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
      }
    }
  };
}

export class ForgotPasswordDto extends createZodDto(ForgotPasswordSchema) {
  static examples = {
    forgotPassword: {
      summary: 'Request password reset',
      value: {
        email: 'john.doe@example.com'
      }
    }
  };
}

export class ResetPasswordDto extends createZodDto(ResetPasswordSchema) {
  static examples = {
    resetPassword: {
      summary: 'Reset password with token',
      value: {
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        password: 'newSecurePassword123'
      }
    }
  };
}
