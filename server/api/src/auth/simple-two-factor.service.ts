import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { EmailService } from '../common/services/email.service';
import { SecurityUtils } from '../common/security/security.utils';
import * as crypto from 'crypto';

export interface TwoFactorCodeResult {
  code: string;
  expiresAt: Date;
}

@Injectable()
export class SimpleTwoFactorService {
  private readonly logger = new Logger(SimpleTwoFactorService.name);
  private readonly codeExpirationMinutes = 10; // 10 minutes expiration

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Enable 2FA for a user - no password required
   */
  async enableTwoFactor(userId: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.twoFactorEnabled) {
      throw new BadRequestException('2FA is already enabled');
    }

    // Enable 2FA
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true },
    });

    return { message: 'Two-factor authentication enabled successfully' };
  }

  /**
   * Disable 2FA for a user - requires current password
   */
  async disableTwoFactor(
    userId: string,
    currentPassword: string,
  ): Promise<{ message: string; forceLogout: boolean }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (!user.twoFactorEnabled) {
      throw new BadRequestException('2FA is not enabled');
    }

    // Verify current password
    const isPasswordValid = await SecurityUtils.verifyPassword(
      user.password,
      currentPassword,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid current password');
    }

    // Disable 2FA and clean up any existing 2FA data
    await this.prisma.$transaction(async (tx) => {
      // Disable 2FA
      await tx.user.update({
        where: { id: userId },
        data: { twoFactorEnabled: false },
      });

      // Clean up old 2FA secrets and backup codes
      await tx.twoFactorSecret.deleteMany({
        where: { userId },
      });

      await tx.backupCode.deleteMany({
        where: { userId },
      });
    });

    // Revoke all refresh tokens for this user (same as password change)
    await this.revokeRefreshTokens(userId);

    // Send 2FA disabled notification email
    try {
      await this.emailService.sendTemplateEmail('security-alert', user.email, {
        name: user.name || 'User',
        appName: 'Safawinet',
        supportEmail: 'support@safawinet.com',
        eventEn: 'Two-Factor Authentication Disabled',
        eventAr: 'إلغاء تفعيل المصادقة الثنائية',
        messageEn:
          'Two-factor authentication has been disabled for your account. If you did not make this change, please contact support immediately.',
        messageAr:
          'تم إلغاء تفعيل المصادقة الثنائية لحسابك. إذا لم تقم بهذا التغيير، يرجى الاتصال بالدعم فوراً.',
        timestamp: new Date().toLocaleString(),
      });
    } catch (error) {
      this.logger.warn(
        'Failed to send 2FA disabled notification email',
        error,
        {
          source: 'simple-two-factor',
          userId,
        },
      );
      // Don't fail 2FA disable if email fails
    }


    return {
      message: 'Two-factor authentication disabled successfully',
      forceLogout: true,
    };
  }

  /**
   * Generate and send a 2FA code via email
   */
  async sendTwoFactorCode(userId: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (!user.twoFactorEnabled) {
      throw new BadRequestException('2FA is not enabled for this user');
    }

    // Generate a 6-digit code
    const code = this.generateCode();
    const expiresAt = new Date(
      Date.now() + this.codeExpirationMinutes * 60 * 1000,
    );

    // Store the code in the database (hashed for security)
    const codeHash = SecurityUtils.hashToken(code);

    await this.prisma.oneTimeToken.upsert({
      where: {
        hash: codeHash,
      },
      update: {
        expiresAt,
        usedAt: null,
      },
      create: {
        userId,
        purpose: 'two_factor_auth',
        hash: codeHash,
        expiresAt,
      },
    });

    // Send email with the code
    await this.emailService.sendTemplateEmail('two-factor-code', user.email, {
      name: user.name || 'User',
      code,
    });

    return { message: 'Two-factor authentication code sent to your email' };
  }

  /**
   * Validate a 2FA code
   */
  async validateTwoFactorCode(
    userId: string,
    code: string,
  ): Promise<{ isValid: boolean }> {
    const codeHash = SecurityUtils.hashToken(code);

    // Find the token
    const token = await this.prisma.oneTimeToken.findFirst({
      where: {
        userId,
        purpose: 'two_factor_auth',
        hash: codeHash,
        usedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!token) {
      return { isValid: false };
    }

    // Mark the token as used
    await this.prisma.oneTimeToken.update({
      where: { id: token.id },
      data: { usedAt: new Date() },
    });

    return { isValid: true };
  }

  /**
   * Revoke all refresh tokens for a user (same as password change)
   */
  private async revokeRefreshTokens(userId: string): Promise<void> {
    await this.prisma.refreshSession.updateMany({
      where: {
        userId,
        isActive: true,
      },
      data: { isActive: false },
    });

    // Also delete user sessions
    await this.prisma.userSession.deleteMany({
      where: { userId },
    });
  }

  /**
   * Generate a 6-digit numeric code
   */
  private generateCode(): string {
    return crypto.randomInt(100000, 999999).toString();
  }
}
