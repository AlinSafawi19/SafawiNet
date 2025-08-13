import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaService } from '../common/services/prisma.service';
import { EmailService } from '../common/services/email.service';
import { RedisService } from '../common/services/redis.service';
import { RateLimitGuard } from '../common/guards/rate-limit.guard';

@Module({
  controllers: [UsersController],
  providers: [
    UsersService, 
    PrismaService, 
    EmailService, 
    RedisService,
    RateLimitGuard
  ],
  exports: [UsersService],
})
export class UsersModule {}
