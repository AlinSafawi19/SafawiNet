import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const CreateUserSchema = z.object({
  email: z.string().email('Invalid email format').describe('User email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').describe('User password (minimum 8 characters)'),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long').describe('User full name'),
});

export const VerifyEmailSchema = z.object({
  token: z.string().min(1, 'Token is required').describe('Email verification token received via email'),
});

export const RequestPasswordResetSchema = z.object({
  email: z.string().email('Invalid email format').describe('Email address to send password reset link to'),
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required').describe('Password reset token received via email'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters').describe('New password (minimum 8 characters)'),
  confirmNewPassword: z.string().min(1, 'Password confirmation is required').describe('Confirm new password'),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: "New password and confirmation password don't match",
  path: ["confirmNewPassword"],
});

// New schemas for Account & Preferences Management
export const UpdateProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long').optional(),
  recoveryEmail: z.string().email('Invalid recovery email format').optional(),
});

export const UpdatePreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'auto']).optional(),
  language: z.string().min(2, 'Language code must be at least 2 characters').max(5, 'Language code too long').optional(),
  timezone: z.string().min(1, 'Timezone must not be empty if provided').optional(),
  dateFormat: z.enum(['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD']).optional(),
  timeFormat: z.enum(['12h', '24h']).optional(),
  notifications: z.object({
    sound: z.boolean().optional(),
    desktop: z.boolean().optional(),
  }).optional(),
});

export const UpdateNotificationPreferencesSchema = z.object({
  email: z.object({
    marketing: z.boolean().optional(),
    security: z.boolean().optional(),
    updates: z.boolean().optional(),
    weeklyDigest: z.boolean().optional(),
  }).optional(),
  push: z.object({
    enabled: z.boolean().optional(),
    marketing: z.boolean().optional(),
    security: z.boolean().optional(),
    updates: z.boolean().optional(),
  }).optional(),
  sms: z.object({
    enabled: z.boolean().optional(),
    security: z.boolean().optional(),
    twoFactor: z.boolean().optional(),
  }).optional(),
});

export const ChangeEmailSchema = z.object({
  newEmail: z.string().email('Invalid email format').describe('New email address'),
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required').describe('Current password'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters').describe('New password'),
  confirmNewPassword: z.string().min(1, 'Password confirmation is required').describe('Confirm new password'),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: "New password and confirmation password don't match",
  path: ["confirmNewPassword"],
});

export const ConfirmEmailChangeSchema = z.object({
  token: z.string().min(1, 'Token is required').describe('Email change confirmation token'),
});

// DTOs for Swagger documentation
export class CreateUserDto extends createZodDto(CreateUserSchema) {
  static examples = {
    createUser: {
      summary: 'Create a new user',
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

export class RequestPasswordResetDto extends createZodDto(RequestPasswordResetSchema) {
  static examples = {
    requestReset: {
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
        newPassword: 'newSecurePassword123',
        confirmNewPassword: 'newSecurePassword123'
      }
    }
  };
}

export class UpdateProfileDto extends createZodDto(UpdateProfileSchema) {
  static examples = {
    updateProfile: {
      summary: 'Update user profile',
      value: {
        name: 'John Smith',
        recoveryEmail: 'john.recovery@example.com'
      }
    }
  };
}

export class UpdatePreferencesDto extends createZodDto(UpdatePreferencesSchema) {
  static examples = {
    updatePreferences: {
      summary: 'Update user preferences',
      value: {
        theme: 'dark',
        language: 'en',
        timezone: 'America/New_York',
        dateFormat: 'MM/DD/YYYY',
        timeFormat: '12h',
        notifications: {
          sound: true,
          desktop: true
        }
      }
    }
  };
}

export class UpdateNotificationPreferencesDto extends createZodDto(UpdateNotificationPreferencesSchema) {
  static examples = {
    updateNotificationPreferences: {
      summary: 'Update notification preferences',
      value: {
        email: {
          marketing: false,
          security: true,
          updates: true,
          weeklyDigest: false
        },
        push: {
          enabled: true,
          marketing: false,
          security: true,
          updates: true
        },
        sms: {
          enabled: false,
          security: true,
          twoFactor: true
        }
      }
    }
  };
}

export class ChangeEmailDto extends createZodDto(ChangeEmailSchema) {
  static examples = {
    changeEmail: {
      summary: 'Request email change',
      value: {
        newEmail: 'john.newemail@example.com'
      }
    }
  };
}

export class ChangePasswordDto extends createZodDto(ChangePasswordSchema) {
  static examples = {
    changePassword: {
      summary: 'Change password',
      value: {
        currentPassword: 'currentPassword123',
        newPassword: 'newSecurePassword123',
        confirmNewPassword: 'newSecurePassword123'
      }
    }
  };
}

export class ConfirmEmailChangeDto extends createZodDto(ConfirmEmailChangeSchema) {
  static examples = {
    confirmEmailChange: {
      summary: 'Confirm email change',
      value: {
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
      }
    }
  };
}
