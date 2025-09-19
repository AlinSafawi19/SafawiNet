import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaService } from '../common/services/prisma.service';
import { EmailService } from '../common/services/email.service';
import { RedisService } from '../common/services/redis.service';
import { OfflineMessageService } from '../common/services/offline-message.service';
import { LoggerService } from '../common/services/logger.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [forwardRef(() => AuthModule), JwtModule],
  controllers: [UsersController],
  providers: [
    UsersService,
    PrismaService,
    EmailService,
    RedisService,
    OfflineMessageService,
    LoggerService,
    JwtAuthGuard,
  ],
  exports: [UsersService],
})
export class UsersModule {}
