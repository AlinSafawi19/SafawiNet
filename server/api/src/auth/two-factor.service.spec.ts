// Mock modules before importing
jest.mock('speakeasy', () => ({
  default: {
    totp: {
      verify: jest.fn(),
    },
    generateSecret: jest.fn().mockReturnValue({
      base32: 'TESTSECRET',
      otpauth_url: 'otpauth://totp/test',
    }),
  },
}));

jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,mock-qr-code'),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { TwoFactorService } from './two-factor.service';
import { PrismaService } from '../common/services/prisma.service';
import { SecurityUtils } from '../common/security/security.utils';

describe('TwoFactorService', () => {
  let service: TwoFactorService;
  let prismaService: PrismaService;
  let configService: ConfigService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    twoFactorSecret: {
      create: jest.fn(),
      delete: jest.fn(),
    },
    backupCode: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('SafaWinet'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TwoFactorService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<TwoFactorService>(TwoFactorService);
    prismaService = module.get<PrismaService>(PrismaService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('setupTwoFactor', () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      twoFactorEnabled: false,
    };

    it('should setup 2FA successfully', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrismaService);
      });

      const result = await service.setupTwoFactor('user-1');

      expect(result).toHaveProperty('secret');
      expect(result).toHaveProperty('qrCode');
      expect(result).toHaveProperty('otpauthUrl');
      expect(result).toHaveProperty('backupCodes');
      expect(result.backupCodes).toHaveLength(10);
      expect(mockPrismaService.twoFactorSecret.create).toHaveBeenCalled();
      expect(mockPrismaService.backupCode.createMany).toHaveBeenCalled();
    });

    it('should throw error if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.setupTwoFactor('user-1')).rejects.toThrow(
        new BadRequestException('User not found')
      );
    });

    it('should throw error if 2FA already enabled', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        twoFactorEnabled: true,
      });

      await expect(service.setupTwoFactor('user-1')).rejects.toThrow(
        new BadRequestException('2FA is already enabled')
      );
    });
  });

  describe('enableTwoFactor', () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      twoFactorEnabled: false,
      twoFactorSecret: {
        secret: SecurityUtils.encryptData('TESTSECRET'),
      },
    };

    it('should enable 2FA with valid TOTP code', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue(mockUser);

      // Mock speakeasy.totp.verify to return true
      const speakeasy = require('speakeasy');
      speakeasy.default.totp.verify.mockReturnValue(true);

      const result = await service.enableTwoFactor('user-1', '123456');

      expect(result).toEqual({ message: 'Two-factor authentication enabled successfully' });
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { twoFactorEnabled: true },
      });
    });

    it('should throw error if 2FA setup not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        twoFactorSecret: null,
      });

      await expect(service.enableTwoFactor('user-1', '123456')).rejects.toThrow(
        new BadRequestException('2FA setup not found. Please run setup first.')
      );
    });

    it('should throw error if 2FA already enabled', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        twoFactorEnabled: true,
      });

      await expect(service.enableTwoFactor('user-1', '123456')).rejects.toThrow(
        new BadRequestException('2FA is already enabled')
      );
    });

    it('should throw error for invalid TOTP code', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      // Mock speakeasy.totp.verify to return false
      const speakeasy = require('speakeasy');
      speakeasy.default.totp.verify.mockReturnValue(false);

      await expect(service.enableTwoFactor('user-1', '123456')).rejects.toThrow(
        new UnauthorizedException('Invalid TOTP code')
      );
    });
  });

  describe('disableTwoFactor', () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      twoFactorEnabled: true,
      twoFactorSecret: {
        secret: SecurityUtils.encryptData('TESTSECRET'),
      },
      backupCodes: [
        {
          codeHash: SecurityUtils.hashToken('BACKUP123'),
          isUsed: false,
        },
      ],
    };

    it('should disable 2FA with valid TOTP code', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrismaService);
      });

      // Mock speakeasy.totp.verify to return true
      const speakeasy = require('speakeasy');
      speakeasy.default.totp.verify.mockReturnValue(true);

      const result = await service.disableTwoFactor('user-1', '123456');

      expect(result).toEqual({ message: 'Two-factor authentication disabled successfully' });
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { twoFactorEnabled: false },
      });
      expect(mockPrismaService.twoFactorSecret.delete).toHaveBeenCalled();
      expect(mockPrismaService.backupCode.deleteMany).toHaveBeenCalled();
    });

    it('should disable 2FA with valid backup code', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrismaService);
      });

      // Mock speakeasy.totp.verify to return false
      const speakeasy = require('speakeasy');
      speakeasy.default.totp.verify.mockReturnValue(false);

      const result = await service.disableTwoFactor('user-1', 'BACKUP123');

      expect(result).toEqual({ message: 'Two-factor authentication disabled successfully' });
      expect(mockPrismaService.backupCode.updateMany).toHaveBeenCalled();
    });

    it('should throw error if 2FA not enabled', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        twoFactorEnabled: false,
      });

      await expect(service.disableTwoFactor('user-1', '123456')).rejects.toThrow(
        new BadRequestException('2FA is not enabled')
      );
    });

    it('should throw error for invalid code', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      // Mock speakeasy.totp.verify to return false
      const speakeasy = require('speakeasy');
      speakeasy.default.totp.verify.mockReturnValue(false);

      await expect(service.disableTwoFactor('user-1', 'INVALID')).rejects.toThrow(
        new UnauthorizedException('Invalid code')
      );
    });
  });

  describe('validateTwoFactorCode', () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      twoFactorEnabled: true,
      twoFactorSecret: {
        secret: SecurityUtils.encryptData('TESTSECRET'),
      },
      backupCodes: [
        {
          codeHash: SecurityUtils.hashToken('BACKUP123'),
          isUsed: false,
        },
      ],
    };

    it('should validate TOTP code successfully', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      // Mock speakeasy.totp.verify to return true
      const speakeasy = require('speakeasy');
      speakeasy.default.totp.verify.mockReturnValue(true);

      const result = await service.validateTwoFactorCode('user-1', '123456');

      expect(result).toEqual({ isValid: true, isBackupCode: false });
    });

    it('should validate backup code successfully', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      // Mock speakeasy.totp.verify to return false
      const speakeasy = require('speakeasy');
      speakeasy.default.totp.verify.mockReturnValue(false);

      const result = await service.validateTwoFactorCode('user-1', 'BACKUP123');

      expect(result).toEqual({ isValid: true, isBackupCode: true });
    });

    it('should return invalid for unknown code', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      // Mock speakeasy.totp.verify to return false
      const speakeasy = require('speakeasy');
      speakeasy.default.totp.verify.mockReturnValue(false);

      const result = await service.validateTwoFactorCode('user-1', 'UNKNOWN');

      expect(result).toEqual({ isValid: false, isBackupCode: false });
    });

    it('should throw error if 2FA not enabled', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        twoFactorEnabled: false,
      });

      await expect(service.validateTwoFactorCode('user-1', '123456')).rejects.toThrow(
        new BadRequestException('2FA is not enabled')
      );
    });
  });
});
