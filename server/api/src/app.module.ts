import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PassportModule } from '@nestjs/passport';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './health/health.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { LoyaltyModule } from './loyalty/loyalty.module';
import { CatalogModule } from './catalog/catalog.module';
import { FinanceModule } from './finance/finance.module';
import { CartModule } from './cart/cart.module';

import { RedisService } from './common/services/redis.service';
import { EmailService } from './common/services/email.service';
import { PinoLoggerService } from './common/services/logger.service';
import { TelemetryService } from './common/services/telemetry.service';
import { SentryService } from './common/services/sentry.service';
import { QueueService } from './common/services/queue.service';
import { CronService } from './common/services/cron.service';
import { PerformanceService } from './common/services/performance.service';
import { PrismaService } from './common/services/prisma.service';
import { EmailMonitoringService } from './common/services/email-monitoring.service';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { IdempotencyMiddleware } from './common/middleware/idempotency.middleware';
import { SecurityMiddleware } from './common/middleware/security.middleware';
import { PerformanceMiddleware } from './common/middleware/performance.middleware';
import { BasicAuthMiddleware } from './common/middleware/basic-auth.middleware';
import { PerformanceController } from './common/controllers/performance.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    ThrottlerModule.forRoot([
      {
        ttl: parseInt(process.env.RATE_LIMIT_TTL || '60000'),
        limit: parseInt(process.env.RATE_LIMIT_LIMIT || '100'),
      },
      // Special rate limit for login endpoints
      {
        name: 'login',
        ttl: 60000, // 1 minute
        limit: parseInt(process.env.LOGIN_BURST_LIMIT || '300'),
        skipIf: (context) => {
          const request = context.switchToHttp().getRequest();
          return !request.url.includes('/auth/login');
        },
      },
    ]),
    ScheduleModule.forRoot(),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
      },
      prefix: process.env.BULLMQ_PREFIX || 'safawinet',
    }),
    HealthModule,
    UsersModule,
    AuthModule,
    LoyaltyModule,
    CatalogModule,
    FinanceModule,
    CartModule,
  ],
  controllers: [AppController, PerformanceController],
  providers: [
    AppService, 
    RedisService, 
    EmailService, 
    PinoLoggerService,
    TelemetryService,
    SentryService,
    QueueService,
    CronService,
    PerformanceService,
    PrismaService,
    EmailMonitoringService,
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestIdMiddleware)
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
