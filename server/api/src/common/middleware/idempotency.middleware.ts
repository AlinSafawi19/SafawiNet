import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RedisService } from '../services/redis.service';

@Injectable()
export class IdempotencyMiddleware implements NestMiddleware {
  private readonly logger = new Logger(IdempotencyMiddleware.name);

  constructor(private readonly redisService: RedisService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Only apply to POST requests
    if (req.method !== 'POST') {
      return next();
    }

    const idempotencyKey = req.headers['idempotency-key'] || req.headers['Idempotency-Key'] as string;
    
    if (!idempotencyKey) {
      return next();
    }

    try {
      // Check if we've seen this key before
      const existingResponse = await this.redisService.get(`idempotency:${idempotencyKey}`);
      
      if (existingResponse) {
        this.logger.log(`Idempotency key ${idempotencyKey} already processed`);
        
        // Return the cached response
        const parsed = JSON.parse(existingResponse);
        res.status(parsed.status).json(parsed.body);
        return;
      }

      // Store the request for idempotency (5 minute TTL)
      await this.redisService.set(
        `idempotency:${idempotencyKey}`,
        JSON.stringify({ status: 200, body: { message: 'Processing' } }),
        300 // 5 minutes
      );

      // Override res.json to capture the response
      const originalJson = res.json.bind(res);
      const redisService = this.redisService;
      res.json = function(body: any) {
        // Store the actual response
        redisService.set(
          `idempotency:${idempotencyKey}`,
          JSON.stringify({ status: res.statusCode, body }),
          300 // 5 minutes
        );
        
        return originalJson(body);
      };

      next();
    } catch (error) {
      this.logger.error(`Error in idempotency middleware:`, error);
      // Continue without idempotency if Redis fails
      next();
    }
  }
}
