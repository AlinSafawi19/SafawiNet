import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PassportModule } from '@nestjs/passport';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './health/health.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';

import { RedisService } from './common/services/redis.service';
import { EmailService } from './common/services/email.service';
import { PinoLoggerService } from './common/services/logger.service';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { IdempotencyMiddleware } from './common/middleware/idempotency.middleware';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    HealthModule,
    UsersModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService, 
    RedisService, 
    EmailService, 
    PinoLoggerService
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestIdMiddleware)
      .forRoutes('*')
      .apply(IdempotencyMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.POST });
  }
}
