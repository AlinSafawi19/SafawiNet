import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { NotificationListDto } from './schemas/auth.schemas';
import { Prisma, Notification } from '@prisma/client';

// Base metadata interface for all notifications
export interface BaseNotificationMetadata {
  [key: string]: unknown;
}

// Specific metadata types for different notification types
export interface SecurityAlertMetadata extends BaseNotificationMetadata {
  reason?: string;
  revokedAt?: string;
  sessionCount?: number;
  ipAddress?: string;
  userAgent?: string;
  location?: string;
  deviceType?: string;
  browser?: string;
  os?: string;
}

export interface AccountUpdateMetadata extends BaseNotificationMetadata {
  field?: string;
  oldValue?: string;
  newValue?: string;
  changedAt?: string;
  changedBy?: string;
}

export interface SystemMessageMetadata extends BaseNotificationMetadata {
  category?: string;
  actionRequired?: boolean;
  actionUrl?: string;
  expiresAt?: string;
}

export interface EmailComplaintMetadata extends BaseNotificationMetadata {
  complaintFeedbackType?: string;
  feedbackId?: string;
  email?: string;
}

// Union type for all possible metadata types
export type NotificationMetadata =
  | SecurityAlertMetadata
  | AccountUpdateMetadata
  | SystemMessageMetadata
  | EmailComplaintMetadata
  | BaseNotificationMetadata;

// Type for Prisma JSON compatibility - use Prisma's JsonValue
export type PrismaNotificationMetadata = Prisma.JsonValue;

// Prisma notification type with all fields
export type PrismaNotification = Notification;

// Prisma notification type for creation
export type PrismaNotificationCreateInput = Prisma.NotificationCreateInput;

// Prisma notification type for updates
export type PrismaNotificationUpdateInput = Prisma.NotificationUpdateInput;

// Prisma notification type for where clauses
export type PrismaNotificationWhereInput = Prisma.NotificationWhereInput;

// Notification priority type
export type NotificationPriority = 'low' | 'normal' | 'high';

// Notification type enum
export type NotificationType =
  | 'security_alert'
  | 'account_update'
  | 'system_message'
  | 'email_complaint'
  | 'password_change'
  | 'email_verification'
  | 'two_factor_enabled'
  | 'two_factor_disabled'
  | 'session_revoked'
  | 'login_attempt'
  | 'profile_updated'
  | 'preferences_updated';

export interface NotificationInfo {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  readAt?: Date;
  metadata?: NotificationMetadata;
  priority: NotificationPriority;
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
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Prisma.InputJsonValue;
  priority?: NotificationPriority;
  expiresAt?: Date;
}

/**
 * Helper function to convert null to undefined for optional fields
 * @param value - The value that might be null
 * @returns The value or undefined if it was null
 */
function nullToUndefined<T>(value: T | null): T | undefined {
  return value === null ? undefined : value;
}

/**
 * Type guard to check if a value is a valid NotificationType
 * @param value - The string value to check
 * @returns True if the value is a valid NotificationType
 */
function isValidNotificationType(value: string): value is NotificationType {
  const validTypes: NotificationType[] = [
    'security_alert',
    'account_update',
    'system_message',
    'email_complaint',
    'password_change',
    'email_verification',
    'two_factor_enabled',
    'two_factor_disabled',
    'session_revoked',
    'login_attempt',
    'profile_updated',
    'preferences_updated',
  ];
  return validTypes.includes(value as NotificationType);
}

/**
 * Type guard to check if a value is a valid NotificationPriority
 * @param value - The string value to check
 * @returns True if the value is a valid NotificationPriority
 */
