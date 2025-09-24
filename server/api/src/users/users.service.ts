import {
  Injectable,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/services/prisma.service';
import { SecurityUtils } from '../common/security/security.utils';
import { EmailService } from '../common/services/email.service';
import { LoggerService } from '../common/services/logger.service';
import {
  CreateUserDto,
  UpdateProfileDto,
  UpdatePreferencesDto,
  UpdateNotificationPreferencesDto,
  ChangePasswordDto,
} from './schemas/user.schemas';
import { User, Role, Prisma } from '@prisma/client';

// Type definitions for user preferences and notification preferences
interface UserPreferences {
  language: string;
  timezone: string;
  dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
  timeFormat: '12h' | '24h';
  notifications: {
    sound: boolean;
    desktop: boolean;
  };
  [key: string]: unknown; // Index signature for Prisma JSON compatibility
}

interface UserNotificationPreferences {
  email: {
    marketing: boolean;
    security: boolean;
    updates: boolean;
    weeklyDigest: boolean;
  };
  push: {
    enabled: boolean;
    marketing: boolean;
    security: boolean;
    updates: boolean;
  };
  sms: {
    enabled: boolean;
    security: boolean;
    twoFactor: boolean;
  };
  [key: string]: unknown; // Index signature for Prisma JSON compatibility
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {}

  async createUser(
    createUserDto: CreateUserDto,
  ): Promise<Omit<User, 'password'>> {
    const { email, password, name } = createUserDto;

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: (email as string).toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    // Hash password
    const hashedPassword = await SecurityUtils.hashPassword(password as string);

    // Default preferences
    const defaultPreferences: UserPreferences = {
      language: 'en',
      timezone: 'Asia/Beirut',
      dateFormat: 'MM/DD/YYYY',
      timeFormat: '12h',
      notifications: {
        sound: true,
        desktop: true,
      },
    };

    // Default notification preferences
    const defaultNotificationPreferences: UserNotificationPreferences = {
      email: {
        marketing: false,
        security: true,
        updates: true,
        weeklyDigest: false,
      },
      push: {
        enabled: true,
        marketing: false,
        security: true,
        updates: true,
      },
      sms: {
        enabled: false,
        security: true,
        twoFactor: true,
      },
    };

    // Create user with ADMIN role (this endpoint is for admin user creation)
    const user = await this.prisma.user.create({
      data: {
        email: (email as string).toLowerCase(),
        password: hashedPassword,
        name: name as string,
        roles: [Role.ADMIN, Role.CUSTOMER], // Admin users also get customer role for customer features
        preferences: defaultPreferences as Prisma.InputJsonValue,
        notificationPreferences:
          defaultNotificationPreferences as Prisma.InputJsonValue,
      },
    });

    // Create loyalty account for admin users (since they also have CUSTOMER role)
    const bronzeTier = await this.prisma.loyaltyTier.findFirst({
      where: { name: 'Bronze' },
    });

    if (bronzeTier) {
      await this.prisma.loyaltyAccount.create({
        data: {
          userId: user.id,
          currentTierId: bronzeTier.id,
          currentPoints: 0,
          lifetimePoints: 0,
          tierUpgradedAt: new Date(),
        },
      });
    }

    // Generate verification token
    const verificationToken = SecurityUtils.generateSecureToken();
    const tokenHash = SecurityUtils.hashToken(verificationToken);

    // Store verification token
    await this.prisma.oneTimeToken.create({
      data: {
        purpose: 'email_verification',
        hash: tokenHash,
        userId: user.id,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    // Send verification email
    try {
      const frontendDomain = this.configService.get<string>(
        'FRONTEND_DOMAIN',
        'localhost:3001',
      );
      const verificationUrl = `http://${frontendDomain}/verify-email?token=${verificationToken}`;
      await this.emailService.sendEmailVerification(user.email, {
        name: user.name || 'User',
        verificationUrl,
      });
    } catch (error) {
      this.logger.warn('Failed to send welcome email during user creation', {
        source: 'api',
        userId: user.id,
        metadata: {
          email: user.email,
          error,
        },
      });
      // Don't fail user creation if email fails
    }

    // Return user without password
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async getCurrentUser(userId: string): Promise<Omit<User, 'password'>> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Provide default values for preferences and notificationPreferences if they are null
    const defaultPreferences: UserPreferences = {
      language: 'en',
      timezone: 'UTC',
      dateFormat: 'MM/DD/YYYY',
      timeFormat: '12h',
      notifications: {
        sound: true,
        desktop: true,
      },
    };

    const defaultNotificationPreferences: UserNotificationPreferences = {
      email: {
        marketing: false,
        security: true,
        updates: true,
        weeklyDigest: false,
      },
      push: {
        enabled: true,
        marketing: false,
        security: true,
        updates: true,
      },
      sms: {
        enabled: false,
        security: true,
        twoFactor: true,
      },
    };

    const userWithDefaults = {
      ...user,
      preferences:
        (user.preferences as unknown as UserPreferences) || defaultPreferences,
      notificationPreferences:
        (user.notificationPreferences as unknown as UserNotificationPreferences) ||
        defaultNotificationPreferences,
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = userWithDefaults as User & {
      password: string;
    };
    return userWithoutPassword;
  }

  async updateProfile(
    userId: string,
    updateProfileDto: UpdateProfileDto,
  ): Promise<Omit<User, 'password'>> {
    const { name } = updateProfileDto;

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(name !== undefined && { name: name as string }),
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async updatePreferences(
    userId: string,
    updatePreferencesDto: UpdatePreferencesDto,
  ): Promise<Omit<User, 'password'>> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { preferences: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Merge existing preferences with new ones
    const currentPreferences =
      (user.preferences as unknown as UserPreferences) ||
      ({} as Partial<UserPreferences>);
    const updatedPreferences: UserPreferences = {
      ...currentPreferences,
      ...updatePreferencesDto,
    } as UserPreferences;

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { preferences: updatedPreferences as Prisma.InputJsonValue },
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }

  async updateNotificationPreferences(
    userId: string,
    updateNotificationPreferencesDto: UpdateNotificationPreferencesDto,
  ): Promise<Omit<User, 'password'>> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { preferences: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get current preferences and merge notification preferences
    const currentPreferences =
      (user.preferences as unknown as UserPreferences) ||
      ({} as Partial<UserPreferences>);
    const currentNotifications = currentPreferences.notifications || {};

    const updatedNotifications = {
      ...currentNotifications,
      ...updateNotificationPreferencesDto,
    };
    const updatedPreferences: UserPreferences = {
      ...currentPreferences,
      notifications: updatedNotifications,
    } as UserPreferences;

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { preferences: updatedPreferences as Prisma.InputJsonValue },
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }

  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string; messageKey: string; forceLogout: boolean }> {
    try {
      const { currentPassword, newPassword } = changePasswordDto;

      // Get user with password
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Verify current password
      let isCurrentPasswordValid = false;
      try {
        isCurrentPasswordValid = await SecurityUtils.verifyPassword(
          user.password,
          String(currentPassword),
        );
      } catch (error) {
        this.logger.warn(
          'Password verification failed during password change',
          {
            source: 'api',
            userId,
            metadata: {
              error,
            },
          },
        );
        // If verification fails due to hash format issues, treat as incorrect password
        isCurrentPasswordValid = false;
      }

      if (!isCurrentPasswordValid) {
        throw new UnauthorizedException('Current password is incorrect');
      }

      // Hash new password
      const hashedNewPassword = await SecurityUtils.hashPassword(
        String(newPassword),
      );

      // Update password
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          password: hashedNewPassword,
        },
      });

      // Revoke all refresh tokens for this user
      await this.revokeRefreshTokens(userId);

      // Send password change security alert email
      try {
        await this.emailService.sendTemplateEmail(
          'security-alert',
          user.email,
          {
            name: user.name || 'User',
            appName: 'Safawinet',
            supportEmail: 'support@safawinet.com',
            eventEn: 'Password Changed',
            eventAr: 'تغيير كلمة المرور',
            messageEn:
              'Your password has been successfully changed. If you did not make this change, please contact support immediately.',
            messageAr:
              'تم تغيير كلمة المرور بنجاح. إذا لم تقم بهذا التغيير، يرجى الاتصال بالدعم فوراً.',
            timestamp: new Date().toLocaleString(),
          },
        );
      } catch (error) {
        this.logger.warn('Failed to send password change notification email', {
          source: 'api',
          userId,
          metadata: {
            error,
          },
        });
        // Don't fail password change if email fails
      }


      return {
        message: 'Password changed successfully',
        messageKey: 'account.loginSecurity.password.success',
        forceLogout: true,
      };
    } catch (error) {
      this.logger.error(
        'Failed to change password',
        error instanceof Error ? error : undefined,
        {
          source: 'api',
          userId,
        },
      );
      throw error;
    }
  }

  async revokeRefreshTokens(userId: string): Promise<void> {
    await this.prisma.refreshSession.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    });
  }

  async findUserById(id: string): Promise<Omit<User, 'password'> | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async findUserByEmail(email: string): Promise<User | null> {
    return await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  async findAllUsers(): Promise<Omit<User, 'password'>[]> {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return users.map(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      ({ password: _, ...userWithoutPassword }) => userWithoutPassword,
    );
  }

  async findAllAdmins(): Promise<Omit<User, 'password'>[]> {
    const admins = await this.prisma.user.findMany({
      where: {
        roles: {
          has: Role.ADMIN,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return admins.map(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      ({ password: _, ...userWithoutPassword }) =>
        userWithoutPassword as Omit<User, 'password'>,
    );
  }

  async findAllCustomers(): Promise<Omit<User, 'password'>[]> {
    const customers = await this.prisma.user.findMany({
      where: {
        roles: {
          has: Role.CUSTOMER,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return customers.map(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      ({ password: _, ...userWithoutPassword }) => userWithoutPassword,
    );
  }

  async verifyEmail(token: string): Promise<boolean> {
    const tokenHash = SecurityUtils.hashToken(token);

    const oneTimeToken = await this.prisma.oneTimeToken.findFirst({
      where: {
        hash: tokenHash,
        purpose: 'email_verification',
        expiresAt: { gt: new Date() },
        usedAt: null,
      },
    });

    if (!oneTimeToken) {
      return false;
    }

    // Update user verification status and mark token as used
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: oneTimeToken.userId },
        data: { isVerified: true },
      }),
      this.prisma.oneTimeToken.update({
        where: { id: oneTimeToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return true;
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.findUserByEmail(email);
    if (!user) {
      // Don't reveal if user exists or not
      return;
    }

    // Generate reset token
    const resetToken = SecurityUtils.generateSecureToken();
    const tokenHash = SecurityUtils.hashToken(resetToken);

    // Store reset token
    await this.prisma.oneTimeToken.create({
      data: {
        purpose: 'password_reset',
        hash: tokenHash,
        userId: user.id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    // Send reset email
    await this.emailService.sendPasswordResetEmail(user.email, resetToken);
  }

  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    const tokenHash = SecurityUtils.hashToken(token);

    const oneTimeToken = await this.prisma.oneTimeToken.findFirst({
      where: {
        hash: tokenHash,
        purpose: 'password_reset',
        expiresAt: { gt: new Date() },
        usedAt: null,
      },
    });

    if (!oneTimeToken) {
      return false;
    }

    // Hash new password
    const hashedPassword = await SecurityUtils.hashPassword(newPassword);

    // Update password and mark token as used
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: oneTimeToken.userId },
        data: { password: hashedPassword },
      }),
      this.prisma.oneTimeToken.update({
        where: { id: oneTimeToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return true;
  }

  async countAdminUsers(): Promise<number> {
    return await this.prisma.user.count({
      where: {
        roles: {
          has: Role.ADMIN,
        },
      },
    });
  }
}
