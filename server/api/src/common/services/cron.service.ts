import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { QueueService } from './queue.service';
import { PrismaService } from './prisma.service';
import { OfflineMessageService } from './offline-message.service';

@Injectable()
export class CronService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CronService.name);

  constructor(
    private queueService: QueueService,
    private prisma: PrismaService,
    private offlineMessageService: OfflineMessageService,
  ) {}

  onModuleInit() {}

  onModuleDestroy() {}

  // Sweep expired tokens every 5 minutes
  @Cron(CronExpression.EVERY_5_MINUTES)
  async sweepExpiredTokens() {
    try {
      // Add job to security queue for token cleanup
      await this.queueService.addSecurityJob({
        type: 'token_cleanup',
        data: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      this.logger.error('Failed to add token cleanup job to queue', error, {
        source: 'cron',
        jobType: 'token_cleanup',
      });
    }
  }

  // Prune stale sessions nightly at 2 AM
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async pruneStaleSessions() {
    try {
      // Add job to security queue for session cleanup
      await this.queueService.addSecurityJob({
        type: 'session_cleanup',
        data: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      this.logger.error('Failed to add session cleanup job to queue', error, {
        source: 'cron',
        jobType: 'session_cleanup',
      });
    }
  }

  // Expire read notifications after TTL (every hour)
  @Cron(CronExpression.EVERY_HOUR)
  async expireReadNotifications() {
    try {
      // Add job to security queue for notification cleanup
      await this.queueService.addSecurityJob({
        type: 'notification_cleanup',
        data: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      this.logger.error(
        'Failed to add notification cleanup job to queue',
        error,
        {
          source: 'cron',
          jobType: 'notification_cleanup',
        },
      );
    }
  }

  // Database cleanup every day at 3 AM
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async performDatabaseCleanup() {
    try {
      // Add job to maintenance queue
      await this.queueService.addMaintenanceJob({
        type: 'db_cleanup',
        data: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      this.logger.error('Failed to add database cleanup job to queue', error, {
        source: 'cron',
        jobType: 'db_cleanup',
      });
    }
  }

  // Log rotation every day at 4 AM
  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async performLogRotation() {
    try {
      // Add job to maintenance queue
      await this.queueService.addMaintenanceJob({
        type: 'log_rotation',
        data: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      this.logger.error('Failed to add log rotation job to queue', error, {
        source: 'cron',
        jobType: 'log_rotation',
      });
    }
  }

  // Health check every 10 minutes (using custom cron expression since EVERY_15_MINUTES doesn't exist)
  @Cron('0 */10 * * * *')
  async performHealthCheck() {
    try {
      // Add job to maintenance queue
      await this.queueService.addMaintenanceJob({
        type: 'health_check',
        data: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      this.logger.error('Failed to add health check job to queue', error, {
        source: 'cron',
        jobType: 'health_check',
      });
    }
  }

  // Manual cleanup methods for testing/debugging
  async manualTokenCleanup() {
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
    return totalCleaned;
  }

  async manualSessionCleanup() {
    // Clean up old user sessions (older than 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const result = await this.prisma.userSession.deleteMany({
      where: {
        lastActiveAt: {
          lt: thirtyDaysAgo,
        },
      },
    });

    return result.count;
  }

  async manualNotificationCleanup() {
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

    return result.count;
  }

  // Clean up expired offline messages every hour
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredOfflineMessages() {
    await this.offlineMessageService.cleanupExpiredMessages();
  }

  // Clean up old processed offline messages daily at 3 AM
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupOldProcessedOfflineMessages() {
    await this.offlineMessageService.cleanupOldProcessedMessages();
  }

  // Manual cleanup methods for offline messages
  async manualOfflineMessageCleanup() {
    const expiredCount =
      await this.offlineMessageService.cleanupExpiredMessages();
    const oldCount =
      await this.offlineMessageService.cleanupOldProcessedMessages();

    return { expiredCount, oldCount };
  }
}
