import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/services/prisma.service';
import { SecurityUtils } from '../common/security/security.utils';
import { EmailService } from '../common/services/email.service';
import { AuthWebSocketGateway } from '../websocket/websocket.gateway';
import {
  CreateUserDto,
  UpdateProfileDto,
  UpdatePreferencesDto,
  UpdateNotificationPreferencesDto,
  ChangePasswordDto,
} from './schemas/user.schemas';
import { User, Role } from '@prisma/client';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    private readonly webSocketGateway: AuthWebSocketGateway,
  ) {}

  async createUser(
    createUserDto: CreateUserDto,
  ): Promise<Omit<User, 'password'>> {
    const { email, password, name } = createUserDto;

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    // Hash password
    const hashedPassword = await SecurityUtils.hashPassword(password);

    // Default preferences
    const defaultPreferences = {
      theme: 'light',
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
    const defaultNotificationPreferences = {
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
        email: email.toLowerCase(),
        password: hashedPassword,
        name,
        roles: [Role.ADMIN, Role.CUSTOMER], // Admin users also get customer role for customer features
        preferences: defaultPreferences,
        notificationPreferences: defaultNotificationPreferences,
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
      this.logger.log(
        `Created loyalty account for new admin user: ${user.email}`,
      );
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
      const frontendDomain = this.configService.get(
        'FRONTEND_DOMAIN',
        'localhost:3001',
      );
      const verificationUrl = `http://${frontendDomain}/verify-email?token=${verificationToken}`;
      await this.emailService.sendEmailVerification(user.email, {
        name: user.name || 'User',
        verificationUrl,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send verification email to ${user.email}:`,
        error,
      );
      // Don't fail user creation if email fails
    }

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async getCurrentUser(userId: string): Promise<Omit<User, 'password'>> {
    console.log('👤 UsersService - getCurrentUser called with userId:', userId);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    console.log('👤 UsersService - user found:', user);

    if (!user) {
      console.log('❌ UsersService - User not found for ID:', userId);
      throw new NotFoundException('User not found');
    }

    console.log('✅ UsersService - User retrieved successfully:', user.email);

    // Provide default values for preferences and notificationPreferences if they are null
    const userWithDefaults = {
      ...user,
      preferences: user.preferences || {
        theme: 'light',
        language: 'en',
        timezone: 'UTC',
        dateFormat: 'MM/DD/YYYY',
        timeFormat: '12h',
        notifications: {
          sound: true,
          desktop: true,
        },
      },
      notificationPreferences: user.notificationPreferences || {
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
      },
    };

    const { password: _, ...userWithoutPassword } = userWithDefaults;
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
        ...(name !== undefined && { name }),
      },
    });

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
    const currentPreferences = (user.preferences as any) || {};
    const updatedPreferences = {
      ...currentPreferences,
      ...updatePreferencesDto,
    };

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { preferences: updatedPreferences },
    });

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
    const currentPreferences = (user.preferences as any) || {};
    const currentNotifications = currentPreferences.notifications || {};

    const updatedNotifications = {
      ...currentNotifications,
      ...updateNotificationPreferencesDto,
    };
    const updatedPreferences = {
      ...currentPreferences,
      notifications: updatedNotifications,
    };

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { preferences: updatedPreferences },
    });

    const { password: _, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }

  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string; messageKey: string }> {
    try {
      this.logger.log(`Changing password for user ${userId}`);
      const { currentPassword, newPassword, confirmNewPassword } =
        changePasswordDto;

      // Get user with password
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Verify current password
      this.logger.log(
        `Verifying password for user ${userId}, hash format: ${user.password.substring(0, 20)}...`,
      );
      let isCurrentPasswordValid = false;
      try {
        isCurrentPasswordValid = await SecurityUtils.verifyPassword(
          user.password,
          currentPassword,
        );
      } catch (error) {
        this.logger.warn(
          `Password verification failed for user ${userId}:`,
          error instanceof Error ? error.message : String(error),
        );
        // If verification fails due to hash format issues, treat as incorrect password
        isCurrentPasswordValid = false;
      }

      if (!isCurrentPasswordValid) {
        throw new UnauthorizedException('Current password is incorrect');
      }

      // Hash new password
      const hashedNewPassword = await SecurityUtils.hashPassword(newPassword);

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
            event: 'Password Changed',
            message:
              'Your password has been successfully changed. If you did not make this change, please contact support immediately.',
            timestamp: new Date().toLocaleString(),
          },
        );
      } catch (error) {
        this.logger.error(
          `Failed to send password change security alert to ${user.email}:`,
          error,
        );
        // Don't fail password change if email fails
      }

      // Emit logout event to all user's devices
      try {
        // Emit to user's personal room (for all logged-in devices)
        await this.webSocketGateway.emitLogoutToUserDevices(
          userId,
          'password_changed',
        );

        // Also emit global logout to catch any devices that might not be in the user's room
        await this.webSocketGateway.emitGlobalLogout('password_changed');

        this.logger.log(
          `Logout events emitted for password change - user: ${user.email}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to emit logout events for password change - user: ${user.email}:`,
          error,
        );
        // Don't fail the password change if WebSocket emission fails
      }

      return {
        message: 'Password changed successfully',
        messageKey: 'account.loginSecurity.password.success',
      };
    } catch (error) {
      this.logger.error(`Error changing password for user ${userId}:`, error);
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

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async findUserByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  async findAllUsers(): Promise<Omit<User, 'password'>[]> {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return users.map(
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
      ({ password: _, ...userWithoutPassword }) => userWithoutPassword,
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
    return this.prisma.user.count({
      where: {
        roles: {
          has: Role.ADMIN,
        },
      },
    });
  }
}
