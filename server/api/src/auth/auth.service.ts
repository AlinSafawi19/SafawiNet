import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/services/prisma.service';
import { RedisService } from '../common/services/redis.service';
import { EmailService } from '../common/services/email.service';
import { SecurityUtils } from '../common/security/security.utils';
import { SimpleTwoFactorService } from './simple-two-factor.service';
import { SessionsService } from './sessions.service';
import { NotificationsService } from './notifications.service';
import { LoggerService } from '../common/services/logger.service';
import {
  RegisterDto,
  VerifyEmailDto,
  LoginDto,
  RefreshTokenDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  TwoFactorCodeDto,
} from './schemas/auth.schemas';
import {
  User,
  OneTimeToken,
  RefreshSession,
  UserSession,
  LoyaltyTier,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { Request, Response } from 'express';
import { AuthWebSocketGateway } from '../websocket/websocket.gateway';
import { OfflineMessageService } from '../common/services/offline-message.service';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginResult {
  tokens?: AuthTokens;
  requiresVerification?: boolean;
  requiresTwoFactor?: boolean;
  user?: Omit<User, 'password'>;
}

// Type for JWT payload
interface JwtPayload {
  sub: string;
  email: string;
  verified: boolean;
  roles: string[];
  refreshTokenId?: string;
}

@Injectable()
export class AuthService {
  private readonly maxLoginAttempts = 5;
  private readonly lockoutDuration = 15 * 60; // 15 minutes in seconds

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    private readonly simpleTwoFactorService: SimpleTwoFactorService,
    private readonly sessionsService: SessionsService,
    private readonly notificationsService: NotificationsService,
    private readonly webSocketGateway: AuthWebSocketGateway,
    private readonly offlineMessageService: OfflineMessageService,
    private readonly loggerService: LoggerService,
  ) {}

  async register(
    registerDto: RegisterDto,
  ): Promise<{ message: string; user: Omit<User, 'password'> }> {
    const { email, password, name } = registerDto;

    this.loggerService.info('User registration process started', {
      source: 'auth',
      metadata: { operation: 'register', email }
    });

    // Check if user already exists
    const existingUser: User | null = await this.prisma.user.findUnique({
      where: { email: (email as string).toLowerCase() },
    });

    if (existingUser) {
      this.loggerService.warn('User registration failed - email already exists', {
        source: 'auth',
        metadata: { operation: 'register', reason: 'email_exists', email }
      });
      throw new ConflictException('User with this email already exists');
    }

    // Hash password using Argon2id
    const hashedPassword: string = await SecurityUtils.hashPassword(
      password as string,
    );

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
    } as const;

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
    } as const;

    // Create user and verification token in a transaction
    const result: { user: User; verificationToken: string } =
      await this.prisma.$transaction(async (tx) => {
        // Create user
        const user: User = await tx.user.create({
          data: {
            email: (email as string).toLowerCase(),
            password: hashedPassword,
            name: name as string,
            isVerified: false,
            preferences: defaultPreferences,
            notificationPreferences: defaultNotificationPreferences,
          },
        });

        // Generate verification token (15-60 min TTL)
        const verificationToken: string = SecurityUtils.generateSecureToken(32);
        const tokenHash: string = SecurityUtils.hashToken(verificationToken);
        const expiresAt: Date = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

        // Store verification token
        await tx.oneTimeToken.create({
          data: {
            purpose: 'email_verification',
            hash: tokenHash,
            userId: user.id,
            expiresAt,
          },
        });

        // Create loyalty account for customers (users with CUSTOMER role)
        if (user.roles.includes('CUSTOMER')) {
          // Find the Bronze tier (default tier for new customers)
          const bronzeTier: LoyaltyTier | null = await tx.loyaltyTier.findFirst(
            {
              where: { name: 'Bronze' },
            },
          );

          if (bronzeTier) {
            await tx.loyaltyAccount.create({
              data: {
                userId: user.id,
                currentTierId: bronzeTier.id,
                currentPoints: 0,
                lifetimePoints: 0,
                tierUpgradedAt: new Date(),
              },
            });
          }
        }

        return { user, verificationToken };
      });

    // Send verification email
    try {
      const frontendDomain: string = this.configService.get<string>(
        'FRONTEND_DOMAIN',
        'localhost:3001',
      );
      const verificationUrl = `http://${frontendDomain}/verify-email?token=${result.verificationToken}`;
      await this.emailService.sendEmailVerification(result.user.email, {
        name: result.user.name || 'User',
        verificationUrl,
      });
    } catch (error) {
      // Don't fail registration if email fails
    }

    // Return user without password
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = result.user;

    // Log successful registration
    this.loggerService.info('User registration completed successfully', {
      userId: result.user.id,
      source: 'auth',
      metadata: { 
        operation: 'register',
        roles: result.user.roles,
        loyaltyAccountCreated: result.user.roles.includes('CUSTOMER'),
        email: result.user.email
      }
    });

    // Emit WebSocket event for new user registration
    try {
      this.webSocketGateway.emitVerificationSuccess(
        result.user.id,
        userWithoutPassword,
      );
    } catch (error) {
      this.loggerService.warn('Failed to emit WebSocket verification event', {
        userId: result.user.id,
        source: 'auth',
        metadata: { operation: 'register', error: error instanceof Error ? error.message : String(error) }
      });
    }

    return {
      message:
        'User registered successfully. Please check your email to verify your account.',
      user: userWithoutPassword,
    };
  }

  async verifyEmail(verifyEmailDto: VerifyEmailDto): Promise<{
    message: string;
    user: Omit<User, 'password'>;
    tokens?: AuthTokens;
  }> {
    const { token } = verifyEmailDto;
    const tokenHash: string = SecurityUtils.hashToken(token as string);

    // Find and validate token atomically
    const result: User = await this.prisma.$transaction(async (tx) => {
      const oneTimeToken: (OneTimeToken & { user: User }) | null =
        await tx.oneTimeToken.findFirst({
          where: {
            hash: tokenHash,
            purpose: 'email_verification',
            expiresAt: { gt: new Date() },
            usedAt: null,
          },
          include: { user: true },
        });

      if (!oneTimeToken) {
        throw new BadRequestException('Invalid or expired verification token');
      }

      // Regular email verification
      const updatedUser: User = await tx.user.update({
        where: { id: oneTimeToken.user.id },
        data: { isVerified: true },
      });

      // Mark token as used
      await tx.oneTimeToken.update({
        where: { id: oneTimeToken.id },
        data: { usedAt: new Date() },
      });

      return updatedUser;
    });

    // Generate tokens for automatic login
    const tokens: AuthTokens = await this.generateTokens(result, undefined);

    // Emit WebSocket event for real-time notification
    try {
      // Log current room states before emitting
      const roomStates = this.webSocketGateway.getRoomStates();
      
      this.webSocketGateway.emitVerificationSuccess(
        result.id,
        this.excludePassword(result),
      );
      
      // Log the user data being sent
      const userData = this.excludePassword(result);
      
      this.webSocketGateway.emitVerificationSuccessToPendingRoom(
        result.email,
        userData,
        tokens,
      );

      // Also broadcast login to all devices
      this.webSocketGateway.broadcastLogin(this.excludePassword(result));

      // Log room states after emitting
      const roomStatesAfter = this.webSocketGateway.getRoomStates();

    } catch (error) {
 
    }

    const message: string = 'Email verified successfully';

    return {
      message,
      user: this.excludePassword(result),
      tokens,
    };
  }

  async login(loginDto: LoginDto, req?: Request): Promise<LoginResult> {
    const { email, password } = loginDto;
    const emailKey: string = (email as string).toLowerCase();

    // Check for login attempts and lockout
    const lockoutKey: string = `login_lockout:${emailKey}`;
    const isLockedOut: boolean = await this.redisService.exists(lockoutKey);

    if (isLockedOut) {
      throw new UnauthorizedException(
        'Account temporarily locked due to too many failed attempts',
      );
    }

    // Find user
    const user: User | null = await this.prisma.user.findUnique({
      where: { email: emailKey },
    });

    if (!user) {
      await this.recordFailedLoginAttempt(emailKey);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid: boolean = await SecurityUtils.verifyPassword(
      user.password,
      password as string,
    );

    if (!isPasswordValid) {
      await this.recordFailedLoginAttempt(emailKey);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is verified
    if (!user.isVerified) {
      // Resend verification email if not verified
      await this.resendVerificationEmailInternal(user);

      return {
        requiresVerification: true,
        user: this.excludePassword(user),
      };
    }

    // Check if 2FA is enabled
    if (user.twoFactorEnabled) {
      // Clear failed login attempts on successful password verification
      await this.redisService.del(`login_attempts:${emailKey}`);

      // Send 2FA code via email
      try {
        await this.simpleTwoFactorService.sendTwoFactorCode(user.id);
      } catch (error) {
   
        // Continue with 2FA flow even if email sending fails
      }

      return {
        requiresTwoFactor: true,
        user: this.excludePassword(user),
      };
    }

    // Clear failed login attempts on successful login
    await this.redisService.del(`login_attempts:${emailKey}`);

    // Generate tokens
    const tokens: AuthTokens = await this.generateTokens(user, req);

    return {
      tokens,
      user: this.excludePassword(user),
    };
  }

  async twoFactorLogin(
    userId: string,
    twoFactorLoginDto: TwoFactorCodeDto,
    req?: Request,
  ): Promise<LoginResult> {
    const { code } = twoFactorLoginDto;

    // Validate 2FA code using simple service
    const validationResult: { isValid: boolean } =
      await this.simpleTwoFactorService.validateTwoFactorCode(userId, code);

    if (!validationResult.isValid) {
      throw new UnauthorizedException('Invalid 2FA code');
    }

    // Get user
    const user: User | null = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Generate tokens
    const tokens: AuthTokens = await this.generateTokens(user, req);


    return {
      tokens,
      user: this.excludePassword(user),
    };
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto): Promise<AuthTokens> {
    const { refreshToken } = refreshTokenDto;

    try {
      // Hash the provided refresh token to compare with stored hash
      const refreshHash: string = SecurityUtils.hashToken(
        refreshToken as string,
      );

      // Check if refresh session exists and is valid
      const session: (RefreshSession & { user: User }) | null =
        await this.prisma.refreshSession.findFirst({
          where: {
            refreshHash,
            isActive: true,
            expiresAt: { gt: new Date() },
          },
          include: { user: true },
        });

      if (!session) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Generate new tokens
      const tokens: AuthTokens = await this.generateTokens(session.user);

      // Invalidate old refresh token and create new one
      await this.prisma.refreshSession.update({
        where: { id: session.id },
        data: { isActive: false },
      });

      // Update the user session to reflect the new refresh token
      try {
        const userSession: UserSession | null =
          await this.prisma.userSession.findUnique({
            where: { refreshTokenId: session.tokenId },
          });

        if (userSession) {
          // Update the session to link to the new refresh token
          const newRefreshToken: { refreshToken: string; tokenId: string } =
            await this.createRefreshToken(session.user.id);
          await this.prisma.userSession.update({
            where: { id: userSession.id },
            data: {
              refreshTokenId: newRefreshToken.tokenId,
              lastActiveAt: new Date(),
            },
          });
        }
      } catch (error) {
        // Don't fail token refresh if session update fails
      }

      return tokens;
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async forgotPassword(
    forgotPasswordDto: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    const { email } = forgotPasswordDto;
    const emailKey: string = (email as string).toLowerCase();

    // Check if user exists
    const user: User | null = await this.prisma.user.findUnique({
      where: { email: emailKey },
    });

    if (!user) {
      // Don't reveal if user exists or not for security
  
      return {
        message:
          'If an account with this email exists, a password reset link has been sent.',
      };
    }

    // Invalidate any existing password reset tokens for this user
    await this.prisma.oneTimeToken.updateMany({
      where: {
        userId: user.id,
        purpose: 'password_reset',
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });

    // Generate new password reset token (15 min TTL)
    const resetToken: string = SecurityUtils.generateSecureToken(32);
    const tokenHash: string = SecurityUtils.hashToken(resetToken);
    const expiresAt: Date = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store password reset token
    await this.prisma.oneTimeToken.create({
      data: {
        purpose: 'password_reset',
        hash: tokenHash,
        userId: user.id,
        expiresAt,
      },
    });

    // Send password reset email
    try {
      await this.emailService.sendPasswordResetEmail(user.email, resetToken);
    } catch (error) {
 
      // Don't fail the request if email fails
    }

    return {
      message:
        'If an account with this email exists, a password reset link has been sent.',
    };
  }

  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
  ): Promise<{ message: string; email: string }> {
    const { token, password } = resetPasswordDto;
    const tokenHash: string = SecurityUtils.hashToken(token as string);

    // Find and validate token atomically
    const result: User = await this.prisma.$transaction(async (tx) => {
      const oneTimeToken: (OneTimeToken & { user: User }) | null =
        await tx.oneTimeToken.findFirst({
          where: {
            hash: tokenHash,
            purpose: 'password_reset',
            expiresAt: { gt: new Date() },
            usedAt: null,
          },
          include: { user: true },
        });

      if (!oneTimeToken) {
        throw new BadRequestException(
          'Invalid or expired password reset token',
        );
      }

      // Mark token as used
      await tx.oneTimeToken.update({
        where: { id: oneTimeToken.id },
        data: { usedAt: new Date() },
      });

      // Hash new password
      const hashedPassword: string = await SecurityUtils.hashPassword(
        password as string,
      );

      // Update user password
      await tx.user.update({
        where: { id: oneTimeToken.user.id },
        data: {
          password: hashedPassword,
        },
      });

      // Revoke all refresh sessions for this user (session invalidation)
      await tx.refreshSession.updateMany({
        where: { userId: oneTimeToken.user.id },
        data: { isActive: false },
      });

      return oneTimeToken.user;
    });

    // Send password reset security alert email
    try {
      await this.emailService.sendTemplateEmail(
        'security-alert',
        result.email,
        {
          name: result.name || 'User',
          appName: 'Safawinet',
          supportEmail: 'support@safawinet.com',
          eventEn: 'Password Reset',
          eventAr: 'إعادة تعيين كلمة المرور',
          messageEn:
            'Your password has been successfully reset. If you did not request this reset, please contact support immediately.',
          messageAr:
            'تم إعادة تعيين كلمة المرور بنجاح. إذا لم تطلب هذا الإعادة، يرجى الاتصال بالدعم فوراً.',
          timestamp: new Date().toLocaleString(),
        },
      );
    } catch (error) {
      // Don't fail password reset if email fails
    }

    // Create offline message for logout (no real-time WebSocket needed)
    try {
      await this.offlineMessageService.createForceLogoutMessage(
        result.id,
        'password_reset',
        'Your password has been reset. Please log in with your new password.',
      );
    } catch (error) {
      // Don't fail the password reset if offline message creation fails
    }

    return {
      message:
        'Password reset successfully. Please log in with your new password.',
      email: result.email,
    };
  }

  private async generateTokens(user: User, req?: Request): Promise<AuthTokens> {
    const { refreshToken, tokenId }: { refreshToken: string; tokenId: string } =
      await this.createRefreshToken(user.id);

    // Create user session BEFORE generating JWT token to avoid race conditions
    if (req) {
      try {
        const deviceInfo = this.sessionsService.extractDeviceInfo(req);
        await this.sessionsService.createSession(user.id, tokenId, deviceInfo);

        // Create login notification
        void this.notificationsService.createAccountUpdate(
          user.id,
          'New Login Detected',
          'A new device has logged into your account.',
          {
            action: 'login',
            deviceInfo,
            timestamp: new Date(),
          },
        );
      } catch (error) {
        // If session creation fails, don't include refreshTokenId in JWT
        // This will allow login to work but without session validation
        return this.generateTokensWithoutSession(user);
      }
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      verified: user.isVerified,
      roles: user.roles,
      refreshTokenId: tokenId,
    };

    const accessToken: string = this.jwtService.sign(payload);

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60, // 15 minutes in seconds
    };
  }

  private generateTokensWithoutSession(user: User): AuthTokens {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      verified: user.isVerified,
      roles: user.roles,
      // No refreshTokenId - this will skip session validation
    };

    const accessToken: string = this.jwtService.sign(payload);

    // Generate a simple refresh token without session tracking
    const refreshToken: string = this.jwtService.sign(
      { sub: user.id, type: 'refresh' },
      { expiresIn: '30d' },
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60, // 15 minutes in seconds
    };
  }

  private async createRefreshToken(
    userId: string,
  ): Promise<{ refreshToken: string; tokenId: string }> {
    const familyId: string = randomUUID();
    const tokenId: string = randomUUID();
    const refreshToken: string = randomUUID();

    // Hash the refresh token for storage
    const refreshHash: string = SecurityUtils.hashToken(refreshToken);

    // Store refresh session
    await this.prisma.refreshSession.create({
      data: {
        familyId,
        tokenId,
        refreshHash,
        userId,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });

    return { refreshToken, tokenId };
  }

  private async recordFailedLoginAttempt(email: string): Promise<void> {
    const attemptsKey: string = `login_attempts:${email}`;
    const attempts: number = await this.redisService.incr(attemptsKey);

    if (attempts === 1) {
      await this.redisService.expire(attemptsKey, 60 * 60); // 1 hour window
    }

    if (attempts >= this.maxLoginAttempts) {
      const lockoutKey: string = `login_lockout:${email}`;
      await this.redisService.set(lockoutKey, 'locked', this.lockoutDuration);
    }
  }

  async invalidateRefreshToken(refreshToken: string): Promise<void> {
    try {
      const refreshHash: string = SecurityUtils.hashToken(refreshToken);

      // Find and deactivate the refresh session
      await this.prisma.refreshSession.updateMany({
        where: {
          refreshHash,
          isActive: true,
        },
        data: {
          isActive: false,
        },
      });

      // Also deactivate any associated user sessions
      const session: { tokenId: string } | null =
        await this.prisma.refreshSession.findFirst({
          where: { refreshHash },
          select: { tokenId: true },
        });

      if (session) {
        await this.prisma.userSession.updateMany({
          where: { refreshTokenId: session.tokenId },
          data: { isCurrent: false },
        });
      }

    } catch (error) {
      // Don't throw error as logout should succeed even if token invalidation fails
    }
  }

  async resendVerificationEmail(email: string): Promise<{ message: string }> {
    try {
      // Find user by email
      const user: User | null = await this.prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        throw new BadRequestException('User not found');
      }

      if (user.isVerified) {
        throw new BadRequestException('User is already verified');
      }

      // Invalidate any existing verification tokens for this user
      await this.prisma.oneTimeToken.updateMany({
        where: {
          userId: user.id,
          purpose: 'email_verification',
          usedAt: null,
        },
        data: {
          usedAt: new Date(),
        },
      });

      // Generate new verification token
      const verificationToken: string = SecurityUtils.generateSecureToken(32);
      const tokenHash: string = SecurityUtils.hashToken(verificationToken);
      const expiresAt: Date = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

      // Store new verification token
      await this.prisma.oneTimeToken.create({
        data: {
          purpose: 'email_verification',
          hash: tokenHash,
          userId: user.id,
          expiresAt,
        },
      });

      // Send verification email
      const frontendDomain: string = this.configService.get<string>(
        'FRONTEND_DOMAIN',
        'localhost:3001',
      );
      const verificationUrl = `http://${frontendDomain}/verify-email?token=${verificationToken}`;
      await this.emailService.sendEmailVerification(user.email, {
        name: user.name || 'User',
        verificationUrl,
      });

      return { message: 'Verification email sent successfully' };
    } catch (error) {
      throw error;
    }
  }

  private async resendVerificationEmailInternal(user: User): Promise<void> {
    try {
      // Invalidate any existing verification tokens for this user
      await this.prisma.oneTimeToken.updateMany({
        where: {
          userId: user.id,
          purpose: 'email_verification',
          usedAt: null,
        },
        data: {
          usedAt: new Date(),
        },
      });

      // Generate new verification token
      const verificationToken: string = SecurityUtils.generateSecureToken(32);
      const tokenHash: string = SecurityUtils.hashToken(verificationToken);
      const expiresAt: Date = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

      // Store new verification token
      await this.prisma.oneTimeToken.create({
        data: {
          purpose: 'email_verification',
          hash: tokenHash,
          userId: user.id,
          expiresAt,
        },
      });

      // Send verification email
      const frontendDomain: string = this.configService.get<string>(
        'FRONTEND_DOMAIN',
        'localhost:3001',
      );
      const verificationUrl = `http://${frontendDomain}/verify-email?token=${verificationToken}`;
      await this.emailService.sendEmailVerification(user.email, {
        name: user.name || 'User',
        verificationUrl,
      });
    } catch (error) {
    }
  }

  private async markBackupCodeAsUsed(
    userId: string,
    code: string,
  ): Promise<void> {
    const codeHash: string = SecurityUtils.hashToken(code);
    await this.prisma.backupCode.updateMany({
      where: {
        userId,
        codeHash,
        isUsed: false,
      },
      data: {
        isUsed: true,
        usedAt: new Date(),
      },
    });
  }

  private excludePassword(user: User): Omit<User, 'password'> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  setAuthCookies(res: Response, tokens: AuthTokens): void {
    const isProduction: boolean =
      this.configService.get<string>('NODE_ENV') === 'production';
    const domain: string | undefined =
      this.configService.get<string>('COOKIE_DOMAIN');
    const sameSiteValue = isProduction ? ('strict' as const) : ('lax' as const);

    // Set access token cookie (HTTP-only, secure in production)
    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: sameSiteValue,
      domain: isProduction && domain ? domain : undefined, // Only set domain in production
      maxAge: tokens.expiresIn * 1000, // Convert seconds to milliseconds
      path: '/',
    });

    // Set refresh token cookie (HTTP-only, secure in production)
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: sameSiteValue,
      domain: isProduction && domain ? domain : undefined, // Only set domain in production
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: '/',
    });

  }

  clearAuthCookies(res: Response): void {
    const isProduction: boolean =
      this.configService.get<string>('NODE_ENV') === 'production';
    const domain: string | undefined =
      this.configService.get<string>('COOKIE_DOMAIN');

    res.clearCookie('accessToken', {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      domain: isProduction && domain ? domain : undefined, // Only set domain in production
      path: '/',
    });

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      domain: isProduction && domain ? domain : undefined, // Only set domain in production
      path: '/',
    });
  }
}
