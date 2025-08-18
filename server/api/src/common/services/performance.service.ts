import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PinoLoggerService } from './logger.service';
import { RedisService } from './redis.service';
import { TelemetryService } from './telemetry.service';

export interface PerformanceMetrics {
  route: string;
  method: string;
  duration: number;
  statusCode: number;
  userId?: string;
  timestamp: number;
}

export interface PerformanceBudget {
  route: string;
  p99Threshold: number;
  maxQueries: number;
  burstLimit: number;
}

@Injectable()
export class PerformanceService implements OnModuleInit {
  private readonly performanceBudgets: Map<string, PerformanceBudget> = new Map();
  private readonly meter: any;
  private readonly histogram: any;
  private readonly counter: any;

  constructor(
    private configService: ConfigService,
    private logger: PinoLoggerService,
    private redis: RedisService,
    private telemetry: TelemetryService,
  ) {
    // Initialize performance budgets
    this.initializePerformanceBudgets();
    
    // Initialize OpenTelemetry metrics
    this.meter = this.telemetry.getMeter('performance');
    this.histogram = this.meter.createHistogram('http_request_duration', {
      description: 'HTTP request duration in milliseconds',
      unit: 'ms',
    });
    this.counter = this.meter.createCounter('http_requests_total', {
      description: 'Total HTTP requests',
    });
  }

  async onModuleInit() {
    this.logger.log('Performance service initialized', 'PerformanceService');
  }

  private initializePerformanceBudgets() {
    // Auth route performance budget: P99 < 120ms, < 15 queries, burst 300 RPS
    this.performanceBudgets.set('/auth/login', {
      route: '/auth/login',
      p99Threshold: 120,
      maxQueries: 15,
      burstLimit: 300,
    });

    this.performanceBudgets.set('/auth/register', {
      route: '/auth/register',
      p99Threshold: 150,
      maxQueries: 20,
      burstLimit: 100,
    });

    this.performanceBudgets.set('/auth/refresh', {
      route: '/auth/refresh',
      p99Threshold: 80,
      maxQueries: 8,
      burstLimit: 200,
    });

    // User routes
    this.performanceBudgets.set('/users/profile', {
      route: '/users/profile',
      p99Threshold: 100,
      maxQueries: 10,
      burstLimit: 150,
    });

    // Loyalty routes
    this.performanceBudgets.set('/loyalty/points', {
      route: '/loyalty/points',
      p99Threshold: 100,
      maxQueries: 12,
      burstLimit: 100,
    });
  }

  // Record performance metrics
  recordMetrics(metrics: PerformanceMetrics) {
    try {
      // Record to OpenTelemetry
      this.histogram.record(metrics.duration, {
        route: metrics.route,
        method: metrics.method,
        status_code: metrics.statusCode.toString(),
        user_id: metrics.userId || 'anonymous',
      });

      this.counter.add(1, {
        route: metrics.route,
        method: metrics.method,
        status_code: metrics.statusCode.toString(),
        user_id: metrics.userId || 'anonymous',
      });

      // Store in Redis for performance analysis
      this.storeMetricsInRedis(metrics);

      // Check performance budget violations
      this.checkPerformanceBudget(metrics);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.stack : String(error);
      this.logger.error('Failed to record performance metrics', errorMessage, 'PerformanceService');
    }
  }

  private async storeMetricsInRedis(metrics: PerformanceMetrics) {
    try {
      // Check if Redis is connected before attempting to store metrics
      if (!this.redis.isRedisConnected()) {
        this.logger.warn('Redis not connected, skipping metrics storage', 'PerformanceService');
        return;
      }

      const key = `perf:${metrics.route}:${metrics.method}`;
      const data = JSON.stringify(metrics);
      
      // Store in sorted set by timestamp for time-based analysis
      await this.redis.getClient().zadd(
        `perf:${metrics.route}:${metrics.method}:timeline`,
        metrics.timestamp,
        data
      );

      // Keep only last 1000 metrics per route
      await this.redis.getClient().zremrangebyrank(
        `perf:${metrics.route}:${metrics.method}:timeline`,
        0,
        -1001
      );

      // Store current metrics for real-time monitoring
      await this.redis.getClient().hset(
        `perf:${metrics.route}:${metrics.method}:current`,
        metrics.timestamp.toString(),
        data
      );

    } catch (error) {
      const errorMessage = error instanceof Error ? error.stack : String(error);
      this.logger.error('Failed to store metrics in Redis', errorMessage, 'PerformanceService');
      // Don't throw error to avoid breaking the application flow
    }
  }

