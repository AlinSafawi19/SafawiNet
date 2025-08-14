import { Test, TestingModule } from '@nestjs/testing';
import { RecoveryService } from './recovery.service';
import { PrismaService } from '../common/services/prisma.service';
import { EmailService } from '../common/services/email.service';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';

describe('RecoveryService', () => {
  let service: RecoveryService;
  let prismaService: jest.Mocked<PrismaService>;
  let emailService: jest.Mocked<EmailService>;
  let configService: jest.Mocked<ConfigService>;

  const mockUser = {
    id: 1,
    email: 'test@example.com',
    recoveryEmail: 'recovery@example.com',
    twoFactorEnabled: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRecoveryStaging = {
    id: 1,
    userId: 1,
    newEmail: '',
    recoveryTokenHash: 'hashed-token',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    createdAt: new Date(),
  };

  const expiredStaging = {
    ...mockRecoveryStaging,
    expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
  };

  const tokenRecord = {
    id: 1,
    userId: 1,
    purpose: 'email_verification',
    hash: 'hashed-token',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    createdAt: new Date(),
    usedAt: null,
    user: mockUser,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecoveryService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findFirst: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            recoveryStaging: {
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
              deleteMany: jest.fn(),
            },
            oneTimeToken: {
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
            refreshSession: {
              updateMany: jest.fn(),
            },
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendRecoveryEmail: jest.fn(),
            sendVerificationEmail: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RecoveryService>(RecoveryService);
    prismaService = module.get(PrismaService);
    emailService = module.get(EmailService);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('requestRecovery', () => {
    it('should successfully request recovery for valid user', async () => {
      // Mock successful user lookup by recovery email
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
      (prismaService.recoveryStaging.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.recoveryStaging.create as jest.Mock).mockResolvedValue(mockRecoveryStaging);
      (emailService.sendRecoveryEmail as jest.Mock).mockResolvedValue(undefined);

      const result = await service.requestRecovery('recovery@example.com');

      expect(result).toEqual({
        message: 'Recovery token sent to your recovery email. Please check your inbox.',
        recoveryEmail: 'recovery@example.com',
      });

      expect(prismaService.user.findFirst).toHaveBeenCalledWith({
        where: { recoveryEmail: 'recovery@example.com' },
      });
      expect(prismaService.recoveryStaging.create).toHaveBeenCalled();
      expect(emailService.sendRecoveryEmail).toHaveBeenCalledWith(
        'recovery@example.com',
        expect.any(String),
        'test@example.com'
      );
    });

    it('should return success message for non-existent recovery email', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.requestRecovery('nonexistent@example.com');

      expect(result).toEqual({
        message: 'If the recovery email is registered, you will receive a recovery token shortly.',
        recoveryEmail: 'nonexistent@example.com',
      });
    });

    it('should handle existing recovery request and create new one', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
      (prismaService.recoveryStaging.findUnique as jest.Mock).mockResolvedValue(expiredStaging);
      (prismaService.recoveryStaging.delete as jest.Mock).mockResolvedValue(expiredStaging);
      (prismaService.recoveryStaging.create as jest.Mock).mockResolvedValue(mockRecoveryStaging);
      (emailService.sendRecoveryEmail as jest.Mock).mockResolvedValue(undefined);

      const result = await service.requestRecovery('recovery@example.com');

      expect(result).toEqual({
        message: 'Recovery token sent to your recovery email. Please check your inbox.',
        recoveryEmail: 'recovery@example.com',
      });

      expect(prismaService.recoveryStaging.delete).toHaveBeenCalledWith({
        where: { userId: expiredStaging.userId },
      });
      expect(prismaService.recoveryStaging.create).toHaveBeenCalled();
    });
  });

  describe('confirmRecovery', () => {
    it('should successfully confirm recovery with valid token', async () => {
      (prismaService.recoveryStaging.findFirst as jest.Mock).mockResolvedValue({
        ...mockRecoveryStaging,
        user: mockUser,
      });
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.recoveryStaging.update as jest.Mock).mockResolvedValue(mockRecoveryStaging);
      (prismaService.oneTimeToken.create as jest.Mock).mockResolvedValue({} as any);
      (emailService.sendVerificationEmail as jest.Mock).mockResolvedValue(undefined);

      const result = await service.confirmRecovery('valid-token', 'newemail@example.com');

      expect(result).toEqual({
        message: 'Recovery confirmed. Please verify your new email address to complete the process.',
        newEmail: 'newemail@example.com',
        requiresVerification: true,
      });

      expect(prismaService.recoveryStaging.update).toHaveBeenCalledWith({
        where: { userId: mockRecoveryStaging.userId },
        data: { newEmail: 'newemail@example.com' },
      });
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      (prismaService.recoveryStaging.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.confirmRecovery('invalid-token', 'newemail@example.com')
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw BadRequestException if new email already exists', async () => {
      (prismaService.recoveryStaging.findFirst as jest.Mock).mockResolvedValue({
        ...mockRecoveryStaging,
        user: mockUser,
      });
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue({
        id: 2,
        email: 'newemail@example.com',
      });

      await expect(
        service.confirmRecovery('valid-token', 'newemail@example.com')
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow setting new email to be same as current email', async () => {
      (prismaService.recoveryStaging.findFirst as jest.Mock).mockResolvedValue({
        ...mockRecoveryStaging,
        user: mockUser,
      });
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser); // Same user
      (prismaService.recoveryStaging.update as jest.Mock).mockResolvedValue(mockRecoveryStaging);
      (prismaService.oneTimeToken.create as jest.Mock).mockResolvedValue({} as any);
      (emailService.sendVerificationEmail as jest.Mock).mockResolvedValue(undefined);

      const result = await service.confirmRecovery('valid-token', 'test@example.com');

      expect(result).toEqual({
        message: 'Recovery confirmed. Please verify your new email address to complete the process.',
        newEmail: 'test@example.com',
        requiresVerification: true,
      });

      expect(prismaService.recoveryStaging.update).toHaveBeenCalledWith({
        where: { userId: mockRecoveryStaging.userId },
        data: { newEmail: 'test@example.com' },
      });
    });
  });

  describe('completeRecovery', () => {
    it('should successfully complete recovery with valid token', async () => {
      (prismaService.oneTimeToken.findFirst as jest.Mock).mockResolvedValue(tokenRecord);
      (prismaService.recoveryStaging.findUnique as jest.Mock).mockResolvedValue({
        ...mockRecoveryStaging,
        newEmail: 'newemail@example.com',
      });
      (prismaService.oneTimeToken.update as jest.Mock).mockResolvedValue(tokenRecord);
      (prismaService.user.update as jest.Mock).mockResolvedValue(mockUser);
      (prismaService.recoveryStaging.delete as jest.Mock).mockResolvedValue(mockRecoveryStaging);
      (prismaService.refreshSession.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

      const result = await service.completeRecovery('valid-token');

      expect(result).toEqual({
        message: 'Account recovery completed successfully. Your email has been updated and all sessions have been invalidated.',
      });

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { 
          email: 'newemail@example.com',
          isVerified: true,
        },
      });
      expect(prismaService.refreshSession.updateMany).toHaveBeenCalledWith({
        where: { userId: mockUser.id },
        data: { isActive: false },
      });
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      (prismaService.oneTimeToken.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.completeRecovery('invalid-token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw BadRequestException for missing recovery staging', async () => {
      (prismaService.oneTimeToken.findFirst as jest.Mock).mockResolvedValue(tokenRecord);
      (prismaService.recoveryStaging.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.completeRecovery('valid-token')).rejects.toThrow(BadRequestException);
    });
  });

  describe('cleanupExpiredRecoveries', () => {
    it('should clean up expired recovery requests', async () => {
      const expiredRecoveries = [expiredStaging, { ...expiredStaging, id: 2 }];
      (prismaService.recoveryStaging.findMany as jest.Mock).mockResolvedValue(expiredRecoveries);
      (prismaService.recoveryStaging.deleteMany as jest.Mock).mockResolvedValue({ count: 2 });

      await service.cleanupExpiredRecoveries();

      expect(prismaService.recoveryStaging.findMany).toHaveBeenCalledWith({
        where: {
          expiresAt: {
            lt: expect.any(Date),
          },
        },
      });
      expect(prismaService.recoveryStaging.deleteMany).toHaveBeenCalledWith({
        where: {
          id: {
            in: [1, 2],
          },
        },
      });
    });

    it('should handle no expired recoveries', async () => {
      (prismaService.recoveryStaging.findMany as jest.Mock).mockResolvedValue([]);

      await service.cleanupExpiredRecoveries();

      expect(prismaService.recoveryStaging.deleteMany).not.toHaveBeenCalled();
    });
  });
});
