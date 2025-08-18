import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TwoFactorService } from './two-factor.service';
import { RecoveryService } from './recovery.service';
import { SessionsController } from './sessions.controller';
import { NotificationsController } from './notifications.controller';
import { EmailMonitoringController } from './email-monitoring.controller';
import { SessionsService } from './sessions.service';
import { NotificationsService } from './notifications.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PrismaService } from '../common/services/prisma.service';
import { RedisService } from '../common/services/redis.service';
import { EmailService } from '../common/services/email.service';
import { SecurityUtils } from '../common/security/security.utils';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
        },
      }),
      inject: [ConfigService],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100,
      },
    ]),
  ],
  controllers: [AuthController, SessionsController, NotificationsController, EmailMonitoringController],
  providers: [
    AuthService,
    TwoFactorService,
    RecoveryService,
    SessionsService,
    NotificationsService,
    JwtStrategy,
    PrismaService,
    RedisService,
    EmailService,
    SecurityUtils,
  ],
  exports: [AuthService, TwoFactorService, SessionsService, NotificationsService, JwtModule, JwtStrategy],
})
export class AuthModule {}
