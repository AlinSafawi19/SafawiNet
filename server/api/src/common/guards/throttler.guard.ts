import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Use IP address as tracker for rate limiting
    return req.ips.length ? req.ips[0] : req.ip;
  }

  protected getThrottleOptions(context: ExecutionContext) {
    const handler = context.getHandler();
    const route = Reflect.getMetadata('route', handler) || 'unknown';
    
    // Apply stricter rate limiting for auth routes
    if (route && route.includes('/auth/')) {
      return {
        ttl: 60000, // 1 minute
        limit: 5,    // 5 requests per minute
      };
    }
    
    // Default rate limiting for other routes
    return {
      ttl: 60000,   // 1 minute
      limit: 100,   // 100 requests per minute
    };
  }
}
