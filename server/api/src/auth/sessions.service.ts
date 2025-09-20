import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { Request } from 'express';
import { SessionListDto } from './schemas/auth.schemas';
import { Prisma } from '@prisma/client';

export interface DeviceInfo {
  deviceFingerprint?: string;
  userAgent?: string;
  ipAddress?: string;
  location?: string;
  deviceType?: string;
  browser?: string;
  os?: string;
}

export interface SessionInfo {
  id: string;
  deviceFingerprint?: string;
  userAgent?: string;
  ipAddress?: string;
  location?: string;
  deviceType?: string;
  browser?: string;
  os?: string;
  isCurrent: boolean;
  lastActiveAt: Date;
  createdAt: Date;
}

export interface PaginatedSessions {
  sessions: SessionInfo[];
  nextCursor?: string;
  hasMore: boolean;
}

// Helper function to convert null to undefined for optional fields
function nullToUndefined<T>(value: T | null): T | undefined {
  return value === null ? undefined : value;
}

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Extract device information from request
   */
  extractDeviceInfo(req: Request): DeviceInfo {
    const userAgent = req.headers['user-agent'];
    const ipAddress =
      req.ip || req.connection.remoteAddress || req.socket.remoteAddress;

    // Parse user agent to extract device info
    const deviceInfo: DeviceInfo = {
      userAgent,
      ipAddress: typeof ipAddress === 'string' ? ipAddress : undefined,
    };

    if (userAgent) {
      // Simple device type detection
      if (
        userAgent.includes('Mobile') ||
        userAgent.includes('Android') ||
        userAgent.includes('iPhone')
      ) {
        deviceInfo.deviceType = 'mobile';
      } else if (userAgent.includes('Tablet') || userAgent.includes('iPad')) {
        deviceInfo.deviceType = 'tablet';
      } else {
        deviceInfo.deviceType = 'desktop';
      }

      // Browser detection
      if (userAgent.includes('Chrome')) {
        deviceInfo.browser = 'Chrome';
      } else if (userAgent.includes('Firefox')) {
        deviceInfo.browser = 'Firefox';
      } else if (userAgent.includes('Safari')) {
        deviceInfo.browser = 'Safari';
      } else if (userAgent.includes('Edge')) {
        deviceInfo.browser = 'Edge';
      }

      // OS detection
      if (userAgent.includes('Windows')) {
        deviceInfo.os = 'Windows';
      } else if (userAgent.includes('Mac OS')) {
        deviceInfo.os = 'macOS';
      } else if (userAgent.includes('Linux')) {
        deviceInfo.os = 'Linux';
      } else if (userAgent.includes('Android')) {
        deviceInfo.os = 'Android';
      } else if (userAgent.includes('iOS')) {
        deviceInfo.os = 'iOS';
      }
    }

    return deviceInfo;
  }

  /**
   * Create a new user session
   */
  async createSession(
    userId: string,
    refreshTokenId: string,
    deviceInfo: DeviceInfo,
  ): Promise<void> {
    // Check if prisma is properly injected
    if (!this.prisma) {
      throw new Error('Database service not available');
    }

    // Check if prisma is connected
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (error) {
      this.logger.warn('Failed to check database connection', error, {
        source: 'sessions',
      });
      throw new Error('Database connection failed');
    }

    // Check if userSession table exists
    try {
      await this.prisma.userSession.findFirst();
    } catch (error) {
      this.logger.warn('Failed to find user session', error, {
        source: 'sessions',
        userId,
      });
      throw new Error(
        'Database table userSession not found. Please run database migrations.',
      );
    }

    // Mark all existing sessions as not current
    await this.prisma.userSession.updateMany({
      where: { userId },
      data: { isCurrent: false },
    });

    // Create new session
    const sessionData: Prisma.UserSessionCreateInput = {
      user: { connect: { id: userId } },
      refreshTokenId,
      deviceFingerprint: deviceInfo.deviceFingerprint,
      userAgent: deviceInfo.userAgent,
      ipAddress: deviceInfo.ipAddress,
      location: deviceInfo.location,
      deviceType: deviceInfo.deviceType,
      browser: deviceInfo.browser,
      os: deviceInfo.os,
      isCurrent: true,
    };

    await this.prisma.userSession.create({
      data: sessionData,
    });
  }

  /**
   * Update session activity
   */
  async updateSessionActivity(sessionId: string): Promise<void> {
    const whereClause: Prisma.UserSessionWhereUniqueInput = { id: sessionId };
    const updateData: Prisma.UserSessionUpdateInput = {
      lastActiveAt: new Date(),
    };

    await this.prisma.userSession.update({
      where: whereClause,
      data: updateData,
    });
  }

  /**
   * List user sessions with cursor pagination
   */
  async listSessions(
    userId: string,
    query: SessionListDto,
  ): Promise<{
    sessions: {
      id: string;
      deviceFingerprint?: string;
      userAgent?: string;
      ipAddress?: string;
      location?: string;
      deviceType?: string;
      browser?: string;
      os?: string;
      isCurrent: boolean;
      lastActiveAt: string; // ISO date string for API responses
      createdAt: string; // ISO date string for API responses
    }[];
    nextCursor?: string;
    hasMore: boolean;
  }> {
    const { cursor, limit } = query;

    const where: Prisma.UserSessionWhereInput = { userId };
    const take = (limit as number) + 1; // Take one extra to check if there are more

    const sessions = await this.prisma.userSession.findMany({
      where,
      take,
      cursor: cursor ? { id: cursor as string } : undefined,
      orderBy: { lastActiveAt: 'desc' },
      select: {
        id: true,
        deviceFingerprint: true,
        userAgent: true,
        ipAddress: true,
        location: true,
        deviceType: true,
        browser: true,
        os: true,
        isCurrent: true,
        lastActiveAt: true,
        createdAt: true,
      },
    });

    const hasMore = sessions.length > (limit as number);
    const sessionsToReturn = hasMore
      ? sessions.slice(0, limit as number)
      : sessions;
    const nextCursor = hasMore
      ? sessionsToReturn[sessionsToReturn.length - 1].id
      : undefined;

    const mappedSessions = sessionsToReturn.map((s) => ({
      id: s.id,
      deviceFingerprint: nullToUndefined(s.deviceFingerprint),
      userAgent: nullToUndefined(s.userAgent),
      ipAddress: nullToUndefined(s.ipAddress),
      location: nullToUndefined(s.location),
      deviceType: nullToUndefined(s.deviceType),
      browser: nullToUndefined(s.browser),
      os: nullToUndefined(s.os),
      isCurrent: s.isCurrent,
      lastActiveAt: s.lastActiveAt.toISOString(),
      createdAt: s.createdAt.toISOString(),
    }));

    return {
      sessions: mappedSessions,
      nextCursor,
      hasMore,
    };
  }

  /**
   * Delete a specific session
   */
  async deleteSession(userId: string, sessionId: string): Promise<void> {
    const whereClause: Prisma.UserSessionWhereInput = { id: sessionId, userId };
    const session = await this.prisma.userSession.findFirst({
      where: whereClause,
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // If deleting current session, don't allow it
    if (session.isCurrent) {
      throw new ForbiddenException('Cannot delete current session');
    }

    // Mark the refresh session as inactive
    const refreshSessionWhere: Prisma.RefreshSessionWhereUniqueInput = {
      tokenId: session.refreshTokenId,
    };
    const refreshSessionData: Prisma.RefreshSessionUpdateInput = {
      isActive: false,
    };
    await this.prisma.refreshSession.update({
      where: refreshSessionWhere,
      data: refreshSessionData,
    });

    // Delete the user session
    const deleteWhere: Prisma.UserSessionWhereUniqueInput = { id: sessionId };
    await this.prisma.userSession.delete({
      where: deleteWhere,
    });
  }

  /**
   * Revoke all sessions except current
   */
  async revokeAllSessions(
    userId: string,
    keepCurrent: boolean = true,
  ): Promise<{ revokedCount: number }> {
    const where: Prisma.UserSessionWhereInput = { userId };

    if (keepCurrent) {
      where.isCurrent = false;
    }

    // Get sessions to revoke
    const sessionsToRevoke = await this.prisma.userSession.findMany({
      where,
      select: { refreshTokenId: true },
    });

    if (sessionsToRevoke.length === 0) {
      return { revokedCount: 0 };
    }

    // Mark refresh sessions as inactive
    const refreshTokenIds = sessionsToRevoke.map((s) => s.refreshTokenId);
    await this.prisma.refreshSession.updateMany({
      where: { tokenId: { in: refreshTokenIds } },
      data: { isActive: false },
    });

    // Delete user sessions
    await this.prisma.userSession.deleteMany({ where });

    return { revokedCount: sessionsToRevoke.length };
  }

  /**
   * Get session by refresh token ID
   */
  async getSessionByRefreshToken(
    refreshTokenId: string,
  ): Promise<SessionInfo | null> {
    const whereClause: Prisma.UserSessionWhereUniqueInput = { refreshTokenId };
    const selectClause: Prisma.UserSessionSelect = {
      id: true,
      deviceFingerprint: true,
      userAgent: true,
      ipAddress: true,
      location: true,
      deviceType: true,
      browser: true,
      os: true,
      isCurrent: true,
      lastActiveAt: true,
      createdAt: true,
    };

    const session = await this.prisma.userSession.findUnique({
      where: whereClause,
      select: selectClause,
    });

    if (!session) {
      return null;
    }

    const sessionInfo: SessionInfo = {
      id: session.id,
      deviceFingerprint: nullToUndefined(session.deviceFingerprint),
      userAgent: nullToUndefined(session.userAgent),
      ipAddress: nullToUndefined(session.ipAddress),
      location: nullToUndefined(session.location),
      deviceType: nullToUndefined(session.deviceType),
      browser: nullToUndefined(session.browser),
      os: nullToUndefined(session.os),
      isCurrent: session.isCurrent,
      lastActiveAt: session.lastActiveAt,
      createdAt: session.createdAt,
    };

    return sessionInfo;
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<{ cleanedCount: number }> {
    // Find expired refresh sessions
    const expiredWhere: Prisma.RefreshSessionWhereInput = {
      expiresAt: { lt: new Date() },
      isActive: true,
    };
    const expiredSelect: Prisma.RefreshSessionSelect = { tokenId: true };

    const expiredSessions = await this.prisma.refreshSession.findMany({
      where: expiredWhere,
      select: expiredSelect,
    });

    if (expiredSessions.length === 0) {
      return { cleanedCount: 0 };
    }

    const refreshTokenIds = expiredSessions.map((s) => s.tokenId);

    // Mark refresh sessions as inactive
    const updateWhere: Prisma.RefreshSessionWhereInput = {
      tokenId: { in: refreshTokenIds },
    };
    const updateData: Prisma.RefreshSessionUpdateManyMutationInput = {
      isActive: false,
    };
    await this.prisma.refreshSession.updateMany({
      where: updateWhere,
      data: updateData,
    });

    // Delete corresponding user sessions
    const deleteWhere: Prisma.UserSessionWhereInput = {
      refreshTokenId: { in: refreshTokenIds },
    };
    await this.prisma.userSession.deleteMany({
      where: deleteWhere,
    });

    return { cleanedCount: expiredSessions.length };
  }

  /**
   * Revoke all sessions for a specific token family (security incident response)
   */
  async revokeTokenFamily(familyId: string): Promise<{ revokedCount: number }> {
    const result = await this.prisma.$transaction(async (tx) => {
      // Revoke all refresh sessions in the family
      const refreshWhere: Prisma.RefreshSessionWhereInput = {
        familyId,
        isActive: true,
      };
      const refreshData: Prisma.RefreshSessionUpdateManyMutationInput = {
        isActive: false,
      };
      const revokedSessions = await tx.refreshSession.updateMany({
        where: refreshWhere,
        data: refreshData,
      });

      // Update user sessions to mark them as inactive
      const tokenWhere: Prisma.RefreshSessionWhereInput = { familyId };
      const tokenSelect: Prisma.RefreshSessionSelect = { tokenId: true };
      const tokenIds = await tx.refreshSession
        .findMany({
          where: tokenWhere,
          select: tokenSelect,
        })
        .then((sessions) => sessions.map((s) => s.tokenId));

      const userSessionWhere: Prisma.UserSessionWhereInput = {
        refreshTokenId: { in: tokenIds },
      };
      const userSessionData: Prisma.UserSessionUpdateManyMutationInput = {
        isCurrent: false,
      };
      await tx.userSession.updateMany({
        where: userSessionWhere,
        data: userSessionData,
      });

      return {
        revokedCount: revokedSessions.count,
      };
    });

    return result;
  }

  /**
   * Revoke all sessions for a specific user (admin security action)
   */
  async revokeAllUserSessions(
    userId: string,
    reason?: string,
  ): Promise<{ revokedCount: number }> {
    const result = await this.prisma.$transaction(async (tx) => {
      // Revoke all refresh sessions for the user
      const refreshWhere: Prisma.RefreshSessionWhereInput = {
        userId,
        isActive: true,
      };
      const refreshData: Prisma.RefreshSessionUpdateManyMutationInput = {
        isActive: false,
      };
      const revokedSessions = await tx.refreshSession.updateMany({
        where: refreshWhere,
        data: refreshData,
      });

      // Update user sessions to mark them as inactive
      const userSessionWhere: Prisma.UserSessionWhereInput = { userId };
      const userSessionData: Prisma.UserSessionUpdateManyMutationInput = {
        isCurrent: false,
      };
      await tx.userSession.updateMany({
        where: userSessionWhere,
        data: userSessionData,
      });

      // Create security notification for the user
      const notificationData: Prisma.NotificationCreateInput = {
        user: { connect: { id: userId } },
        type: 'security_alert',
        title: 'All Sessions Revoked',
        message:
          reason ||
          'All your active sessions have been revoked for security reasons. Please log in again.',
        priority: 'high',
        metadata: {
          reason,
          revokedAt: new Date().toISOString(),
          sessionCount: revokedSessions.count,
        },
      };
      await tx.notification.create({
        data: notificationData,
      });

      return {
        revokedCount: revokedSessions.count,
      };
    });

    return result;
  }

  /**
   * Revoke sessions by user ID list (bulk admin action)
   */
  async revokeSessionsByUserIds(
    userIds: string[],
    reason?: string,
  ): Promise<{ [userId: string]: number }> {
    const results: { [userId: string]: number } = {};

    for (const userId of userIds) {
      try {
        const result = await this.revokeAllUserSessions(userId, reason);
        results[userId] = result.revokedCount;
      } catch (error) {
        this.logger.warn('Failed to revoke sessions for user', error, {
          source: 'sessions',
          userId,
        });
        results[userId] = 0;
      }
    }

    return results;
  }

  /**
   * Get security audit information for a user
   */
  async getSecurityAuditInfo(userId: string): Promise<{
    activeSessions: number;
    totalSessions: number;
    lastLogin: Date | null;
    suspiciousActivity: boolean;
  }> {
    const activeWhere: Prisma.RefreshSessionWhereInput = {
      userId,
      isActive: true,
    };
    const totalWhere: Prisma.RefreshSessionWhereInput = { userId };
    const lastLoginWhere: Prisma.UserSessionWhereInput = { userId };
    const lastLoginOrderBy: Prisma.UserSessionOrderByWithRelationInput = {
      lastActiveAt: 'desc',
    };
    const lastLoginSelect: Prisma.UserSessionSelect = {
      lastActiveAt: true,
    };

    const [activeSessions, totalSessions, lastLogin] = await Promise.all([
      this.prisma.refreshSession.count({
        where: activeWhere,
      }),
      this.prisma.refreshSession.count({
        where: totalWhere,
      }),
      this.prisma.userSession.findFirst({
        where: lastLoginWhere,
        orderBy: lastLoginOrderBy,
        select: lastLoginSelect,
      }),
    ]);

    // Simple suspicious activity detection
    const suspiciousActivity = activeSessions > 10; // More than 10 active sessions

    return {
      activeSessions,
      totalSessions,
      lastLogin: lastLogin?.lastActiveAt || null,
      suspiciousActivity,
    };
  }
}
