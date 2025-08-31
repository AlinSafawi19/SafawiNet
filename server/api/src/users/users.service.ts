import { Injectable, Logger, ConflictException, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { SecurityUtils } from '../common/security/security.utils';
import { EmailService } from '../common/services/email.service';
import { 
  CreateUserDto, 
  UpdateProfileDto, 
  UpdatePreferencesDto, 
  UpdateNotificationPreferencesDto,
  ChangeEmailDto,
  ChangePasswordDto
} from './schemas/user.schemas';
import { User, Role } from '@prisma/client';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async createUser(createUserDto: CreateUserDto): Promise<Omit<User, 'password'>> {
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
      timezone: 'UTC',
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
      await this.emailService.sendVerificationEmail(user.email, verificationToken);
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${user.email}:`, error);
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
    };
    
    const { password: _, ...userWithoutPassword } = userWithDefaults;
    return userWithoutPassword;
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto): Promise<Omit<User, 'password'>> {
    const { name, recoveryEmail } = updateProfileDto;

    // Check if recovery email is already in use by another user
    if (recoveryEmail) {
      const existingUser = await this.prisma.user.findFirst({
        where: {
          OR: [
            { email: recoveryEmail.toLowerCase() },
            { recoveryEmail: recoveryEmail.toLowerCase() },
          ],
          NOT: { id: userId },
        },
      });

      if (existingUser) {
        throw new ConflictException('Recovery email is already in use');
      }
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(name !== undefined && { name }),
        ...(recoveryEmail !== undefined && { recoveryEmail: recoveryEmail?.toLowerCase() }),
      },
    });

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async updatePreferences(userId: string, updatePreferencesDto: UpdatePreferencesDto): Promise<Omit<User, 'password'>> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { preferences: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Merge existing preferences with new ones
    const currentPreferences = user.preferences as any || {};
    const updatedPreferences = { ...currentPreferences, ...updatePreferencesDto };

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { preferences: updatedPreferences },
    });

    const { password: _, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }

  async updateNotificationPreferences(userId: string, updateNotificationPreferencesDto: UpdateNotificationPreferencesDto): Promise<Omit<User, 'password'>> {
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
    
    const updatedNotifications = { ...currentNotifications, ...updateNotificationPreferencesDto };
    const updatedPreferences = { ...currentPreferences, notifications: updatedNotifications };

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { preferences: updatedPreferences },
    });

    const { password: _, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }

  async changeEmail(userId: string, changeEmailDto: ChangeEmailDto): Promise<{ message: string }> {
    const { newEmail } = changeEmailDto;

    // Check if new email is already in use
    const existingUser = await this.prisma.user.findUnique({
      where: { email: newEmail.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('Email is already in use');
    }

    // Check if user is trying to change to their current email
    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (currentUser?.email.toLowerCase() === newEmail.toLowerCase()) {
      throw new BadRequestException('New email must be different from current email');
    }

    // Remove any existing pending email changes for this user
    await this.prisma.pendingEmailChange.deleteMany({
      where: { userId },
    });

    // Generate email change token
    const changeToken = SecurityUtils.generateSecureToken();
    const tokenHash = SecurityUtils.hashToken(changeToken);

    // Store pending email change
    await this.prisma.pendingEmailChange.create({
      data: {
        userId,
        newEmail: newEmail.toLowerCase(),
        changeTokenHash: tokenHash,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    // Send email change confirmation email
    try {
      await this.emailService.sendEmailChangeConfirmationEmail(newEmail, changeToken);
    } catch (error) {
      this.logger.error(`Failed to send email change confirmation to ${newEmail}:`, error);
      throw new BadRequestException('Failed to send confirmation email');
    }

    return { message: 'Email change confirmation sent to new email address' };
  }

  async confirmEmailChange(token: string): Promise<{ message: string }> {
    const tokenHash = SecurityUtils.hashToken(token);

    const pendingEmailChange = await this.prisma.pendingEmailChange.findFirst({
      where: {
        changeTokenHash: tokenHash,
        expiresAt: { gt: new Date() },
      },
      include: {
        user: true,
      },
    });

    if (!pendingEmailChange) {
      throw new BadRequestException('Invalid or expired email change token');
    }

    // Check if the new email is still available
    const existingUser = await this.prisma.user.findUnique({
      where: { email: pendingEmailChange.newEmail },
    });

    if (existingUser) {
      throw new ConflictException('Email is no longer available');
    }

    // Update user email and remove pending change
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: pendingEmailChange.userId },
        data: { email: pendingEmailChange.newEmail },
      }),
      this.prisma.pendingEmailChange.delete({
        where: { id: pendingEmailChange.id },
      }),
    ]);

    // Revoke all refresh tokens for this user
    await this.revokeRefreshTokens(pendingEmailChange.userId);

    return { message: 'Email changed successfully. Please sign in with your new email address.' };
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto): Promise<{ message: string }> {
    const { currentPassword, newPassword } = changePasswordDto;

    // Get user with password
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await SecurityUtils.verifyPassword(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Hash new password
    const hashedNewPassword = await SecurityUtils.hashPassword(newPassword);

    // Update password
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword },
    });

    // Revoke all refresh tokens for this user
    await this.revokeRefreshTokens(userId);

    // Send password change notification email
    try {
      await this.emailService.sendPasswordChangeNotificationEmail(user.email);
    } catch (error) {
      this.logger.error(`Failed to send password change notification to ${user.email}:`, error);
      // Don't fail password change if email fails
    }

    return { message: 'Password changed successfully' };
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

    return users.map(({ password: _, ...userWithoutPassword }) => userWithoutPassword);
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

    return admins.map(({ password: _, ...userWithoutPassword }) => userWithoutPassword);
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

    return customers.map(({ password: _, ...userWithoutPassword }) => userWithoutPassword);
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
}
