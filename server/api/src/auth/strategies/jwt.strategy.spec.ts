import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import { PrismaService } from '../../common/services/prisma.service';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let configService: ConfigService;
  let prismaService: PrismaService;

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    // Mock JWT secret
    mockConfigService.get.mockReturnValue('test-jwt-secret');
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    configService = module.get<ConfigService>(ConfigService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(strategy).toBeDefined();
    });

    it('should configure JWT strategy with correct options', () => {
      const jwtSecret = 'test-secret';
      mockConfigService.get.mockReturnValue(jwtSecret);

      // Recreate strategy to test constructor
      const newStrategy = new JwtStrategy(configService, prismaService);
      
      expect(newStrategy).toBeDefined();
    });
  });

  describe('validate', () => {
    const mockPayload = {
      sub: 'user-123',
      email: 'test@example.com',
      verified: true,
      iat: Date.now(),
      exp: Date.now() + 3600000,
    };

    it('should return user data for valid payload', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        isVerified: true,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await strategy.validate(mockPayload);

      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        verified: mockUser.isVerified,
      });
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockPayload.sub },
      });
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(strategy.validate(mockPayload)).rejects.toThrow(UnauthorizedException);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockPayload.sub },
      });
    });

    it('should throw UnauthorizedException if user email not verified', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        isVerified: false,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(strategy.validate(mockPayload)).rejects.toThrow(UnauthorizedException);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockPayload.sub },
      });
    });
  });
});
