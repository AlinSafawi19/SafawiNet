import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const RegisterSchema = z.object({
  email: z
    .string()
    .email({ message: 'Invalid email format' })
    .describe('User email address'),
  password: z
    .string()
    .min(8, { message: 'Password must be at least 8 characters' })
    .describe('User password (minimum 8 characters)'),
  name: z
    .string()
    .min(1, { message: 'Name is required' })
    .max(100, { message: 'Name too long' })
    .describe('User full name'),
});

export const VerifyEmailSchema = z.object({
  token: z
    .string()
    .min(1, { message: 'Token is required' })
    .describe('Email verification token received via email'),
});

export const LoginSchema = z.object({
  email: z
    .string()
    .email({ message: 'Invalid email format' })
    .describe('User email address'),
  password: z
    .string()
    .min(1, { message: 'Password is required' })
    .describe('User password'),
});

export const RefreshTokenSchema = z.object({
  refreshToken: z
    .string()
    .min(1, { message: 'Refresh token is required' })
    .describe('Refresh token for obtaining new access token'),
});

export const ForgotPasswordSchema = z.object({
  email: z
    .string()
    .email({ message: 'Invalid email format' })
    .describe('User email address for password reset'),
});

export const ResetPasswordSchema = z
  .object({
    token: z
      .string()
      .min(1, { message: 'Token is required' })
      .describe('Password reset token received via email'),
    password: z
      .string()
      .min(8, { message: 'Password must be at least 8 characters' })
      .describe('New password (minimum 8 characters)'),
    confirmPassword: z
      .string()
      .min(1, { message: 'Password confirmation is required' })
      .describe('Confirm new password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "New password and confirmation password don't match",
    path: ['confirmPassword'],
  });

// DTOs for Swagger documentation
export class RegisterDto extends createZodDto(RegisterSchema) {
  static examples = {
    register: {
      summary: 'Register a new user',
      value: {
        email: 'user@safawinet.com',
        password: 'user123456',
        name: 'Test User',
      },
    },
  };
}

export class VerifyEmailDto extends createZodDto(VerifyEmailSchema) {
  static examples = {
    verifyEmail: {
      summary: 'Verify email with token',
      value: {
        token:
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
      },
    },
  };
}

export class LoginDto extends createZodDto(LoginSchema) {
  static examples = {
    login: {
      summary: 'Login with email and password',
      value: {
        email: 'user@safawinet.com',
        password: 'user123456',
      },
    },
  };
}

export class RefreshTokenDto extends createZodDto(RefreshTokenSchema) {
  static examples = {
    refreshToken: {
      summary: 'Refresh access token',
      value: {
        refreshToken:
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
      },
    },
  };
}

export class ForgotPasswordDto extends createZodDto(ForgotPasswordSchema) {
  static examples = {
    forgotPassword: {
      summary: 'Request password reset',
      value: {
        email: 'user@safawinet.com',
      },
    },
  };
}

export class ResetPasswordDto extends createZodDto(ResetPasswordSchema) {
  static examples = {
    resetPassword: {
      summary: 'Reset password with token',
      value: {
        token:
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
        password: 'newSecurePassword123',
        confirmPassword: 'newSecurePassword123',
      },
    },
  };
}

// Simple 2FA DTOs (email-based)
export const SimpleTwoFactorEnableDto = z
  .object({
    // No body required for enable - user is identified from JWT token
  })
  .describe(
    'No request body required - user is identified from JWT token in Authorization header',
  );

export const SimpleTwoFactorDisableDto = z.object({
  currentPassword: z
    .string()
    .min(1, { message: 'Current password is required' })
    .describe('Current user password for verification'),
});

export const TwoFactorCodeDto = z.object({
  userId: z.string().min(1, { message: 'User ID is required' }),
  code: z
    .string()
    .length(6, { message: '2FA code must be 6 digits' })
    .describe('6-digit code received via email'),
});

// Schema exports
export const SimpleTwoFactorEnableSchema = SimpleTwoFactorEnableDto;
export const SimpleTwoFactorDisableSchema = SimpleTwoFactorDisableDto;
export const TwoFactorCodeSchema = TwoFactorCodeDto;

// Simple 2FA DTO classes
export class SimpleTwoFactorEnableDtoClass extends createZodDto(
  SimpleTwoFactorEnableDto,
) {
  static examples = {
    simpleTwoFactorEnable: {
      summary: 'Enable 2FA (no body required)',
      value: {},
    },
  };
}

export class SimpleTwoFactorDisableDtoClass extends createZodDto(
  SimpleTwoFactorDisableDto,
) {
  static examples = {
    simpleTwoFactorDisable: {
      summary: 'Disable 2FA with current password',
      value: {
        currentPassword: 'yourCurrentPassword',
      },
    },
  };
}

export class TwoFactorCodeDtoClass extends createZodDto(TwoFactorCodeDto) {
  static examples = {
    twoFactorCode: {
      summary: 'Complete login with email 2FA code',
      value: {
        userId: 'user_id_from_previous_login',
        code: '123456',
      },
    },
  };
}

export type SimpleTwoFactorEnableDto = z.infer<typeof SimpleTwoFactorEnableDto>;
export type SimpleTwoFactorDisableDto = z.infer<
  typeof SimpleTwoFactorDisableDto
>;
export type TwoFactorCodeDto = z.infer<typeof TwoFactorCodeDto>;

// Session management schemas
export const SessionListSchema = z.object({
  cursor: z.string().optional().describe('Cursor for pagination'),
  limit: z
    .preprocess((val) => {
      if (val === undefined) return 20;
      if (typeof val === 'string') return parseInt(val, 10);
      if (typeof val === 'number') return val;
      if (typeof val === 'object' && val !== null) {
        throw new Error('Invalid value type for limit parameter');
      }
      return parseInt(String(val), 10);
    }, z.number().min(1).max(100))
    .describe('Number of sessions to return (max 100)'),
});

export const SessionDeleteSchema = z.object({
  id: z
    .string()
    .min(1, { message: 'Session ID is required' })
    .describe('Session ID to delete'),
});

export const SessionRevokeAllSchema = z.object({
  keepCurrent: z
    .boolean()
    .default(true)
    .describe('Whether to keep the current session'),
});

// Notification schemas
export const NotificationListSchema = z.object({
  cursor: z.string().optional().describe('Cursor for pagination'),
  limit: z
    .preprocess((val) => {
      if (val === undefined) return 20;
      if (typeof val === 'string') return parseInt(val, 10);
      if (typeof val === 'number') return val;
      if (typeof val === 'object' && val !== null) {
        throw new Error('Invalid value type for limit parameter');
      }
      return parseInt(String(val), 10);
    }, z.number().min(1).max(100))
    .describe('Number of notifications to return (max 100)'),
  type: z.string().optional().describe('Filter by notification type'),
  isRead: z
    .preprocess(
      (val) => (val === undefined ? undefined : val === 'true'),
      z.boolean().optional(),
    )
    .describe('Filter by read status'),
});

export const NotificationMarkReadSchema = z.object({
  id: z
    .string()
    .min(1, { message: 'Notification ID is required' })
    .describe('Notification ID to mark as read'),
});

// DTOs for session management
export class SessionListDto extends createZodDto(SessionListSchema) {
  static examples = {
    listSessions: {
      summary: 'List user sessions',
      value: {
        cursor:
          'eyJpZCI6ImN1aWQxMjM0NTY3ODkwIiwidXNlcklkIjoiY3VpZGFiY2RlZmdoaSJ9',
        limit: 20,
      },
    },
  };
}

export class SessionDeleteDto extends createZodDto(SessionDeleteSchema) {
  static examples = {
    deleteSession: {
      summary: 'Delete a specific session',
      value: {
        id: 'cuidsession123456789',
      },
    },
  };
}

export class SessionRevokeAllDto extends createZodDto(SessionRevokeAllSchema) {
  static examples = {
    revokeAllSessions: {
      summary: 'Revoke all sessions except current',
      value: {
        keepCurrent: true,
      },
    },
  };
}

// DTOs for notifications
export class NotificationListDto extends createZodDto(NotificationListSchema) {
  static examples = {
    listNotifications: {
      summary: 'List user notifications',
      value: {
        cursor:
          'eyJpZCI6ImN1aWQxMjM0NTY3ODkwIiwidXNlcklkIjoiY3VpZGFiY2RlZmdoaSJ9',
        limit: 20,
        type: 'security_alert',
        isRead: false,
      },
    },
  };
}

export class NotificationMarkReadDto extends createZodDto(
  NotificationMarkReadSchema,
) {
  static examples = {
    markRead: {
      summary: 'Mark notification as read',
      value: {
        id: 'cuidsession123456789',
      },
    },
  };
}

// Response DTOs for better type safety
export class NotificationResponseDto {
  id!: string;
  type!: string;
  title!: string;
  message!: string;
  isRead!: boolean;
  readAt?: Date | null;
  metadata?: Record<string, unknown> | null;
  priority!: string;
  expiresAt?: Date | null;
  createdAt!: Date;
  updatedAt!: Date;
}

export class NotificationListResponseDto {
  notifications!: NotificationResponseDto[];
  nextCursor?: string | null;
  hasMore!: boolean;
}

export class UnreadCountResponseDto {
  count!: number;
}
