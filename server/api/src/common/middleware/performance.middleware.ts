import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PerformanceService, PerformanceMetrics } from '../services/performance.service';

@Injectable()
export class PerformanceMiddleware implements NestMiddleware {
  constructor(private performanceService: PerformanceService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const requestId = (req as any).requestId;
    const userId = (req as any).user?.id;

    // Override res.end to capture response time
    const originalEnd = res.end;
    const performanceService = this.performanceService;
    res.end = function(chunk?: any, encoding?: any) {
      const duration = Date.now() - startTime;
      
      // Record performance metrics
      const metrics: PerformanceMetrics = {
        route: req.route?.path || req.path,
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
      return originalEnd.call(res, chunk, encoding);
    };

    next();
  }
}
