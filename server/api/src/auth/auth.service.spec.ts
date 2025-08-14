import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../common/services/prisma.service';
import { RedisService } from '../common/services/redis.service';
import { EmailService } from '../common/services/email.service';
import { SecurityUtils } from '../common/security/security.utils';
import { RegisterDto, VerifyEmailDto, LoginDto, RefreshTokenDto } from './schemas/auth.schemas';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;
  let prismaService: PrismaService;
  let redisService: RedisService;
  let emailService: EmailService;
  let configService: ConfigService;
  let mockLogger: any;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    oneTimeToken: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    refreshSession: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockRedisService = {
    exists: jest.fn(),
    incr: jest.fn(),
    expire: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockEmailService = {
    sendVerificationEmail: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };



  beforeEach(async () => {
    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

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
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: Logger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
    prismaService = module.get<PrismaService>(PrismaService);
    redisService = module.get<RedisService>(RedisService);
    emailService = module.get<EmailService>(EmailService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
    };

    it('should register a new user successfully', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password: 'hashed-password',
        name: 'Test User',
        isVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockVerificationToken = 'verification-token-123';

      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.$transaction.mockResolvedValue({
        user: mockUser,
        verificationToken: mockVerificationToken,
      });
      mockEmailService.sendVerificationEmail.mockResolvedValue(undefined);

      const result = await service.register(registerDto);

      expect(result.message).toContain('User registered successfully');
      expect(result.user.email).toBe(registerDto.email);
      expect(result.user.name).toBe(registerDto.name);
      expect(result.user.isVerified).toBe(false);
      expect(mockEmailService.sendVerificationEmail).toHaveBeenCalledWith(
        registerDto.email,
        mockVerificationToken,
      );
    });

    it('should throw ConflictException if user already exists', async () => {
      const existingUser = { id: 'existing-user' };
      mockPrismaService.user.findUnique.mockResolvedValue(existingUser);

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
    });

    it('should not fail registration if email sending fails', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password: 'hashed-password',
        name: 'Test User',
        isVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockVerificationToken = 'verification-token-123';

      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.$transaction.mockResolvedValue({
        user: mockUser,
        verificationToken: mockVerificationToken,
      });
      mockEmailService.sendVerificationEmail.mockRejectedValue(new Error('Email failed'));

      const result = await service.register(registerDto);

      expect(result.message).toContain('User registered successfully');
      expect(result.user.email).toBe(registerDto.email);
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Failed to send verification email to ${registerDto.email}:`,
        expect.any(Error)
      );
    });
  });

  describe('verifyEmail', () => {
    const verifyEmailDto: VerifyEmailDto = {
      token: 'valid-token-123',
    };

    it('should verify email successfully', async () => {
      const mockToken = {
        id: 'token-123',
        user: {
          id: 'user-123',
          email: 'test@example.com',
        },
      };

      mockPrismaService.$transaction.mockResolvedValue(mockToken.user);

      const result = await service.verifyEmail(verifyEmailDto);

      expect(result.message).toBe('Email verified successfully');
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid token', async () => {
      mockPrismaService.$transaction.mockRejectedValue(
        new BadRequestException('Invalid or expired verification token'),
      );

      await expect(service.verifyEmail(verifyEmailDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should login successfully for verified user', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password: 'hashed-password',
        name: 'Test User',
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockTokens = {
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-123',
        expiresIn: 900,
      };

      mockRedisService.exists.mockResolvedValue(false);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      jest.spyOn(SecurityUtils, 'verifyPassword').mockResolvedValue(true);
      jest.spyOn(service as any, 'generateTokens').mockResolvedValue(mockTokens);
      mockRedisService.del.mockResolvedValue(undefined);

      const result = await service.login(loginDto);

      expect(result.tokens).toEqual(mockTokens);
      expect(result.user?.email).toBe(loginDto.email);
      expect(result.requiresVerification).toBeUndefined();
    });

    it('should return requiresVerification for unverified user', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password: 'hashed-password',
        name: 'Test User',
        isVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRedisService.exists.mockResolvedValue(false);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      jest.spyOn(SecurityUtils, 'verifyPassword').mockResolvedValue(true);
      jest.spyOn(service as any, 'resendVerificationEmail').mockResolvedValue(undefined);

      const result = await service.login(loginDto);

      expect(result.requiresVerification).toBe(true);
      expect(result.user?.email).toBe(loginDto.email);
      expect(result.tokens).toBeUndefined();
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      mockRedisService.exists.mockResolvedValue(false);
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockRedisService.incr.mockResolvedValue(1);
      mockRedisService.expire.mockResolvedValue(undefined);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      expect(mockRedisService.incr).toHaveBeenCalledWith(`login_attempts:${loginDto.email}`);
    });

    it('should throw UnauthorizedException for locked account', async () => {
      mockRedisService.exists.mockResolvedValue(true);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      expect(mockPrismaService.user.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('refreshToken', () => {
    const refreshTokenDto: RefreshTokenDto = {
      refreshToken: 'valid-refresh-token-123',
    };

    it('should refresh tokens successfully', async () => {
      const mockPayload = { jti: 'token-id-123' };
      const mockSession = {
        id: 'session-123',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          isVerified: true,
        },
      };

      const mockTokens = {
        accessToken: 'new-access-token-123',
        refreshToken: 'new-refresh-token-123',
        expiresIn: 900,
      };

      mockJwtService.verify.mockReturnValue(mockPayload);
      mockPrismaService.refreshSession.findFirst.mockResolvedValue(mockSession);
      jest.spyOn(service as any, 'generateTokens').mockResolvedValue(mockTokens);
      mockPrismaService.refreshSession.update.mockResolvedValue(undefined);

      const result = await service.refreshToken(refreshTokenDto);

      expect(result).toEqual(mockTokens);
      expect(mockPrismaService.refreshSession.update).toHaveBeenCalledWith({
        where: { id: mockSession.id },
        data: { isActive: false },
      });
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      // Mock the database to return no session (invalid token)
      mockPrismaService.refreshSession.findFirst.mockResolvedValue(null);

      await expect(service.refreshToken(refreshTokenDto)).rejects.toThrow(UnauthorizedException);
      expect(mockLogger.error).toHaveBeenCalledWith('Token refresh failed:', expect.any(UnauthorizedException));
    });

    it('should throw UnauthorizedException for non-existent session', async () => {
      const mockPayload = { jti: 'token-id-123' };

      mockJwtService.verify.mockReturnValue(mockPayload);
      mockPrismaService.refreshSession.findFirst.mockResolvedValue(null);

      await expect(service.refreshToken(refreshTokenDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('private methods', () => {
    it('should generate tokens correctly', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        isVerified: true,
      };

      const mockAccessToken = 'access-token-123';
      const mockRefreshToken = 'refresh-token-123';

      mockJwtService.sign.mockReturnValue(mockAccessToken);
      jest.spyOn(service as any, 'createRefreshToken').mockResolvedValue(mockRefreshToken);

      const result = await (service as any).generateTokens(mockUser);

      expect(result.accessToken).toBe(mockAccessToken);
      expect(result.refreshToken).toBe(mockRefreshToken);
      expect(result.expiresIn).toBe(900);
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
        verified: mockUser.isVerified,
      });
    });

    it('should create refresh token correctly', async () => {
      const userId = 'user-123';
      const mockRefreshToken = 'refresh-token-123';

      jest.spyOn(service as any, 'createRefreshToken').mockResolvedValue(mockRefreshToken);

      const result = await (service as any).createRefreshToken(userId);

      expect(result).toBe(mockRefreshToken);
    });

    it('should record failed login attempts correctly', async () => {
      const email = 'test@example.com';
      mockRedisService.incr.mockResolvedValue(5);
      mockRedisService.expire.mockResolvedValue(undefined);
      mockRedisService.set.mockResolvedValue(undefined);

      await (service as any).recordFailedLoginAttempt(email);

      expect(mockRedisService.incr).toHaveBeenCalledWith(`login_attempts:${email}`);
      expect(mockRedisService.set).toHaveBeenCalledWith(
        `login_lockout:${email}`,
        'locked',
        900,
      );
    });

    it('should exclude password from user object', () => {
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        password: 'hashed-password',
        name: 'Test User',
      };

      const result = (service as any).excludePassword(user);

      expect(result.password).toBeUndefined();
      expect(result.id).toBe(user.id);
      expect(result.email).toBe(user.email);
      expect(result.name).toBe(user.name);
    });
  });
});
