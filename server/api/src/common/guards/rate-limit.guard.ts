import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ThrottlerException } from '@nestjs/throttler';
import { RedisService } from '../services/redis.service';

export interface RateLimitOptions {
  limit: number;
  windowSeconds: number;
  keyPrefix?: string;
}

export const RateLimit = (options: RateLimitOptions) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata('rateLimit', options, descriptor.value);
    return descriptor;
  };
};

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly redisService: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const rateLimitOptions = this.reflector.get<RateLimitOptions>('rateLimit', context.getHandler());
    
    // Use default options if no metadata is provided
    const options: RateLimitOptions = rateLimitOptions || {
      limit: 10,
      windowSeconds: 60,
      keyPrefix: 'rate_limit',
    };

    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const clientIp = request.ip || request.connection.remoteAddress;
    const route = request.route?.path || 'unknown';
    
    // Create unique key for this client + route combination
    const key = `${options.keyPrefix}:${clientIp}:${route}`;

    try {
      const isLimited = await this.redisService.isRateLimited(
        key,
        options.limit,
        options.windowSeconds
      );

      if (isLimited) {
        this.logger.warn(`Rate limit exceeded for ${clientIp} on ${route}`);
        
        // Add rate limit headers
        response.setHeader('X-RateLimit-Limit', options.limit);
        response.setHeader('X-RateLimit-Remaining', 0);
        response.setHeader('X-RateLimit-Reset', Math.floor(Date.now() / 1000) + options.windowSeconds);
        
        throw new ThrottlerException('Rate limit exceeded');
      }

      // Add rate limit headers for successful requests
      const currentCount = await this.redisService.get(key);
      const remaining = Math.max(0, options.limit - (parseInt(currentCount || '0') || 0));
      
      response.setHeader('X-RateLimit-Limit', options.limit);
      response.setHeader('X-RateLimit-Remaining', remaining);
      response.setHeader('X-RateLimit-Reset', Math.floor(Date.now() / 1000) + options.windowSeconds);

      return true;
    } catch (error) {
      if (error instanceof ThrottlerException) {
        throw error;
      }
      
      this.logger.error('Error in rate limit guard:', error);
      // Allow request if rate limiting fails
      return true;
    }
  }
}
