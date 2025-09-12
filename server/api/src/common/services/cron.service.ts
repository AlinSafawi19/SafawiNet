import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { QueueService } from './queue.service';
import { PinoLoggerService } from './logger.service';
import { PrismaService } from './prisma.service';

@Injectable()
export class CronService implements OnModuleInit, OnModuleDestroy {
  constructor(
    private queueService: QueueService,
    private logger: PinoLoggerService,
    private prisma: PrismaService,
  ) {}

  onModuleInit() {
    this.logger.log('Cron service initialized', 'CronService');
  }

  onModuleDestroy() {
    this.logger.log('Cron service destroyed', 'CronService');
  }

  // Sweep expired tokens every 5 minutes
  @Cron(CronExpression.EVERY_5_MINUTES)
  async sweepExpiredTokens() {
    try {
      this.logger.log('Starting expired token cleanup', 'CronService');

      // Add job to security queue for token cleanup
      await this.queueService.addSecurityJob({
        type: 'token_cleanup',
        data: { timestamp: new Date().toISOString() },
      });

      this.logger.log('Expired token cleanup job queued', 'CronService');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.stack : String(error);
      this.logger.error(
        'Failed to queue token cleanup job',
        errorMessage,
        'CronService',
      );
    }
  }

  // Prune stale sessions nightly at 2 AM
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async pruneStaleSessions() {
    try {
      this.logger.log('Starting stale session cleanup', 'CronService');

      // Add job to security queue for session cleanup
      await this.queueService.addSecurityJob({
        type: 'session_cleanup',
        data: { timestamp: new Date().toISOString() },
      });

      this.logger.log('Stale session cleanup job queued', 'CronService');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.stack : String(error);
      this.logger.error(
        'Failed to queue session cleanup job',
        errorMessage,
        'CronService',
      );
    }
  }

  // Expire read notifications after TTL (every hour)
  @Cron(CronExpression.EVERY_HOUR)
  async expireReadNotifications() {
    try {
      this.logger.log('Starting notification cleanup', 'CronService');

      // Add job to security queue for notification cleanup
      await this.queueService.addSecurityJob({
        type: 'notification_cleanup',
        data: { timestamp: new Date().toISOString() },
      });

      this.logger.log('Notification cleanup job queued', 'CronService');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.stack : String(error);
      this.logger.error(
        'Failed to queue notification cleanup job',
        errorMessage,
        'CronService',
      );
    }
  }

  // Database cleanup every day at 3 AM
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async performDatabaseCleanup() {
    try {
      this.logger.log('Starting database cleanup', 'CronService');

      // Add job to maintenance queue
      await this.queueService.addMaintenanceJob({
        type: 'db_cleanup',
        data: { timestamp: new Date().toISOString() },
      });

      this.logger.log('Database cleanup job queued', 'CronService');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.stack : String(error);
      this.logger.error(
        'Failed to queue database cleanup job',
        errorMessage,
        'CronService',
      );
    }
  }

  // Log rotation every day at 4 AM
  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async performLogRotation() {
    try {
      this.logger.log('Starting log rotation', 'CronService');

      // Add job to maintenance queue
      await this.queueService.addMaintenanceJob({
        type: 'log_rotation',
        data: { timestamp: new Date().toISOString() },
      });

      this.logger.log('Log rotation job queued', 'CronService');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.stack : String(error);
      this.logger.error(
        'Failed to queue log rotation job',
        errorMessage,
        'CronService',
      );
    }
  }

  // Health check every 10 minutes (using custom cron expression since EVERY_15_MINUTES doesn't exist)
  @Cron('0 */10 * * * *')
  async performHealthCheck() {
    try {
      this.logger.log('Starting health check', 'CronService');

      // Add job to maintenance queue
      await this.queueService.addMaintenanceJob({
        type: 'health_check',
        data: { timestamp: new Date().toISOString() },
      });

      this.logger.log('Health check job queued', 'CronService');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.stack : String(error);
      this.logger.error(
        'Failed to queue health check job',
        errorMessage,
        'CronService',
      );
    }
  }

  // Manual cleanup methods for testing/debugging
  async manualTokenCleanup() {
    try {
      // Clean up expired refresh sessions
      const refreshResult = await this.prisma.refreshSession.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });

      // Clean up expired one-time tokens
      const oneTimeResult = await this.prisma.oneTimeToken.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });

      const totalCleaned = refreshResult.count + oneTimeResult.count;
      this.logger.log(
        `Cleaned up ${totalCleaned} expired tokens/sessions`,
        'CronService',
      );
      return totalCleaned;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.stack : String(error);
      this.logger.error(
        'Failed to cleanup expired tokens',
        errorMessage,
        'CronService',
      );
      throw error;
    }
  }

  async manualSessionCleanup() {
    try {
      // Clean up old user sessions (older than 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const result = await this.prisma.userSession.deleteMany({
        where: {
          lastActiveAt: {
            lt: thirtyDaysAgo,
          },
        },
      });

      this.logger.log(`Cleaned up ${result.count} old sessions`, 'CronService');
      return result.count;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.stack : String(error);
      this.logger.error(
        'Failed to cleanup old sessions',
        errorMessage,
        'CronService',
      );
      throw error;
    }
  }

  async manualNotificationCleanup() {
    try {
      const result = await this.prisma.notification.deleteMany({
        where: {
          AND: [
            { isRead: true },
            {
              createdAt: {
                lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
              },
            },
          ],
        },
      });

      this.logger.log(
        `Cleaned up ${result.count} old read notifications`,
        'CronService',
      );
      return result.count;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.stack : String(error);
      this.logger.error(
        'Failed to cleanup old notifications',
        errorMessage,
        'CronService',
      );
      throw error;
    }
  }
}
