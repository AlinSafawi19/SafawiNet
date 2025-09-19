import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SimpleTwoFactorService } from './simple-two-factor.service';
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
import { SentryService } from '../common/services/sentry.service';
import { SecurityUtils } from '../common/security/security.utils';
import { AuthWebSocketGateway } from '../websocket/websocket.gateway';
import { OfflineMessageService } from '../common/services/offline-message.service';
import { LoggerService } from '../common/services/logger.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
        },
      }),
      inject: [ConfigService],
    }),
    forwardRef(() => UsersModule),
  ],
  controllers: [
    AuthController,
    SessionsController,
    NotificationsController,
    EmailMonitoringController,
    AdminController,
    CustomerController,
  ],
  providers: [
    AuthService,
    SimpleTwoFactorService,
    SessionsService,
    NotificationsService,
    EmailMonitoringService,
    JwtStrategy,
    RolesGuard,
    PrismaService,
    RedisService,
    EmailService,
    SentryService,
    SecurityUtils,
    AuthWebSocketGateway,
    OfflineMessageService,
    LoggerService,
  ],
  exports: [
    AuthService,
    SessionsService,
    NotificationsService,
    JwtModule,
    JwtStrategy,
    RolesGuard,
    AuthWebSocketGateway,
  ],
})
export class AuthModule {}
