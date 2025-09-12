import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import {
  PerformanceService,
  PerformanceMetrics,
} from '../services/performance.service';

// Interface for authenticated request with user properties
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    sub: string;
    email: string;
    name: string;
    verified: boolean;
    roles: string[];
    refreshTokenId: string;
  };
}

@Injectable()
export class PerformanceMiddleware implements NestMiddleware {
  constructor(private performanceService: PerformanceService) {}

  use(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const userId = req.user?.id;

    // Override res.end to capture response time
    const originalEnd = res.end.bind(res) as (...args: unknown[]) => Response;
    const performanceService = this.performanceService;
    res.end = function (
      chunk?: unknown,
      encoding?: BufferEncoding | (() => void),
      cb?: () => void,
    ): Response {
      const duration = Date.now() - startTime;

      // Record performance metrics
      const metrics: PerformanceMetrics = {
        route: (req.route as { path?: string })?.path || req.path,
        method: req.method,
        duration,
        statusCode: res.statusCode,
        userId,
        timestamp: startTime,
      };

      // Record metrics asynchronously to avoid blocking response
      setImmediate(() => {
        performanceService.recordMetrics(metrics);
      });

      // Call original end method
      return originalEnd(chunk, encoding, cb);
    };

    next();
  }
}