function isValidNotificationPriority(
  value: string,
): value is NotificationPriority {
  const validPriorities: NotificationPriority[] = ['low', 'normal', 'high'];
  return validPriorities.includes(value as NotificationPriority);
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new notification
   */
  async createNotification(
    data: CreateNotificationData,
  ): Promise<NotificationInfo> {
    const notification: PrismaNotification =
      await this.prisma.notification.create({
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

    return {
      id: notification.id,
      type: isValidNotificationType(notification.type)
        ? notification.type
        : 'system_message',
      title: notification.title,
      message: notification.message,
      isRead: notification.isRead,
      readAt: nullToUndefined(notification.readAt),
      metadata: notification.metadata as NotificationMetadata | undefined,
      priority: isValidNotificationPriority(notification.priority)
        ? notification.priority
        : 'normal',
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

    const where: PrismaNotificationWhereInput = { userId };

    if (type && isValidNotificationType(type as string)) {
      where.type = type as string;
    }

    if (isRead !== undefined) {
      where.isRead = Boolean(isRead);
    }

    // Filter out expired notifications
    where.OR = [{ expiresAt: null }, { expiresAt: { gt: new Date() } }];

    const take = (limit as number) + 1; // Take one extra to check if there are more

    const notifications: PrismaNotification[] =
      await this.prisma.notification.findMany({
        where,
        take,
        cursor: cursor ? { id: cursor as string } : undefined,
        orderBy: { createdAt: 'desc' },
      });

    const hasMore = notifications.length > (limit as number);
    const notificationsToReturn = hasMore
      ? notifications.slice(0, limit as number)
      : notifications;
    const nextCursor = hasMore
      ? notificationsToReturn[notificationsToReturn.length - 1].id
      : undefined;

    return {
      notifications: notificationsToReturn.map((n) => ({
        id: n.id,
        type: isValidNotificationType(n.type) ? n.type : 'system_message',
        title: n.title,
        message: n.message,
        isRead: n.isRead,
        readAt: nullToUndefined(n.readAt),
        metadata: n.metadata as NotificationMetadata | undefined,
        priority: isValidNotificationPriority(n.priority)
          ? n.priority
          : 'normal',
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
    const notification: PrismaNotification | null =
      await this.prisma.notification.findFirst({
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
  }

  /**
   * Mark multiple notifications as read
   */
  async markMultipleAsRead(
    userId: string,
    notificationIds: string[],
  ): Promise<{ updatedCount: number }> {
    const result: Prisma.BatchPayload =
      await this.prisma.notification.updateMany({
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

    return { updatedCount: result.count };
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<{ updatedCount: number }> {
    const result: Prisma.BatchPayload =
      await this.prisma.notification.updateMany({
        where: {
          userId,
          isRead: false,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

    return { updatedCount: result.count };
  }

  /**
   * Get unread notification count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    const count: number = await this.prisma.notification.count({
      where: {
        userId,
        isRead: false,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });

    return count;
  }

  /**
   * Delete expired notifications
   */
  async cleanupExpiredNotifications(): Promise<{ cleanedCount: number }> {
    const result: Prisma.BatchPayload =
      await this.prisma.notification.deleteMany({
        where: {
          expiresAt: { lt: new Date() },
        },
      });

    if (result.count > 0) {
      this.logger.log(`Cleaned up ${result.count} expired notifications`, {
        source: 'notifications',
        cleanedCount: result.count,
      });
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
    metadata?: SecurityAlertMetadata,
  ): Promise<NotificationInfo> {
    return this.createNotification({
      userId,
      type: 'security_alert',
      title,
      message,
      metadata: metadata as Prisma.InputJsonValue,
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
    metadata?: AccountUpdateMetadata,
  ): Promise<NotificationInfo> {
    return this.createNotification({
      userId,
      type: 'account_update',
      title,
      message,
      metadata: metadata as Prisma.InputJsonValue,
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
    metadata?: SystemMessageMetadata,
  ): Promise<NotificationInfo> {
    return this.createNotification({
      userId,
      type: 'system_message',
      title,
      message,
      metadata: metadata as Prisma.InputJsonValue,
      priority: 'low',
    });
  }
}