  private async checkPerformanceBudget(metrics: PerformanceMetrics) {
    const budget = this.performanceBudgets.get(metrics.route);
    if (!budget) return;

    // Check P99 threshold
    if (metrics.duration > budget.p99Threshold) {
      this.logger.warn(
        `Performance budget exceeded for ${metrics.route}: ${metrics.duration}ms > ${budget.p99Threshold}ms`,
        'PerformanceService'
      );
    }

    // Check burst rate (simplified - in practice you'd use a sliding window)
    const burstKey = `burst:${metrics.route}:${metrics.method}`;
    const currentBurst = await this.redis.getClient().incr(burstKey);
    
    if (currentBurst === 1) {
      // Set expiry for burst counting window (1 second)
      await this.redis.getClient().expire(burstKey, 1);
    }

    if (currentBurst > budget.burstLimit) {
      this.logger.warn(
        `Burst rate exceeded for ${metrics.route}: ${currentBurst} > ${budget.burstLimit}`,
        'PerformanceService'
      );
    }
  }

  // Get performance statistics for a route
  async getRoutePerformance(route: string, method: string, timeWindow: number = 3600000) {
    try {
      const key = `perf:${route}:${method}:timeline`;
      const now = Date.now();
      const cutoff = now - timeWindow;

      // Get metrics within time window
      const metrics = await this.redis.getClient().zrangebyscore(key, cutoff, '+inf');
      
      if (metrics.length === 0) {
        return {
          route,
          method,
          count: 0,
          avgDuration: 0,
          p50Duration: 0,
          p95Duration: 0,
          p99Duration: 0,
          errorRate: 0,
        };
      }

      const parsedMetrics = metrics.map(m => JSON.parse(m) as PerformanceMetrics);
      const durations = parsedMetrics.map(m => m.duration).sort((a, b) => a - b);
      const errorCount = parsedMetrics.filter(m => m.statusCode >= 400).length;

      return {
        route,
        method,
        count: parsedMetrics.length,
        avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
        p50Duration: this.percentile(durations, 50),
        p95Duration: this.percentile(durations, 95),
        p99Duration: this.percentile(durations, 99),
        errorRate: (errorCount / parsedMetrics.length) * 100,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.stack : String(error);
      this.logger.error('Failed to get route performance', errorMessage, 'PerformanceService');
      throw error;
    }
  }

  // Get all performance statistics
  async getAllPerformanceStats(timeWindow: number = 3600000) {
    try {
      const routes = Array.from(this.performanceBudgets.keys());
      const stats = await Promise.all(
        routes.map(async (route) => {
          const getStats = await this.getRoutePerformance(route, 'POST', timeWindow);
          const postStats = await this.getRoutePerformance(route, 'GET', timeWindow);
          return { route, get: getStats, post: postStats };
        })
      );

      return stats;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.stack : String(error);
      this.logger.error('Failed to get all performance stats', errorMessage, 'PerformanceService');
      throw error;
    }
    }

  // Calculate percentile
  private percentile(sortedArray: number[], percentile: number): number {
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[index] || 0;
  }

  // Check if performance budgets are being met
  async checkPerformanceBudgets(): Promise<{ route: string; violations: string[] }[]> {
    const results: { route: string; violations: string[] }[] = [];
    
    for (const [route, budget] of this.performanceBudgets) {
      const violations: string[] = [];
      
      try {
        const stats = await this.getRoutePerformance(route, 'POST', 3600000); // Last hour
        
        if (stats.p99Duration > budget.p99Threshold) {
          violations.push(`P99 duration ${stats.p99Duration}ms exceeds threshold ${budget.p99Threshold}ms`);
        }
        
        if (stats.count > 0) {
          const avgQueries = stats.count; // Simplified - in practice you'd track actual DB queries
          if (avgQueries > budget.maxQueries) {
            violations.push(`Average queries ${avgQueries} exceeds threshold ${budget.maxQueries}`);
          }
        }
        
        if (violations.length > 0) {
          results.push({ route, violations });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.stack : String(error);
        this.logger.error(`Failed to check performance budget for ${route}`, errorMessage, 'PerformanceService');
      }
    }
    
    return results;
  }

  // Get current burst rates
  async getCurrentBurstRates() {
    try {
      const routes = Array.from(this.performanceBudgets.keys());
      const burstRates = await Promise.all(
        routes.map(async (route) => {
          const getBurst = await this.redis.getClient().get(`burst:${route}:GET`) || '0';
          const postBurst = await this.redis.getClient().get(`burst:${route}:POST`) || '0';
          
          return {
            route,
            get: parseInt(getBurst),
            post: parseInt(postBurst),
          };
        })
      );
      
      return burstRates;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.stack : String(error);
      this.logger.error('Failed to get current burst rates', errorMessage, 'PerformanceService');
      throw error;
    }
  }
}
