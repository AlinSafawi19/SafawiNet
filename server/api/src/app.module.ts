import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerModule, ThrottlerGuard, ThrottlerStorage } from '@nestjs/throttler';
import { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface';
import { APP_GUARD } from '@nestjs/core';
import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './health/health.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { LoyaltyModule } from './loyalty/loyalty.module';

import { RedisService } from './common/services/redis.service';
import { EmailService } from './common/services/email.service';
import { TelemetryService } from './common/services/telemetry.service';
import { SentryService } from './common/services/sentry.service';
import { QueueService } from './common/services/queue.service';
import { CronService } from './common/services/cron.service';
import { PerformanceService } from './common/services/performance.service';
import { PrismaService } from './common/services/prisma.service';
import { EmailMonitoringService } from './common/services/email-monitoring.service';
import { OfflineMessageService } from './common/services/offline-message.service';
import { LoggerService } from './common/services/logger.service';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { IdempotencyMiddleware } from './common/middleware/idempotency.middleware';
import { SecurityMiddleware } from './common/middleware/security.middleware';
import { PerformanceMiddleware } from './common/middleware/performance.middleware';
import { BasicAuthMiddleware } from './common/middleware/basic-auth.middleware';
import { RequestLoggingMiddleware } from './common/middleware/request-logging.middleware';
import { PerformanceController } from './common/controllers/performance.controller';

@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage {
  private redis: Redis;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
    });
  }

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const redisKey = `throttler:${throttlerName}:${key}`;
    const current = await this.redis.incr(redisKey);
    
    if (current === 1) {
      await this.redis.expire(redisKey, Math.ceil(ttl / 1000));
    }

    const totalHits = current;
    const timeToExpire = await this.redis.ttl(redisKey);
    const isBlocked = totalHits > limit;

    if (isBlocked) {
      await this.redis.expire(redisKey, Math.ceil(blockDuration / 1000));
    }

    return {
      totalHits,
      timeToExpire: timeToExpire > 0 ? timeToExpire * 1000 : 0,
      isBlocked,
      timeToBlockExpire: isBlocked ? (await this.redis.ttl(redisKey)) * 1000 : 0,
    };
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PassportModule.register({}),
    ScheduleModule.forRoot(),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
      },
      prefix: process.env.BULLMQ_PREFIX || 'safawinet',
    }),
    // Rate limiting configuration - only enabled in production
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const isProduction = configService.get('NODE_ENV') === 'production';

        if (!isProduction) {
          // Disable rate limiting in non-production environments
          return {
            throttlers: [],
          };
        }

        // Production rate limiting configuration
        return {
          throttlers: [
            // General API rate limiting
            {
              name: 'api',
              ttl: 60000, // 1 minute
              limit: 100, // 100 requests per minute
            },
            // Auth endpoints - more restrictive
            {
              name: 'auth',
              ttl: 60000, // 1 minute
              limit: 20, // 20 requests per minute
            },
            // User management endpoints
            {
              name: 'users',
              ttl: 60000, // 1 minute
              limit: 50, // 50 requests per minute
            },
            // Loyalty endpoints
            {
              name: 'loyalty',
              ttl: 60000, // 1 minute
              limit: 30, // 30 requests per minute
            },
          ],
          storage: new RedisThrottlerStorage(),
        };
      },
      inject: [ConfigService],
    }),
    HealthModule,
    UsersModule,
    AuthModule,
    LoyaltyModule,
  ],
  controllers: [AppController, PerformanceController],
  providers: [
    AppService,
    RedisService,
    EmailService,
    TelemetryService,
    SentryService,
    QueueService,
    CronService,
    PerformanceService,
    PrismaService,
    EmailMonitoringService,
    OfflineMessageService,
    LoggerService,
    // Global rate limiting guard - only active in production
    {
      provide: APP_GUARD,
      useFactory: (configService: ConfigService, storage: RedisThrottlerStorage) => {
        const isProduction = configService.get('NODE_ENV') === 'production';
        if (!isProduction) {
          return null;
        }
        
        // Create throttler options for the guard
        const throttlerOptions = {
          throttlers: [
            { name: 'api', ttl: 60000, limit: 100 },
            { name: 'auth', ttl: 60000, limit: 20 },
            { name: 'users', ttl: 60000, limit: 50 },
            { name: 'loyalty', ttl: 60000, limit: 30 },
          ],
          storage,
        };
        
        return new ThrottlerGuard(throttlerOptions, storage, null as any);
      },
      inject: [ConfigService, RedisThrottlerStorage],
    },
    RedisThrottlerStorage,
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestIdMiddleware)
      .forRoutes('*')
      .apply(RequestLoggingMiddleware)
      .forRoutes('*')
      .apply(SecurityMiddleware)
      .forRoutes('*')
      .apply(PerformanceMiddleware)
      .forRoutes('*')
      .apply(BasicAuthMiddleware)
      .forRoutes('*')
      .apply(IdempotencyMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.POST });
  }
}
