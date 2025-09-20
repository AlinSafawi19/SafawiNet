import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';

export interface OfflineMessagePayload {
  [key: string]: any;
}

export interface CreateOfflineMessageDto {
  userId: string;
  type: 'auth' | 'security' | 'notification';
  event: string;
  payload: OfflineMessagePayload;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  expiresAt?: Date;
}

export interface OfflineMessage {
  id: string;
  userId: string;
  type: string;
  event: string;
  payload: OfflineMessagePayload;
  priority: string;
  expiresAt: Date | null;
  isProcessed: boolean;
  processedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class OfflineMessageService {
  private readonly logger = new Logger(OfflineMessageService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create an offline message for a user
   */
  async createMessage(dto: CreateOfflineMessageDto): Promise<OfflineMessage> {
    const message = await this.prisma.offlineMessage.create({
      data: {
        userId: dto.userId,
        type: dto.type,
        event: dto.event,
        payload: dto.payload,
        priority: dto.priority || 'normal',
        expiresAt: dto.expiresAt,
      },
    });

    return message as OfflineMessage;
  }

  /**
   * Get all unprocessed messages for a user
   */
  async getUnprocessedMessages(userId: string): Promise<OfflineMessage[]> {
    try {
      const messages = await this.prisma.offlineMessage.findMany({
        where: {
          userId,
          isProcessed: false,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      });

      return messages as OfflineMessage[];
    } catch (error) {
      this.logger.error('Failed to get offline messages', error, {
        source: 'offline-message',
        userId,
      });
      return [];
    }
  }

  /**
   * Mark a message as processed
   */
  async markAsProcessed(messageId: string): Promise<void> {
    try {
      await this.prisma.offlineMessage.update({
        where: { id: messageId },
        data: {
          isProcessed: true,
          processedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error('Failed to mark message as processed', error, {
        source: 'offline-message',
        messageId,
      });
      throw new Error(`Failed to mark message ${messageId} as processed`);
    }
  }

  /**
   * Mark multiple messages as processed
   */
  async markMultipleAsProcessed(messageIds: string[]): Promise<void> {
    try {
      await this.prisma.offlineMessage.updateMany({
        where: { id: { in: messageIds } },
        data: {
          isProcessed: true,
          processedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error('Failed to mark messages as processed', error, {
        source: 'offline-message',
        messageIds,
      });
    }
  }

  /**
   * Check if user has any unprocessed messages
   */
  async hasUnprocessedMessages(userId: string): Promise<boolean> {
    try {
      const count = await this.prisma.offlineMessage.count({
        where: {
          userId,
          isProcessed: false,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
      });

      return count > 0;
    } catch (error) {
      this.logger.error('Failed to check for unprocessed messages', error, {
        source: 'offline-message',
        userId,
      });
      return false;
    }
  }

  /**
   * Clean up expired messages
   */
  async cleanupExpiredMessages(): Promise<number> {
    try {
      const result = await this.prisma.offlineMessage.deleteMany({
        where: {
          expiresAt: { lt: new Date() },
        },
      });

      return result.count;
    } catch (error) {
      this.logger.error('Failed to cleanup expired messages', error, {
        source: 'offline-message',
      });
      return 0;
    }
  }

  /**
   * Clean up old processed messages (older than 30 days)
   */
  async cleanupOldProcessedMessages(): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await this.prisma.offlineMessage.deleteMany({
      where: {
        isProcessed: true,
        processedAt: { lt: thirtyDaysAgo },
      },
    });

    return result.count;
  }

  /**
   * Get message statistics for a user
   */
  async getMessageStats(userId: string): Promise<{
    total: number;
    unprocessed: number;
    processed: number;
    expired: number;
  }> {
    try {
      const [total, unprocessed, processed, expired] = await Promise.all([
        this.prisma.offlineMessage.count({
          where: { userId },
        }),
        this.prisma.offlineMessage.count({
          where: {
            userId,
            isProcessed: false,
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
        }),
        this.prisma.offlineMessage.count({
          where: {
            userId,
            isProcessed: true,
          },
        }),
        this.prisma.offlineMessage.count({
          where: {
            userId,
            expiresAt: { lt: new Date() },
          },
        }),
      ]);

      return { total, unprocessed, processed, expired };
    } catch (error) {
      this.logger.error('Failed to get message stats for user', error, {
        source: 'offline-message',
        userId,
      });
      throw new Error(`Failed to get message stats for user ${userId}`);
    }
  }

  /**
   * Create specific offline message types
   */

  async createForceLogoutMessage(
    userId: string,
    reason: string,
    message: string,
  ): Promise<OfflineMessage> {
    return this.createMessage({
      userId,
      type: 'security',
      event: 'forceLogout',
      payload: {
        reason,
        message,
        timestamp: new Date().toISOString(),
      },
      priority: 'urgent',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });
  }

  async createPasswordChangeMessage(userId: string): Promise<OfflineMessage> {
    return this.createForceLogoutMessage(
      userId,
      'password_changed',
      'Your password has been changed. Please log in again.',
    );
  }

  async createPasswordResetMessage(userId: string): Promise<OfflineMessage> {
    return this.createForceLogoutMessage(
      userId,
      'password_reset',
      'Your password has been reset. Please log in with your new password.',
    );
  }

  async create2FADisabledMessage(userId: string): Promise<OfflineMessage> {
    return this.createForceLogoutMessage(
      userId,
      '2fa_disabled',
      'Two-factor authentication has been disabled. Please log in again.',
    );
  }
}
