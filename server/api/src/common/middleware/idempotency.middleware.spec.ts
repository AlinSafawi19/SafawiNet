import { Test, TestingModule } from '@nestjs/testing';
import { Request, Response, NextFunction } from 'express';
import { IdempotencyMiddleware } from './idempotency.middleware';
import { RedisService } from '../services/redis.service';

describe('IdempotencyMiddleware', () => {
  let middleware: IdempotencyMiddleware;
  let redisService: RedisService;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IdempotencyMiddleware,
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    middleware = module.get<IdempotencyMiddleware>(IdempotencyMiddleware);
    redisService = module.get<RedisService>(RedisService);

    mockRequest = {
      method: 'POST',
      headers: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      statusCode: 200,
    };

    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('use', () => {
    it('should call next() for non-POST requests', async () => {
      mockRequest.method = 'GET';

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRedisService.get).not.toHaveBeenCalled();
    });

    it('should call next() when no idempotency key is provided', async () => {
      mockRequest.headers = {};

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRedisService.get).not.toHaveBeenCalled();
    });

    it('should return cached response when idempotency key exists', async () => {
      const idempotencyKey = 'test-key-123';
      const cachedResponse = {
        status: 200,
        body: { message: 'Cached response' },
      };

      mockRequest.headers = { 'idempotency-key': idempotencyKey };
      mockRedisService.get.mockResolvedValue(JSON.stringify(cachedResponse));

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRedisService.get).toHaveBeenCalledWith(`idempotency:${idempotencyKey}`);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Cached response' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should store initial response and call next() for new idempotency key', async () => {
      const idempotencyKey = 'new-key-123';

      mockRequest.headers = { 'idempotency-key': idempotencyKey };
      mockRedisService.get.mockResolvedValue(null);

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRedisService.get).toHaveBeenCalledWith(`idempotency:${idempotencyKey}`);
      expect(mockRedisService.set).toHaveBeenCalledWith(
        `idempotency:${idempotencyKey}`,
        JSON.stringify({ status: 200, body: { message: 'Processing' } }),
        300,
      );
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle Redis errors gracefully and call next()', async () => {
      const idempotencyKey = 'error-key-123';

      mockRequest.headers = { 'idempotency-key': idempotencyKey };
      mockRedisService.get.mockRejectedValue(new Error('Redis error'));

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should override res.json to capture and store response', async () => {
      const idempotencyKey = 'capture-key-123';
      const responseBody = { message: 'Success response' };

      mockRequest.headers = { 'idempotency-key': idempotencyKey };
      mockRedisService.get.mockResolvedValue(null);

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // The middleware should have overridden res.json
      expect(mockNext).toHaveBeenCalled();

      // Simulate the response being sent
      const overriddenJson = mockResponse.json;
      if (overriddenJson) {
        overriddenJson.call(mockResponse, responseBody);
      }

      // Verify that the response was stored in Redis
      expect(mockRedisService.set).toHaveBeenCalledWith(
        `idempotency:${idempotencyKey}`,
        JSON.stringify({ status: 200, body: responseBody }),
        300,
      );
    });

    it('should handle malformed cached response gracefully', async () => {
      const idempotencyKey = 'malformed-key-123';
      const malformedResponse = 'invalid-json';

      mockRequest.headers = { 'idempotency-key': idempotencyKey };
      mockRedisService.get.mockResolvedValue(malformedResponse);

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Should continue processing if cached response is malformed
      expect(mockNext).toHaveBeenCalled();
    });

    it('should use 5-minute TTL for idempotency keys', async () => {
      const idempotencyKey = 'ttl-key-123';

      mockRequest.headers = { 'idempotency-key': idempotencyKey };
      mockRedisService.get.mockResolvedValue(null);

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRedisService.set).toHaveBeenCalledWith(
        `idempotency:${idempotencyKey}`,
        expect.any(String),
        300, // 5 minutes = 300 seconds
      );
    });

    it('should handle case-insensitive idempotency key header', async () => {
      const idempotencyKey = 'case-key-123';

      mockRequest.headers = { 'Idempotency-Key': idempotencyKey };
      mockRedisService.get.mockResolvedValue(null);

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRedisService.get).toHaveBeenCalledWith(`idempotency:${idempotencyKey}`);
    });
  });
});
