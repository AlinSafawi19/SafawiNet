import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { QueueService } from './queue.service';
import { PrismaService } from './prisma.service';
import { OfflineMessageService } from './offline-message.service';

@Injectable()
export class CronService implements OnModuleInit, OnModuleDestroy {
  constructor(
    private queueService: QueueService,
    private prisma: PrismaService,
    private offlineMessageService: OfflineMessageService,
  ) {}

  onModuleInit() {
  }

  onModuleDestroy() {
  }

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
      const errorMessage = error instanceof Error ? error.stack : String(error);
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
      const errorMessage = error instanceof Error ? error.stack : String(error);
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
      const errorMessage = error instanceof Error ? error.stack : String(error);
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
      const errorMessage = error instanceof Error ? error.stack : String(error);
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
      const errorMessage = error instanceof Error ? error.stack : String(error);
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
      const errorMessage = error instanceof Error ? error.stack : String(error);
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
      return totalCleaned;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.stack : String(error);
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

      return result.count;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.stack : String(error);
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

      return result.count;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.stack : String(error);
      throw error;
    }
  }

  // Clean up expired offline messages every hour
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredOfflineMessages() {
    try {


      const expiredCount =
        await this.offlineMessageService.cleanupExpiredMessages();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.stack : String(error);

    }
  }

  // Clean up old processed offline messages daily at 3 AM
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupOldProcessedOfflineMessages() {
    try {

      const oldCount =
        await this.offlineMessageService.cleanupOldProcessedMessages();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.stack : String(error);

    }
  }

  // Manual cleanup methods for offline messages
  async manualOfflineMessageCleanup() {
    try {
      const expiredCount =
        await this.offlineMessageService.cleanupExpiredMessages();
      const oldCount =
        await this.offlineMessageService.cleanupOldProcessedMessages();

      return { expiredCount, oldCount };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.stack : String(error);

      throw error;
    }
  }
}
