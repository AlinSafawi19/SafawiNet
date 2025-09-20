import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RedisService } from '../services/redis.service';

interface CachedResponse {
  status: number;
  body: Record<string, unknown> | string | number | boolean | null;
}

interface ProcessingResponse {
  status: number;
  body: { message: string };
}

interface IdempotencyRequest extends Request {
  headers: Request['headers'] & {
    'idempotency-key'?: string;
    'Idempotency-Key'?: string;
  };
}

@Injectable()
export class IdempotencyMiddleware implements NestMiddleware {
  private readonly logger = new Logger(IdempotencyMiddleware.name);

  constructor(private readonly redisService: RedisService) {}

  async use(
    req: IdempotencyRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    // Only apply to POST requests
    if (req.method !== 'POST') {
      return next();
    }

    const idempotencyKey: string | undefined =
      req.headers['idempotency-key'] || req.headers['Idempotency-Key'];

    if (!idempotencyKey) {
      return next();
    }

    try {
      // Check if we've seen this key before
      const existingResponse: string | null = await this.redisService.get(
        `idempotency:${idempotencyKey}`,
      );

      if (existingResponse) {
        // Return the cached response
        const parsed: CachedResponse = JSON.parse(
          existingResponse,
        ) as CachedResponse;
        res.status(parsed.status).json(parsed.body);
        return;
      }

      // Store the request for idempotency (5 minute TTL)
      const processingResponse: ProcessingResponse = {
        status: 200,
        body: { message: 'Processing' },
      };

      await this.redisService.set(
        `idempotency:${idempotencyKey}`,
        JSON.stringify(processingResponse),
        300, // 5 minutes
      );

      // Override res.json to capture the response
      const originalJson = res.json.bind(res) as (body: unknown) => Response;
      const redisService = this.redisService;
      const key = `idempotency:${idempotencyKey}`;

      res.json = function (
        body: Record<string, unknown> | string | number | boolean | null,
      ): Response {
        // Store the actual response
        const responseToCache: CachedResponse = {
          status: res.statusCode,
          body,
        };

        void redisService.set(
          key,
          JSON.stringify(responseToCache),
          300, // 5 minutes
        );

        return originalJson(body);
      };

      next();
    } catch (error) {
      this.logger.warn('Failed to use idempotency middleware', error, {
        source: 'idempotency',
        req: req.method,
        path: req.path,
      });
      // Continue without idempotency if Redis fails
      next();
    }
  }
}
