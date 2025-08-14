import { Injectable, Logger, UnauthorizedException, ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/services/prisma.service';
import { RedisService } from '../common/services/redis.service';
import { EmailService } from '../common/services/email.service';
import { SecurityUtils } from '../common/security/security.utils';
import { TwoFactorService } from './two-factor.service';
import { RegisterDto, VerifyEmailDto, LoginDto, RefreshTokenDto, ForgotPasswordDto, ResetPasswordDto, TwoFactorLoginDto } from './schemas/auth.schemas';
import { User } from '@prisma/client';
import { randomUUID } from 'crypto';

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

    // Create user and verification token in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          email: email.toLowerCase(),
          password: hashedPassword,
          name,
          isVerified: false,
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

      return { user, verificationToken };
    });

    // Send verification email
    try {
      await this.emailService.sendVerificationEmail(result.user.email, result.verificationToken);
      this.logger.log(`Verification email sent to ${result.user.email}`);
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${result.user.email}:`, error);
      // Don't fail registration if email fails
    }

    // Return user without password
    const { password: _, ...userWithoutPassword } = result.user;
    return {
      message: 'User registered successfully. Please check your email to verify your account.',
      user: userWithoutPassword,
    };
  }

  async verifyEmail(verifyEmailDto: VerifyEmailDto): Promise<{ message: string }> {
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

      // Mark token as used and verify user
      await tx.oneTimeToken.update({
        where: { id: oneTimeToken.id },
        data: { usedAt: new Date() },
      });

      await tx.user.update({
        where: { id: oneTimeToken.user.id },
        data: { isVerified: true },
      });

      return oneTimeToken.user;
    });

    this.logger.log(`Email verified for user ${result.email}`);
    return { message: 'Email verified successfully' };
  }

  async login(loginDto: LoginDto): Promise<LoginResult> {
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
      await this.resendVerificationEmail(user);
      
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
    const tokens = await this.generateTokens(user);

    this.logger.log(`User ${user.email} logged in successfully`);
    
    return {
      tokens,
      user: this.excludePassword(user),
    };
  }

  async twoFactorLogin(userId: string, twoFactorLoginDto: TwoFactorLoginDto): Promise<LoginResult> {
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
    const tokens = await this.generateTokens(user);

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

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
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
        data: { password: hashedPassword },
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

    return { message: 'Password reset successfully. Please log in with your new password.' };
  }

  private async generateTokens(user: User): Promise<AuthTokens> {
    const payload = {
      sub: user.id,
      email: user.email,
      verified: user.isVerified,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = await this.createRefreshToken(user.id);

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60, // 15 minutes in seconds
    };
  }

  private async createRefreshToken(userId: string): Promise<string> {
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

    return refreshToken;
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

  private async resendVerificationEmail(user: User): Promise<void> {
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
      await this.emailService.sendVerificationEmail(user.email, verificationToken);
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
}
