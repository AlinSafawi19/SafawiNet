import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, Logger } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { RateLimitGuard, RateLimit } from './rate-limit.guard';
import { RedisService } from '../services/redis.service';

describe('RateLimitGuard', () => {
  let guard: RateLimitGuard;
  let redisService: RedisService;
  let mockExecutionContext: ExecutionContext;

  const mockRedisService = {
    isRateLimited: jest.fn(),
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimitGuard,
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    guard = module.get<RateLimitGuard>(RateLimitGuard);
    redisService = module.get<RedisService>(RedisService);

    // Mock execution context
    mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          ip: '127.0.0.1',
          connection: { remoteAddress: '127.0.0.1' },
          route: { path: '/test' },
        }),
        getResponse: () => ({
          setHeader: jest.fn(),
        }),
      }),
      getHandler: () => ({}),
      getClass: () => ({} as any),
      getArgs: () => [],
      getArgByIndex: () => undefined,
      switchToRpc: () => ({} as any),
      switchToWs: () => ({} as any),
      getType: () => 'http',
    } as unknown as ExecutionContext;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should allow request when rate limit is not exceeded', async () => {
      mockRedisService.isRateLimited.mockResolvedValue(false);
      mockRedisService.get.mockResolvedValue('5');

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(mockRedisService.isRateLimited).toHaveBeenCalledWith(
        'rate_limit:127.0.0.1:/test',
        10,
        60,
      );
    });

    it('should block request when rate limit is exceeded', async () => {
      mockRedisService.isRateLimited.mockResolvedValue(true);

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        ThrottlerException,
      );

      expect(mockRedisService.isRateLimited).toHaveBeenCalledWith(
        'rate_limit:127.0.0.1:/test',
        10,
        60,
      );
    });

    it('should use custom rate limit options from metadata', async () => {
      // Mock metadata
      const handler = () => {};
      Reflect.defineMetadata('rateLimit', {
        limit: 5,
        windowSeconds: 300,
        keyPrefix: 'custom',
      }, handler);

      mockExecutionContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            ip: '127.0.0.1',
            connection: { remoteAddress: '127.0.0.1' },
            route: { path: '/test' },
          }),
          getResponse: () => ({
            setHeader: jest.fn(),
          }),
        }),
        getHandler: () => handler,
        getClass: () => ({} as any),
        getArgs: () => [],
        getArgByIndex: () => undefined,
        switchToRpc: () => ({} as any),
        switchToWs: () => ({} as any),
        getType: () => 'http',
      } as unknown as ExecutionContext;

      mockRedisService.isRateLimited.mockResolvedValue(false);
      mockRedisService.get.mockResolvedValue('3');

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(mockRedisService.isRateLimited).toHaveBeenCalledWith(
        'custom:127.0.0.1:/test',
        5,
        300,
      );
    });

    it('should handle missing IP address gracefully', async () => {
      mockExecutionContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            connection: { remoteAddress: '127.0.0.1' },
            route: { path: '/test' },
          }),
          getResponse: () => ({
            setHeader: jest.fn(),
          }),
        }),
        getHandler: () => ({}),
        getClass: () => ({} as any),
        getArgs: () => [],
        getArgByIndex: () => undefined,
        switchToRpc: () => ({} as any),
        switchToWs: () => ({} as any),
        getType: () => 'http',
      } as unknown as ExecutionContext;

      mockRedisService.isRateLimited.mockResolvedValue(false);
      mockRedisService.get.mockResolvedValue('5');

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(mockRedisService.isRateLimited).toHaveBeenCalledWith(
        'rate_limit:127.0.0.1:/test',
        10,
        60,
      );
    });

    it('should handle missing route path gracefully', async () => {
      mockExecutionContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            ip: '127.0.0.1',
            connection: { remoteAddress: '127.0.0.1' },
          }),
          getResponse: () => ({
            setHeader: jest.fn(),
          }),
        }),
        getHandler: () => ({}),
        getClass: () => ({} as any),
        getArgs: () => [],
        getArgByIndex: () => undefined,
        switchToRpc: () => ({} as any),
        switchToWs: () => ({} as any),
        getType: () => 'http',
      } as unknown as ExecutionContext;

      mockRedisService.isRateLimited.mockResolvedValue(false);
      mockRedisService.get.mockResolvedValue('5');

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(mockRedisService.isRateLimited).toHaveBeenCalledWith(
        'rate_limit:127.0.0.1:unknown',
        10,
        60,
      );
    });

    it('should allow request if Redis service fails', async () => {
      mockRedisService.isRateLimited.mockRejectedValue(new Error('Redis error'));

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('should set rate limit headers on successful request', async () => {
      const mockResponse = {
        setHeader: jest.fn(),
      };

      mockExecutionContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            ip: '127.0.0.1',
            connection: { remoteAddress: '127.0.0.1' },
            route: { path: '/test' },
          }),
          getResponse: () => mockResponse,
        }),
        getHandler: () => ({}),
        getClass: () => ({} as any),
        getArgs: () => [],
        getArgByIndex: () => undefined,
        switchToRpc: () => ({} as any),
        switchToWs: () => ({} as any),
        getType: () => 'http',
      } as unknown as ExecutionContext;

      mockRedisService.isRateLimited.mockResolvedValue(false);
      mockRedisService.get.mockResolvedValue('5');

      await guard.canActivate(mockExecutionContext);

      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 10);
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 5);
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(Number));
    });

    it('should set rate limit headers on blocked request', async () => {
      const mockResponse = {
        setHeader: jest.fn(),
      };

      mockExecutionContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            ip: '127.0.0.1',
            connection: { remoteAddress: '127.0.0.1' },
            route: { path: '/test' },
          }),
          getResponse: () => mockResponse,
        }),
        getHandler: () => ({}),
        getClass: () => ({} as any),
        getArgs: () => [],
        getArgByIndex: () => undefined,
        switchToRpc: () => ({} as any),
        switchToWs: () => ({} as any),
        getType: () => 'http',
      } as unknown as ExecutionContext;

      mockRedisService.isRateLimited.mockResolvedValue(true);

      try {
        await guard.canActivate(mockExecutionContext);
      } catch (error) {
        // Expected to throw
      }

      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 10);
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 0);
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(Number));
    });
  });
});

describe('RateLimit decorator', () => {
  it('should set metadata on method', () => {
    const options = { limit: 5, windowSeconds: 300, keyPrefix: 'test' };
    const target = {};
    const propertyKey = 'testMethod';
    const descriptor = { value: () => {} };

    const decorator = RateLimit(options);
    decorator(target, propertyKey, descriptor);

    const metadata = Reflect.getMetadata('rateLimit', descriptor.value);
    expect(metadata).toEqual(options);
  });
});
