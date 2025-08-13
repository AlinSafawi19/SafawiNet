import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../common/services/prisma.service';
import { EmailService } from '../common/services/email.service';
import { SecurityUtils } from '../common/security/security.utils';

describe('UsersService', () => {
  let service: UsersService;
  let prismaService: PrismaService;
  let emailService: EmailService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    oneTimeToken: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockEmailService = {
    sendVerificationEmail: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prismaService = module.get<PrismaService>(PrismaService);
    emailService = module.get<EmailService>(EmailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    it('should create a user successfully', async () => {
      const createUserDto = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };

      const hashedPassword = 'hashedPassword123';
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        password: hashedPassword,
        name: 'Test User',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockToken = 'verificationToken123';
      const mockTokenHash = 'tokenHash123';

      jest.spyOn(SecurityUtils, 'hashPassword').mockResolvedValue(hashedPassword);
      jest.spyOn(SecurityUtils, 'generateSecureToken').mockReturnValue(mockToken);
      jest.spyOn(SecurityUtils, 'hashToken').mockReturnValue(mockTokenHash);

      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(mockUser);
      mockPrismaService.oneTimeToken.create.mockResolvedValue({});
      mockEmailService.sendVerificationEmail.mockResolvedValue(undefined);

      const result = await service.createUser(createUserDto);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(SecurityUtils.hashPassword).toHaveBeenCalledWith('password123');
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: {
          email: 'test@example.com',
          password: hashedPassword,
          name: 'Test User',
        },
      });
      expect(SecurityUtils.generateSecureToken).toHaveBeenCalled();
      expect(SecurityUtils.hashToken).toHaveBeenCalledWith(mockToken);
      expect(mockPrismaService.oneTimeToken.create).toHaveBeenCalledWith({
        data: {
          purpose: 'email_verification',
          hash: mockTokenHash,
          userId: 'user123',
          expiresAt: expect.any(Date),
        },
      });
      expect(mockEmailService.sendVerificationEmail).toHaveBeenCalledWith(
        'test@example.com',
        mockToken,
      );

      const { password, ...expectedResult } = mockUser;
      expect(result).toEqual(expectedResult);
    });

    it('should throw ConflictException if user already exists', async () => {
      const createUserDto = {
        email: 'existing@example.com',
        password: 'password123',
        name: 'Test User',
      };

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'existing123',
        email: 'existing@example.com',
      });

      await expect(service.createUser(createUserDto)).rejects.toThrow(
        'User with this email already exists',
      );
    });
  });

  describe('findUserById', () => {
    it('should return user without password', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        password: 'hashedPassword',
        name: 'Test User',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findUserById('user123');

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user123' },
      });

      const { password, ...expectedResult } = mockUser;
      expect(result).toEqual(expectedResult);
    });

    it('should return null if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.findUserById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findUserByEmail', () => {
    it('should return user with password', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        password: 'hashedPassword',
        name: 'Test User',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findUserByEmail('test@example.com');

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe('findAllUsers', () => {
    it('should return all users without passwords', async () => {
      const mockUsers = [
        {
          id: 'user1',
          email: 'user1@example.com',
          password: 'hashedPassword1',
          name: 'User 1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'user2',
          email: 'user2@example.com',
          password: 'hashedPassword2',
          name: 'User 2',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);

      const result = await service.findAllUsers();

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
      });

      const expectedResult = mockUsers.map(({ password, ...user }) => user);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('verifyEmail', () => {
    it('should verify email successfully', async () => {
      const token = 'validToken';
      const tokenHash = 'validTokenHash';

      jest.spyOn(SecurityUtils, 'hashToken').mockReturnValue(tokenHash);

      const mockTokenRecord = {
        id: 'token123',
        purpose: 'email_verification',
        hash: tokenHash,
        userId: 'user123',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Future date
        usedAt: null,
      };

      mockPrismaService.oneTimeToken.findFirst.mockResolvedValue(mockTokenRecord);
      mockPrismaService.oneTimeToken.update.mockResolvedValue({});

      const result = await service.verifyEmail(token);

      expect(SecurityUtils.hashToken).toHaveBeenCalledWith(token);
      expect(mockPrismaService.oneTimeToken.findFirst).toHaveBeenCalledWith({
        where: {
          hash: tokenHash,
          purpose: 'email_verification',
          expiresAt: { gt: expect.any(Date) },
          usedAt: null,
        },
      });
      expect(mockPrismaService.oneTimeToken.update).toHaveBeenCalledWith({
        where: { id: 'token123' },
        data: { usedAt: expect.any(Date) },
      });
      expect(result).toBe(true);
    });

    it('should return false for invalid token', async () => {
      const token = 'invalidToken';
      const tokenHash = 'invalidTokenHash';

      jest.spyOn(SecurityUtils, 'hashToken').mockReturnValue(tokenHash);

      mockPrismaService.oneTimeToken.findFirst.mockResolvedValue(null);

      const result = await service.verifyEmail(token);

      expect(result).toBe(false);
    });
  });

  describe('requestPasswordReset', () => {
    it('should create password reset token and send email', async () => {
      const email = 'test@example.com';
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        password: 'hashedPassword',
        name: 'Test User',
      };

      const mockToken = 'resetToken123';
      const mockTokenHash = 'resetTokenHash123';

      jest.spyOn(SecurityUtils, 'generateSecureToken').mockReturnValue(mockToken);
      jest.spyOn(SecurityUtils, 'hashToken').mockReturnValue(mockTokenHash);

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.oneTimeToken.create.mockResolvedValue({});
      mockEmailService.sendPasswordResetEmail.mockResolvedValue(undefined);

      await service.requestPasswordReset(email);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(SecurityUtils.generateSecureToken).toHaveBeenCalled();
      expect(SecurityUtils.hashToken).toHaveBeenCalledWith(mockToken);
      expect(mockPrismaService.oneTimeToken.create).toHaveBeenCalledWith({
        data: {
          purpose: 'password_reset',
          hash: mockTokenHash,
          userId: 'user123',
          expiresAt: expect.any(Date),
        },
      });
      expect(mockEmailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        'test@example.com',
        mockToken,
      );
    });

    it('should not fail if user does not exist', async () => {
      const email = 'nonexistent@example.com';

      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.requestPasswordReset(email)).resolves.not.toThrow();
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
      const token = 'validResetToken';
      const newPassword = 'newPassword123';
      const tokenHash = 'validResetTokenHash';
      const hashedNewPassword = 'hashedNewPassword123';

      jest.spyOn(SecurityUtils, 'hashToken').mockReturnValue(tokenHash);
      jest.spyOn(SecurityUtils, 'hashPassword').mockResolvedValue(hashedNewPassword);

      const mockTokenRecord = {
        id: 'token123',
        purpose: 'password_reset',
        hash: tokenHash,
        userId: 'user123',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // Future date
        usedAt: null,
      };

      mockPrismaService.oneTimeToken.findFirst.mockResolvedValue(mockTokenRecord);
      mockPrismaService.$transaction.mockResolvedValue([{}, {}]);

      const result = await service.resetPassword(token, newPassword);

      expect(SecurityUtils.hashToken).toHaveBeenCalledWith(token);
      expect(mockPrismaService.oneTimeToken.findFirst).toHaveBeenCalledWith({
        where: {
          hash: tokenHash,
          purpose: 'password_reset',
          expiresAt: { gt: expect.any(Date) },
          usedAt: null,
        },
      });
      expect(SecurityUtils.hashPassword).toHaveBeenCalledWith(newPassword);
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false for invalid reset token', async () => {
      const token = 'invalidResetToken';
      const newPassword = 'newPassword123';
      const tokenHash = 'invalidResetTokenHash';

      jest.spyOn(SecurityUtils, 'hashToken').mockReturnValue(tokenHash);

      mockPrismaService.oneTimeToken.findFirst.mockResolvedValue(null);

      const result = await service.resetPassword(token, newPassword);

      expect(result).toBe(false);
    });
  });
});
