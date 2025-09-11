import {
  Injectable,
  Logger,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/services/prisma.service';
import { SecurityUtils } from '../common/security/security.utils';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';

export interface TwoFactorSetupResult {
  secret: string;
  qrCode: string;
  otpauthUrl: string;
  backupCodes: string[];
}

export interface BackupCodeValidationResult {
  isValid: boolean;
  isBackupCode: boolean;
}

@Injectable()
export class TwoFactorService {
  private readonly logger = new Logger(TwoFactorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async setupTwoFactor(userId: string): Promise<TwoFactorSetupResult> {
    // Check if user already has 2FA enabled
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { twoFactorSecret: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.twoFactorEnabled) {
      throw new BadRequestException('2FA is already enabled');
    }

    // Generate new TOTP secret
    const secret = speakeasy.generateSecret({
      name: user.email,
      issuer: this.configService.get<string>('APP_NAME', 'SafaWinet'),
      length: 32,
    });

    // Generate QR code
    const qrCode = await QRCode.toDataURL(secret.otpauth_url);

    // Generate 10 backup codes
    const backupCodes = this.generateBackupCodes();

    // Store encrypted secret and hashed backup codes in a transaction
    await this.prisma.$transaction(async (tx) => {
      // Store encrypted secret
      const encryptedSecret = SecurityUtils.encryptData(secret.base32);
      await tx.twoFactorSecret.create({
        data: {
          userId,
          secret: encryptedSecret,
        },
      });

      // Store hashed backup codes
      const backupCodeData = backupCodes.map((code) => ({
        userId,
        codeHash: SecurityUtils.hashToken(code),
      }));

      await tx.backupCode.createMany({
        data: backupCodeData,
      });
    });

    this.logger.log(`2FA setup initiated for user ${user.email}`);

    return {
      secret: secret.base32!,
      qrCode,
      otpauthUrl: secret.otpauth_url!,
      backupCodes,
    };
  }

  async enableTwoFactor(
    userId: string,
    code: string,
  ): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { twoFactorSecret: true },
    });

    if (!user || !user.twoFactorSecret) {
      throw new BadRequestException(
        '2FA setup not found. Please run setup first.',
      );
    }

    if (user.twoFactorEnabled) {
      throw new BadRequestException('2FA is already enabled');
    }

    // Verify the TOTP code
    const isValid = this.verifyTOTP(user.twoFactorSecret.secret, code);
    if (!isValid) {
      throw new UnauthorizedException('Invalid TOTP code');
    }

    // Enable 2FA
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true },
    });

    this.logger.log(`2FA enabled for user ${user.email}`);
    return { message: 'Two-factor authentication enabled successfully' };
  }

  async disableTwoFactor(
    userId: string,
    code: string,
  ): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { twoFactorSecret: true, backupCodes: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (!user.twoFactorEnabled) {
      throw new BadRequestException('2FA is not enabled');
    }

    // Verify the code (TOTP or backup code)
    const validationResult = await this.validateCode(userId, code);
    if (!validationResult.isValid) {
      throw new UnauthorizedException('Invalid code');
    }

    // If it's a backup code, mark it as used
    if (validationResult.isBackupCode) {
      await this.markBackupCodeAsUsed(userId, code);
    }

    // Disable 2FA and clean up
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { twoFactorEnabled: false },
      });

      // Delete 2FA secret and backup codes
      await tx.twoFactorSecret.delete({
        where: { userId },
      });

      await tx.backupCode.deleteMany({
        where: { userId },
      });
    });

    this.logger.log(`2FA disabled for user ${user.email}`);
    return { message: 'Two-factor authentication disabled successfully' };
  }

  async validateTwoFactorCode(
    userId: string,
    code: string,
  ): Promise<BackupCodeValidationResult> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { twoFactorSecret: true },
    });

    if (!user || !user.twoFactorEnabled) {
      throw new BadRequestException('2FA is not enabled');
    }

    return await this.validateCode(userId, code);
  }

  private async validateCode(
    userId: string,
    code: string,
  ): Promise<BackupCodeValidationResult> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { twoFactorSecret: true, backupCodes: true },
    });

    if (!user || !user.twoFactorSecret) {
      return { isValid: false, isBackupCode: false };
    }

    // First, check if it's a backup code
    const backupCode = user.backupCodes.find(
      (bc) => !bc.isUsed && SecurityUtils.verifyToken(code, bc.codeHash),
    );

    if (backupCode) {
      return { isValid: true, isBackupCode: true };
    }

    // Then check if it's a valid TOTP code
    const isValidTOTP = this.verifyTOTP(user.twoFactorSecret.secret, code);
    return { isValid: isValidTOTP, isBackupCode: false };
  }

  private verifyTOTP(encryptedSecret: string, code: string): boolean {
    try {
      const secret = SecurityUtils.decryptData(encryptedSecret);
      return speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token: code,
        window: 1, // Allow 1 time step in either direction for clock skew
      });
    } catch (error) {
      this.logger.error('Error verifying TOTP:', error);
      return false;
    }
  }

  private async markBackupCodeAsUsed(
    userId: string,
    code: string,
  ): Promise<void> {
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

  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      // Generate 8-character alphanumeric codes
      const code = SecurityUtils.generateSecureToken(8).toUpperCase();
      codes.push(code);
    }
    return codes;
  }
}
