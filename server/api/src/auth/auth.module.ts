import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TwoFactorService } from './two-factor.service';
import { SessionsController } from './sessions.controller';
import { NotificationsController } from './notifications.controller';
import { EmailMonitoringController } from './email-monitoring.controller';
import { AdminController } from './admin.controller';
import { CustomerController } from './customer.controller';
import { SessionsService } from './sessions.service';
import { NotificationsService } from './notifications.service';
import { EmailMonitoringService } from '../common/services/email-monitoring.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RolesGuard } from './guards/roles.guard';
import { PrismaService } from '../common/services/prisma.service';
import { RedisService } from '../common/services/redis.service';
import { EmailService } from '../common/services/email.service';
import { PinoLoggerService } from '../common/services/logger.service';
import { SentryService } from '../common/services/sentry.service';
import { SecurityUtils } from '../common/security/security.utils';
import { AuthWebSocketGateway } from '../websocket/websocket.gateway';

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
  ],
  controllers: [AuthController, SessionsController, NotificationsController, EmailMonitoringController, AdminController, CustomerController],
  providers: [
    AuthService,
    TwoFactorService,
    SessionsService,
    NotificationsService,
    EmailMonitoringService,
    JwtStrategy,
    RolesGuard,
    PrismaService,
    RedisService,
    EmailService,
    PinoLoggerService,
    SentryService,
    SecurityUtils,
    AuthWebSocketGateway,
  ],
  exports: [AuthService, TwoFactorService, SessionsService, NotificationsService, JwtModule, JwtStrategy, RolesGuard, AuthWebSocketGateway],
})
export class AuthModule {}
