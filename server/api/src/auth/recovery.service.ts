import { Injectable, Logger, BadRequestException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/services/prisma.service';
import { SecurityUtils } from '../common/security/security.utils';
import { EmailService } from '../common/services/email.service';

export interface RecoveryRequestResult {
  message: string;
  recoveryEmail: string;
}

export interface RecoveryConfirmResult {
  message: string;
  newEmail: string;
  requiresVerification: boolean;
}

@Injectable()
export class RecoveryService {
  private readonly logger = new Logger(RecoveryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  async requestRecovery(recoveryEmail: string): Promise<RecoveryRequestResult> {
    // Find user by recovery email
    const user = await this.prisma.user.findFirst({
      where: { recoveryEmail: recoveryEmail.toLowerCase() },
    });

    if (!user) {
      // Don't reveal if recovery email exists or not for security
      this.logger.warn(`Recovery requested for non-existent recovery email: ${recoveryEmail}`);
      return {
        message: 'If the recovery email is registered, you will receive a recovery token shortly.',
        recoveryEmail: recoveryEmail,
      };
    }

    // Check if user already has a pending recovery
    const existingRecovery = await this.prisma.recoveryStaging.findUnique({
      where: { userId: user.id },
    });

    if (existingRecovery) {
      // If existing recovery is expired, delete it
      if (existingRecovery.expiresAt < new Date()) {
        await this.prisma.recoveryStaging.delete({
          where: { userId: user.id },
        });
      } else {
        throw new BadRequestException('Recovery already in progress. Please wait or check your email.');
      }
    }

    // Generate recovery token
    const recoveryToken = SecurityUtils.generateSecureToken(32);
    const tokenHash = SecurityUtils.hashToken(recoveryToken);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    // Store recovery staging
    await this.prisma.recoveryStaging.create({
      data: {
        userId: user.id,
        newEmail: '', // Will be set during confirmation
        recoveryTokenHash: tokenHash,
        expiresAt,
      },
    });

    // Send recovery email
    const recoveryUrl = `${this.configService.get('API_DOMAIN')}/recover?token=${recoveryToken}`;
    await this.emailService.sendTemplateEmail('recovery-email', recoveryEmail, {
      name: user.name || 'User',
      recoveryUrl,
      originalEmail: user.email,
      appName: 'Safawinet',
      supportEmail: 'support@safawinet.com',
    });

    this.logger.log(`Recovery requested for user ${user.email} via recovery email ${recoveryEmail}`);

    return {
      message: 'Recovery token sent to your recovery email. Please check your inbox.',
      recoveryEmail: recoveryEmail,
    };
  }

  async confirmRecovery(token: string, newEmail: string): Promise<RecoveryConfirmResult> {
    // Find recovery staging by token
    const recoveryStaging = await this.prisma.recoveryStaging.findFirst({
      where: {
        recoveryTokenHash: SecurityUtils.hashToken(token),
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!recoveryStaging) {
      throw new UnauthorizedException('Invalid or expired recovery token');
    }

    // Check if new email is already in use
    const existingUser = await this.prisma.user.findUnique({
      where: { email: newEmail.toLowerCase() },
    });

    if (existingUser && existingUser.id !== recoveryStaging.userId) {
      throw new BadRequestException('Email address is already in use by another account');
    }

    // Update recovery staging with new email
    await this.prisma.recoveryStaging.update({
      where: { userId: recoveryStaging.userId },
      data: { newEmail: newEmail.toLowerCase() },
    });

    // Generate verification token for new email
    const verificationToken = SecurityUtils.generateSecureToken(32);
    const tokenHash = SecurityUtils.hashToken(verificationToken);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    // Store verification token
    await this.prisma.oneTimeToken.create({
      data: {
        purpose: 'email_verification',
        hash: tokenHash,
        userId: recoveryStaging.userId,
        expiresAt,
      },
    });

    // Send verification email to new email
    const frontendDomain = this.configService.get('FRONTEND_DOMAIN', 'localhost:3001');
    const verificationUrl = `http://${frontendDomain}/verify-email?token=${verificationToken}`;
    await this.emailService.sendEmailVerification(newEmail, {
      name: recoveryStaging.user.name || 'User',
      verificationUrl,
    });

    this.logger.log(`Recovery confirmed for user ${recoveryStaging.user.email}, new email staged: ${newEmail}`);

    return {
      message: 'Recovery confirmed. Please verify your new email address to complete the process.',
      newEmail: newEmail,
      requiresVerification: true,
    };
  }

  async completeRecovery(verificationToken: string): Promise<{ message: string }> {
    // Find verification token
    const token = await this.prisma.oneTimeToken.findFirst({
      where: {
        purpose: 'email_verification',
        hash: SecurityUtils.hashToken(verificationToken),
        expiresAt: { gt: new Date() },
        usedAt: null,
      },
      include: { user: true },
    });

    if (!token) {
      throw new UnauthorizedException('Invalid or expired verification token');
    }

    // Find recovery staging
    const recoveryStaging = await this.prisma.recoveryStaging.findUnique({
      where: { userId: token.userId },
    });

    if (!recoveryStaging || !recoveryStaging.newEmail) {
      throw new BadRequestException('No recovery staging found or new email not set');
    }

    // Mark token as used
    await this.prisma.oneTimeToken.update({
      where: { id: token.id },
      data: { usedAt: new Date() },
    });

    // Update user's email
    await this.prisma.user.update({
      where: { id: token.userId },
      data: { 
        email: recoveryStaging.newEmail,
        isVerified: true, // New email is verified
      },
    });

    // Clear recovery staging
    await this.prisma.recoveryStaging.delete({
      where: { userId: token.userId },
    });

    // Invalidate all existing sessions for security
    await this.prisma.refreshSession.updateMany({
      where: { userId: token.userId },
      data: { isActive: false },
    });

    this.logger.log(`Recovery completed for user ${token.user.email}, email changed to: ${recoveryStaging.newEmail}`);

    return {
      message: 'Account recovery completed successfully. Your email has been updated and all sessions have been invalidated.',
    };
  }

  async cleanupExpiredRecoveries(): Promise<void> {
    const expiredRecoveries = await this.prisma.recoveryStaging.findMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    if (expiredRecoveries.length > 0) {
      await this.prisma.recoveryStaging.deleteMany({
        where: {
          id: { in: expiredRecoveries.map(r => r.id) },
        },
      });

      this.logger.log(`Cleaned up ${expiredRecoveries.length} expired recovery attempts`);
    }
  }
}
