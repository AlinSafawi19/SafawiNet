import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { PrismaService } from '../common/services/prisma.service';
import { EmailService } from '../common/services/email.service';
import { RedisService } from '../common/services/redis.service';
import { PinoLoggerService } from '../common/services/logger.service';
import { SentryService } from '../common/services/sentry.service';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: PrismaService;
  let jwtService: JwtService;
  let emailService: EmailService;
  let redisService: RedisService;
  let loggerService: PinoLoggerService;
  let sentryService: SentryService;

  const mockPrismaService = {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    oneTimeToken: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
    refreshSession: {
      create: jest.fn(),
      findFirst: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const mockEmailService = {
    sendEmail: jest.fn(),
  };

  const mockRedisService = {
    set: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
  };

  const mockLoggerService = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  };

  const mockSentryService = {
    captureException: jest.fn(),
    captureMessage: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: PinoLoggerService,
          useValue: mockLoggerService,
        },
        {
          provide: SentryService,
          useValue: mockSentryService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                JWT_SECRET: 'test-secret',
                JWT_REFRESH_SECRET: 'test-refresh-secret',
                JWT_EXPIRES_IN: '15m',
                JWT_REFRESH_EXPIRES_IN: '7d',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
    emailService = module.get<EmailService>(EmailService);
    redisService = module.get<RedisService>(RedisService);
    loggerService = module.get<PinoLoggerService>(PinoLoggerService);
    sentryService = module.get<SentryService>(SentryService);

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerData = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
    };

    it('should register a new user successfully', async () => {
      const hashedPassword = 'hashedPassword123';
      const mockUser = {
        id: 'user123',
        email: registerData.email,
        name: registerData.name,
        isVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(bcrypt, 'hash').mockResolvedValue(hashedPassword as never);
      mockPrismaService.user.create.mockResolvedValue(mockUser);
      mockPrismaService.oneTimeToken.create.mockResolvedValue({});
      mockEmailService.sendEmail.mockResolvedValue(undefined);

      const result = await service.register(registerData);

      expect(bcrypt.hash).toHaveBeenCalledWith(registerData.password, 12);
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: {
          email: registerData.email,
          password: hashedPassword,
          name: registerData.name,
        },
      });
      expect(mockPrismaService.oneTimeToken.create).toHaveBeenCalled();
      expect(mockEmailService.sendEmail).toHaveBeenCalled();
      expect(result).toEqual({
        message: 'User registered successfully',
        userId: mockUser.id,
        email: mockUser.email,
      });
    });

    it('should throw error if user already exists', async () => {
      mockPrismaService.user.create.mockRejectedValue({
        code: 'P2002',
        meta: { target: ['email'] },
      });

      await expect(service.register(registerData)).rejects.toThrow(
        'User already exists',
      );
    });

    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database connection failed');
      mockPrismaService.user.create.mockRejectedValue(dbError);

      await expect(service.register(registerData)).rejects.toThrow(
        'Database connection failed',
      );
      expect(mockSentryService.captureException).toHaveBeenCalledWith(dbError);
    });
  });

  describe('login', () => {
    const loginData = {
      email: 'test@example.com',
      password: 'password123',
    };

    const mockUser = {
      id: 'user123',
      email: loginData.email,
      password: 'hashedPassword123',
      name: 'Test User',
      isVerified: true,
    };

    it('should login successfully with valid credentials', async () => {
      const accessToken = 'access-token-123';
      const refreshToken = 'refresh-token-123';

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      mockJwtService.sign
        .mockReturnValueOnce(accessToken)
        .mockReturnValueOnce(refreshToken);
      mockPrismaService.refreshSession.create.mockResolvedValue({});

      const result = await service.login(loginData);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: loginData.email },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(
        loginData.password,
        mockUser.password,
      );
      expect(mockJwtService.sign).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        accessToken,
        refreshToken,
        user: {
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          isVerified: mockUser.isVerified,
        },
      });
    });

    it('should throw error for non-existent user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginData)).rejects.toThrow(
        'Invalid credentials',
      );
    });

    it('should throw error for invalid password', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      await expect(service.login(loginData)).rejects.toThrow(
        'Invalid credentials',
      );
    });

    it('should throw error for unverified user', async () => {
      const unverifiedUser = { ...mockUser, isVerified: false };
      mockPrismaService.user.findUnique.mockResolvedValue(unverifiedUser);

      await expect(service.login(loginData)).rejects.toThrow(
        'Email not verified',
      );
    });

    it('should log security event for failed login', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      await expect(service.login(loginData)).rejects.toThrow(
        'Invalid credentials',
      );
      expect(mockLoggerService.logSecurityEvent).toHaveBeenCalledWith(
        'Failed login attempt',
        expect.objectContaining({
          email: loginData.email,
          reason: 'Invalid password',
        }),
      );
    });
  });

  describe('verifyEmail', () => {
    const token = 'verification-token-123';
    const mockToken = {
      id: 'token123',
      hash: token,
      userId: 'user123',
      purpose: 'email_verification',
      expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
      usedAt: null,
    };

    const mockUser = {
      id: 'user123',
      email: 'test@example.com',
      isVerified: false,
    };

    it('should verify email successfully with valid token', async () => {
      mockPrismaService.oneTimeToken.findFirst.mockResolvedValue(mockToken);
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        isVerified: true,
      });
      mockPrismaService.oneTimeToken.update.mockResolvedValue({});

      const result = await service.verifyEmail(token);

      expect(mockPrismaService.oneTimeToken.findFirst).toHaveBeenCalledWith({
        where: {
          hash: token,
          purpose: 'email_verification',
          usedAt: null,
        },
        include: { user: true },
      });
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockToken.userId },
        data: { isVerified: true },
      });
      expect(result).toEqual({ message: 'Email verified successfully' });
    });

    it('should throw error for invalid token', async () => {
      mockPrismaService.oneTimeToken.findFirst.mockResolvedValue(null);

      await expect(service.verifyEmail(token)).rejects.toThrow(
        'Invalid or expired token',
      );
    });

    it('should throw error for expired token', async () => {
      const expiredToken = {
        ...mockToken,
        expiresAt: new Date(Date.now() - 3600000), // 1 hour ago
      };
      mockPrismaService.oneTimeToken.findFirst.mockResolvedValue(expiredToken);

      await expect(service.verifyEmail(token)).rejects.toThrow(
        'Invalid or expired token',
      );
    });

    it('should throw error for already used token', async () => {
      const usedToken = {
        ...mockToken,
        usedAt: new Date(),
      };
      mockPrismaService.oneTimeToken.findFirst.mockResolvedValue(usedToken);

      await expect(service.verifyEmail(token)).rejects.toThrow(
        'Invalid or expired token',
      );
    });
  });

  describe('forgotPassword', () => {
    const email = 'test@example.com';
    const mockUser = {
      id: 'user123',
      email,
      isVerified: true,
    };

    it('should send password reset email for existing user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.oneTimeToken.create.mockResolvedValue({});
      mockEmailService.sendEmail.mockResolvedValue(undefined);

      const result = await service.forgotPassword(email);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email },
      });
      expect(mockPrismaService.oneTimeToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: mockUser.id,
          purpose: 'password_reset',
        }),
      });
      expect(mockEmailService.sendEmail).toHaveBeenCalled();
      expect(result).toEqual({ message: 'Password reset email sent' });
    });

    it('should handle non-existent user gracefully', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.forgotPassword(email);

      expect(result).toEqual({ message: 'Password reset email sent' });
      expect(mockPrismaService.oneTimeToken.create).not.toHaveBeenCalled();
      expect(mockEmailService.sendEmail).not.toHaveBeenCalled();
    });

    it('should handle unverified user', async () => {
      const unverifiedUser = { ...mockUser, isVerified: false };
      mockPrismaService.user.findUnique.mockResolvedValue(unverifiedUser);

      const result = await service.forgotPassword(email);

      expect(result).toEqual({ message: 'Password reset email sent' });
      expect(mockPrismaService.oneTimeToken.create).not.toHaveBeenCalled();
      expect(mockEmailService.sendEmail).not.toHaveBeenCalled();
    });
  });

  describe('refreshToken', () => {
    const refreshToken = 'refresh-token-123';
    const mockSession = {
      id: 'session123',
      userId: 'user123',
      refreshTokenHash: 'hashed-refresh-token',
      expiresAt: new Date(Date.now() + 86400000), // 1 day from now
    };

    const mockUser = {
      id: 'user123',
      email: 'test@example.com',
      name: 'Test User',
      isVerified: true,
    };

    it('should refresh token successfully', async () => {
      const newAccessToken = 'new-access-token-123';
      const newRefreshToken = 'new-refresh-token-123';

      mockPrismaService.refreshSession.findFirst.mockResolvedValue(mockSession);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      mockJwtService.sign
        .mockReturnValueOnce(newAccessToken)
        .mockReturnValueOnce(newRefreshToken);
      mockPrismaService.refreshSession.update.mockResolvedValue({});

      const result = await service.refreshToken(refreshToken);

      expect(mockPrismaService.refreshSession.findFirst).toHaveBeenCalledWith({
        where: { refreshTokenHash: expect.any(String) },
        include: { user: true },
      });
      expect(result).toEqual({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      });
    });

    it('should throw error for invalid refresh token', async () => {
      mockPrismaService.refreshSession.findFirst.mockResolvedValue(null);

      await expect(service.refreshToken(refreshToken)).rejects.toThrow(
        'Invalid refresh token',
      );
    });

    it('should throw error for expired refresh token', async () => {
      const expiredSession = {
        ...mockSession,
        expiresAt: new Date(Date.now() - 86400000), // 1 day ago
      };
      mockPrismaService.refreshSession.findFirst.mockResolvedValue(
        expiredSession,
      );

      await expect(service.refreshToken(refreshToken)).rejects.toThrow(
        'Invalid refresh token',
      );
    });
  });

  describe('logout', () => {
    const userId = 'user123';

    it('should logout successfully', async () => {
      mockPrismaService.refreshSession.deleteMany.mockResolvedValue({
        count: 1,
      });

      const result = await service.logout(userId);

      expect(mockPrismaService.refreshSession.deleteMany).toHaveBeenCalledWith({
        where: { userId },
      });
      expect(result).toEqual({ message: 'Logged out successfully' });
    });

    it('should handle logout when no sessions exist', async () => {
      mockPrismaService.refreshSession.deleteMany.mockResolvedValue({
        count: 0,
      });

      const result = await service.logout(userId);

      expect(result).toEqual({ message: 'Logged out successfully' });
    });
  });
});
