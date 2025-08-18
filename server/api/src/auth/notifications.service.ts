import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { NotificationListDto, NotificationMarkReadDto } from './schemas/auth.schemas';

export interface NotificationInfo {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  readAt?: Date;
  metadata?: any;
  priority: string;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedNotifications {
  notifications: NotificationInfo[];
  nextCursor?: string;
  hasMore: boolean;
}

export interface CreateNotificationData {
  userId: string;
  type: string;
  title: string;
  message: string;
  metadata?: any;
  priority?: string;
  expiresAt?: Date;
}

// Helper function to convert null to undefined for optional fields
function nullToUndefined<T>(value: T | null): T | undefined {
  return value === null ? undefined : value;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Create a new notification
   */
  async createNotification(data: CreateNotificationData): Promise<NotificationInfo> {
    const notification = await this.prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        metadata: data.metadata,
        priority: data.priority || 'normal',
        expiresAt: data.expiresAt,
      },
    });

    this.logger.log(`Created notification ${notification.id} for user ${data.userId}`);

    return {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      isRead: notification.isRead,
      readAt: nullToUndefined(notification.readAt),
      metadata: notification.metadata as any,
      priority: notification.priority,
      expiresAt: nullToUndefined(notification.expiresAt),
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt,
    };
  }

  /**
   * List user notifications with cursor pagination
   */
  async listNotifications(
    userId: string,
    query: NotificationListDto,
  ): Promise<PaginatedNotifications> {
    const { cursor, limit, type, isRead } = query;

    const where: any = { userId };
    
    if (type) {
      where.type = type;
    }
    
    if (isRead !== undefined) {
      where.isRead = isRead;
    }

    // Filter out expired notifications
    where.OR = [
      { expiresAt: null },
      { expiresAt: { gt: new Date() } },
    ];

    const take = limit + 1; // Take one extra to check if there are more

    const notifications = await this.prisma.notification.findMany({
      where,
      take,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: 'desc' },
    });

    const hasMore = notifications.length > limit;
    const notificationsToReturn = hasMore ? notifications.slice(0, limit) : notifications;
    const nextCursor = hasMore ? notificationsToReturn[notificationsToReturn.length - 1].id : undefined;

    return {
      notifications: notificationsToReturn.map(n => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        isRead: n.isRead,
        readAt: nullToUndefined(n.readAt),
        metadata: n.metadata as any,
        priority: n.priority,
        expiresAt: nullToUndefined(n.expiresAt),
        createdAt: n.createdAt,
        updatedAt: n.updatedAt,
      })),
      nextCursor,
      hasMore,
    };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(userId: string, notificationId: string): Promise<void> {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.isRead) {
      return; // Already read
    }

    await this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    this.logger.log(`Marked notification ${notificationId} as read for user ${userId}`);
  }

  /**
   * Mark multiple notifications as read
   */
  async markMultipleAsRead(userId: string, notificationIds: string[]): Promise<{ updatedCount: number }> {
    const result = await this.prisma.notification.updateMany({
      where: {
        id: { in: notificationIds },
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    this.logger.log(`Marked ${result.count} notifications as read for user ${userId}`);

    return { updatedCount: result.count };
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<{ updatedCount: number }> {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    this.logger.log(`Marked all notifications as read for user ${userId}`);

    return { updatedCount: result.count };
  }

  /**
   * Get unread notification count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    const count = await this.prisma.notification.count({
      where: {
        userId,
        isRead: false,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
    });

    return count;
  }

  /**
   * Delete expired notifications
   */
  async cleanupExpiredNotifications(): Promise<{ cleanedCount: number }> {
    const result = await this.prisma.notification.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    if (result.count > 0) {
      this.logger.log(`Cleaned up ${result.count} expired notifications`);
    }

    return { cleanedCount: result.count };
  }

  /**
   * Create security alert notification
   */
  async createSecurityAlert(
    userId: string,
    title: string,
    message: string,
    metadata?: any,
  ): Promise<NotificationInfo> {
    return this.createNotification({
      userId,
      type: 'security_alert',
      title,
      message,
      metadata,
      priority: 'high',
    });
  }

  /**
   * Create account update notification
   */
  async createAccountUpdate(
    userId: string,
    title: string,
    message: string,
    metadata?: any,
  ): Promise<NotificationInfo> {
    return this.createNotification({
      userId,
      type: 'account_update',
      title,
      message,
      metadata,
      priority: 'normal',
    });
  }

  /**
   * Create system message notification
   */
  async createSystemMessage(
    userId: string,
    title: string,
    message: string,
    metadata?: any,
  ): Promise<NotificationInfo> {
    return this.createNotification({
      userId,
      type: 'system_message',
      title,
      message,
      metadata,
      priority: 'low',
    });
  }
}
