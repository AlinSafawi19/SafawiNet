import { Injectable, Logger, UnauthorizedException, ConflictException, BadRequestException, NotFoundException, Res } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/services/prisma.service';
import { RedisService } from '../common/services/redis.service';
import { EmailService } from '../common/services/email.service';
import { SecurityUtils } from '../common/security/security.utils';
import { TwoFactorService } from './two-factor.service';
import { SessionsService, DeviceInfo } from './sessions.service';
import { NotificationsService } from './notifications.service';
import { RegisterDto, VerifyEmailDto, LoginDto, RefreshTokenDto, ForgotPasswordDto, ResetPasswordDto, TwoFactorLoginDto } from './schemas/auth.schemas';
import { User } from '@prisma/client';
import { randomUUID } from 'crypto';
import { Request, Response } from 'express';
import { AuthWebSocketGateway } from '../websocket/websocket.gateway';

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

@Injectable()
export class AuthService {
  private readonly maxLoginAttempts = 5;
  private readonly lockoutDuration = 15 * 60; // 15 minutes in seconds

  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    private readonly twoFactorService: TwoFactorService,
    private readonly sessionsService: SessionsService,
    private readonly notificationsService: NotificationsService,
    private readonly webSocketGateway: AuthWebSocketGateway,
  ) {}

  async register(registerDto: RegisterDto): Promise<{ message: string; user: Omit<User, 'password'> }> {
    const { email, password, name } = registerDto;

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password using Argon2id
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

    // Create user and verification token in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          email: email.toLowerCase(),
          password: hashedPassword,
          name,
          isVerified: false,
          preferences: defaultPreferences,
          notificationPreferences: defaultNotificationPreferences,
        },
      });

      // Generate verification token (15-60 min TTL)
      const verificationToken = SecurityUtils.generateSecureToken(32);
      const tokenHash = SecurityUtils.hashToken(verificationToken);
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

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
        const bronzeTier = await tx.loyaltyTier.findFirst({
          where: { name: 'Bronze' },
        });

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
          this.logger.log(`Created loyalty account for new customer: ${user.email}`);
        }
      }

      return { user, verificationToken };
    });

    // Send verification email
    try {
      const frontendDomain = this.configService.get('FRONTEND_DOMAIN', 'localhost:3001');
      const verificationUrl = `http://${frontendDomain}/verify-email?token=${result.verificationToken}`;
      await this.emailService.sendEmailVerification(result.user.email, {
        name: result.user.name || 'User',
        verificationUrl,
      });
      this.logger.log(`Verification email sent to ${result.user.email}`);
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${result.user.email}:`, error);
      // Don't fail registration if email fails
    }

    // Return user without password
    const { password: _, ...userWithoutPassword } = result.user;
    
    // Emit WebSocket event for new user registration
    try {
      await this.webSocketGateway.emitVerificationSuccess(result.user.id, userWithoutPassword);
    } catch (error) {
      this.logger.warn(`Failed to emit WebSocket registration event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      message: 'User registered successfully. Please check your email to verify your account.',
      user: userWithoutPassword,
    };
  }

  async verifyEmail(verifyEmailDto: VerifyEmailDto): Promise<{ message: string; user: Omit<User, 'password'>; tokens?: AuthTokens }> {
    const { token } = verifyEmailDto;
    const tokenHash = SecurityUtils.hashToken(token);

    // Find and validate token atomically
    const result = await this.prisma.$transaction(async (tx) => {
      const oneTimeToken = await tx.oneTimeToken.findFirst({
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
      const updatedUser = await tx.user.update({
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
    const tokens = await this.generateTokens(result, undefined);

    // Emit WebSocket event for real-time notification
    try {
      this.logger.log(`📡 Emitting WebSocket events for verified user: ${result.email}`);
      
      // Log current room states before emitting
      const roomStates = this.webSocketGateway.getRoomStates();
      this.logger.log(`📊 Current room states before verification:`, roomStates);
      
      await this.webSocketGateway.emitVerificationSuccess(result.id, this.excludePassword(result));
      
      // Also notify pending verification room for cross-browser sync with tokens
      this.logger.log(`🔑 Sending tokens to pending verification room for: ${result.email}`);
      this.logger.log(`🔑 Tokens data:`, { accessToken: tokens.accessToken ? 'PRESENT' : 'MISSING', refreshToken: tokens.refreshToken ? 'PRESENT' : 'MISSING' });
      await this.webSocketGateway.emitVerificationSuccessToPendingRoom(result.email, this.excludePassword(result), tokens);
      
      // Also broadcast login to all devices
      await this.webSocketGateway.broadcastLogin(this.excludePassword(result));
      this.logger.log(`✅ All WebSocket events emitted successfully for user: ${result.email}`);
      
      // Log room states after emitting
      const roomStatesAfter = this.webSocketGateway.getRoomStates();
      this.logger.log(`📊 Current room states after verification:`, roomStatesAfter);
    } catch (error) {
      this.logger.warn(`Failed to emit WebSocket verification event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    this.logger.log(`Email verified for user ${result.email}`);
    
    const message = 'Email verified successfully';
    
    return { 
      message, 
      user: this.excludePassword(result),
      tokens
    };
  }

  async login(loginDto: LoginDto, req?: Request): Promise<LoginResult> {
    const { email, password } = loginDto;
    const emailKey = email.toLowerCase();

    // Check for login attempts and lockout
    const lockoutKey = `login_lockout:${emailKey}`;
    const isLockedOut = await this.redisService.exists(lockoutKey);
    
    if (isLockedOut) {
      throw new UnauthorizedException('Account temporarily locked due to too many failed attempts');
    }

    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email: emailKey },
    });

    if (!user) {
      await this.recordFailedLoginAttempt(emailKey);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await SecurityUtils.verifyPassword(user.password, password);
    
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
      
      return {
        requiresTwoFactor: true,
        user: this.excludePassword(user),
      };
    }

    // Clear failed login attempts on successful login
    await this.redisService.del(`login_attempts:${emailKey}`);

    // Generate tokens
    const tokens = await this.generateTokens(user, req);

    this.logger.log(`User ${user.email} logged in successfully`);
    
    return {
      tokens,
      user: this.excludePassword(user),
    };
  }

  async twoFactorLogin(userId: string, twoFactorLoginDto: TwoFactorLoginDto, req?: Request): Promise<LoginResult> {
    const { code } = twoFactorLoginDto;

    // Validate 2FA code
    const validationResult = await this.twoFactorService.validateTwoFactorCode(userId, code);
    
    if (!validationResult.isValid) {
      throw new UnauthorizedException('Invalid 2FA code');
    }

    // If it's a backup code, mark it as used
    if (validationResult.isBackupCode) {
      await this.markBackupCodeAsUsed(userId, code);
    }

    // Get user
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Generate tokens
    const tokens = await this.generateTokens(user, req);

    this.logger.log(`User ${user.email} logged in successfully with 2FA`);
    
    return {
      tokens,
      user: this.excludePassword(user),
    };
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto): Promise<AuthTokens> {
    const { refreshToken } = refreshTokenDto;

    try {
      // Hash the provided refresh token to compare with stored hash
      const refreshHash = SecurityUtils.hashToken(refreshToken);

      // Check if refresh session exists and is valid
      const session = await this.prisma.refreshSession.findFirst({
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
      const tokens = await this.generateTokens(session.user);

      // Invalidate old refresh token and create new one
      await this.prisma.refreshSession.update({
        where: { id: session.id },
        data: { isActive: false },
      });

      // Update the user session to reflect the new refresh token
      try {
        const userSession = await this.prisma.userSession.findUnique({
          where: { refreshTokenId: session.tokenId },
        });

        if (userSession) {
          // Update the session to link to the new refresh token
          const newRefreshToken = await this.createRefreshToken(session.user.id);
          await this.prisma.userSession.update({
            where: { id: userSession.id },
            data: { 
              refreshTokenId: newRefreshToken.tokenId,
              lastActiveAt: new Date(),
            },
          });
        }
      } catch (error) {
        this.logger.error('Failed to update user session during token refresh:', error);
        // Don't fail token refresh if session update fails
      }

      this.logger.log(`Tokens refreshed for user ${session.user.email}`);
      return tokens;

    } catch (error) {
      this.logger.error('Token refresh failed:', error);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<{ message: string }> {
    const { email } = forgotPasswordDto;
    const emailKey = email.toLowerCase();

    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { email: emailKey },
    });

    if (!user) {
      // Don't reveal if user exists or not for security
      this.logger.log(`Password reset requested for non-existent email: ${emailKey}`);
      return { message: 'If an account with this email exists, a password reset link has been sent.' };
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
    const resetToken = SecurityUtils.generateSecureToken(32);
    const tokenHash = SecurityUtils.hashToken(resetToken);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

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
      this.logger.log(`Password reset email sent to ${user.email}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${user.email}:`, error);
      // Don't fail the request if email fails
    }

    return { message: 'If an account with this email exists, a password reset link has been sent.' };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{ message: string; email: string }> {
    const { token, password } = resetPasswordDto;
    const tokenHash = SecurityUtils.hashToken(token);

    // Find and validate token atomically
    const result = await this.prisma.$transaction(async (tx) => {
      const oneTimeToken = await tx.oneTimeToken.findFirst({
        where: {
          hash: tokenHash,
          purpose: 'password_reset',
          expiresAt: { gt: new Date() },
          usedAt: null,
        },
        include: { user: true },
      });

      if (!oneTimeToken) {
        throw new BadRequestException('Invalid or expired password reset token');
      }

      // Mark token as used
      await tx.oneTimeToken.update({
        where: { id: oneTimeToken.id },
        data: { usedAt: new Date() },
      });

      // Hash new password
      const hashedPassword = await SecurityUtils.hashPassword(password);

      // Update user password
      await tx.user.update({
        where: { id: oneTimeToken.user.id },
        data: { 
          password: hashedPassword,
          passwordChangedAt: new Date(),
        },
      });

      // Revoke all refresh sessions for this user (session invalidation)
      await tx.refreshSession.updateMany({
        where: { userId: oneTimeToken.user.id },
        data: { isActive: false },
      });

      return oneTimeToken.user;
    });

    // Log security event
    this.logger.warn(`Password reset completed for user ${result.email} - all sessions invalidated`);

    // Emit logout event to password reset room and user's devices
    // Use setTimeout to allow client to join room first
    setTimeout(async () => {
      try {
        // Emit to password reset room (for devices that requested reset)
        await this.webSocketGateway.emitLogoutToPasswordResetRoom(result.email, 'password_reset');
        
        // Emit to user's personal room (for all logged-in devices)
        await this.webSocketGateway.emitLogoutToUserDevices(result.id, 'password_reset');
        
        // Also emit global logout to catch any devices that might not be in either room
        await this.webSocketGateway.emitGlobalLogout('password_reset');
        
        this.logger.log(`Logout events emitted for password reset - user: ${result.email}`);
      } catch (error) {
        this.logger.error(`Failed to emit logout events for password reset - user: ${result.email}:`, error);
        // Don't fail the password reset if WebSocket emission fails
      }
    }, 500); // 500ms delay to allow client to join room

    return { 
      message: 'Password reset successfully. Please log in with your new password.',
      email: result.email 
    };
  }

  private async generateTokens(user: User, req?: Request): Promise<AuthTokens> {
    const payload = {
      sub: user.id,
      email: user.email,
      verified: user.isVerified,
      roles: user.roles,
    };

    const accessToken = this.jwtService.sign(payload);
    const { refreshToken, tokenId } = await this.createRefreshToken(user.id);

    // Create user session if request is provided
    if (req) {
      try {
        const deviceInfo = this.sessionsService.extractDeviceInfo(req);
        await this.sessionsService.createSession(user.id, tokenId, deviceInfo);
        
        // Create login notification
        await this.notificationsService.createAccountUpdate(
          user.id,
          'New Login Detected',
          'A new device has logged into your account.',
          { 
            action: 'login',
            deviceInfo,
            timestamp: new Date(),
          }
        );
      } catch (error) {
        this.logger.error('Failed to create user session:', error);
        // Don't fail login if session creation fails
      }
    }

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60, // 15 minutes in seconds
    };
  }

  private async createRefreshToken(userId: string): Promise<{ refreshToken: string; tokenId: string }> {
    const familyId = randomUUID();
    const tokenId = randomUUID();
    const refreshToken = randomUUID();

    // Hash the refresh token for storage
    const refreshHash = SecurityUtils.hashToken(refreshToken);

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
    const attemptsKey = `login_attempts:${email}`;
    const attempts = await this.redisService.incr(attemptsKey);
    
    if (attempts === 1) {
      await this.redisService.expire(attemptsKey, 60 * 60); // 1 hour window
    }

    if (attempts >= this.maxLoginAttempts) {
      const lockoutKey = `login_lockout:${email}`;
      await this.redisService.set(lockoutKey, 'locked', this.lockoutDuration);
      this.logger.warn(`Account locked for ${email} due to too many failed login attempts`);
    }
  }

  async invalidateRefreshToken(refreshToken: string): Promise<void> {
    try {
      const refreshHash = SecurityUtils.hashToken(refreshToken);
      
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
      const session = await this.prisma.refreshSession.findFirst({
        where: { refreshHash },
        select: { tokenId: true },
      });

      if (session) {
        await this.prisma.userSession.updateMany({
          where: { refreshTokenId: session.tokenId },
          data: { isCurrent: false },
        });
      }

      this.logger.log('Refresh token invalidated successfully');
    } catch (error) {
      this.logger.error('Failed to invalidate refresh token:', error);
      // Don't throw error as logout should succeed even if token invalidation fails
    }
  }

  async resendVerificationEmail(email: string): Promise<{ message: string }> {
    try {
      // Find user by email
      const user = await this.prisma.user.findUnique({
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
      const verificationToken = SecurityUtils.generateSecureToken(32);
      const tokenHash = SecurityUtils.hashToken(verificationToken);
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

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
      const frontendDomain = this.configService.get('FRONTEND_DOMAIN', 'localhost:3001');
      const verificationUrl = `http://${frontendDomain}/verify-email?token=${verificationToken}`;
      await this.emailService.sendEmailVerification(user.email, {
        name: user.name || 'User',
        verificationUrl,
      });
      this.logger.log(`Verification email resent to ${user.email}`);
      
      return { message: 'Verification email sent successfully' };
    } catch (error) {
      this.logger.error(`Failed to resend verification email to ${email}:`, error);
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
      const verificationToken = SecurityUtils.generateSecureToken(32);
      const tokenHash = SecurityUtils.hashToken(verificationToken);
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

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
      const frontendDomain = this.configService.get('FRONTEND_DOMAIN', 'localhost:3001');
      const verificationUrl = `http://${frontendDomain}/verify-email?token=${verificationToken}`;
      await this.emailService.sendEmailVerification(user.email, {
        name: user.name || 'User',
        verificationUrl,
      });
      this.logger.log(`Verification email resent to ${user.email}`);
    } catch (error) {
      this.logger.error(`Failed to resend verification email to ${user.email}:`, error);
    }
  }

  private async markBackupCodeAsUsed(userId: string, code: string): Promise<void> {
    const codeHash = SecurityUtils.hashToken(code);
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
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  setAuthCookies(res: Response, tokens: AuthTokens): void {
    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';
    const domain = this.configService.get<string>('COOKIE_DOMAIN');
    
    // Set access token cookie (HTTP-only, secure in production)
    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      domain: isProduction && domain ? domain : undefined, // Only set domain in production
      maxAge: tokens.expiresIn * 1000, // Convert seconds to milliseconds
      path: '/',
    });

    // Set refresh token cookie (HTTP-only, secure in production)
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      domain: isProduction && domain ? domain : undefined, // Only set domain in production
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: '/',
    });
  }

  clearAuthCookies(res: Response): void {
    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';
    const domain = this.configService.get<string>('COOKIE_DOMAIN');
    
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
