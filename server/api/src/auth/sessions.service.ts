import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { SessionListDto, SessionDeleteDto, SessionRevokeAllDto } from './schemas/auth.schemas';

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

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Extract device information from request
   */
  extractDeviceInfo(req: Request): DeviceInfo {
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    
    // Parse user agent to extract device info
    const deviceInfo: DeviceInfo = {
      userAgent,
      ipAddress: typeof ipAddress === 'string' ? ipAddress : undefined,
    };

    if (userAgent) {
      // Simple device type detection
      if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')) {
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
    try {
      // Check if prisma is properly injected
      if (!this.prisma) {
        this.logger.error('PrismaService is not properly injected');
        throw new Error('Database service not available');
      }

      // Check if prisma is connected
      try {
        await this.prisma.$queryRaw`SELECT 1`;
      } catch (dbError) {
        this.logger.error('Database connection failed:', dbError);
        throw new Error('Database connection failed');
      }

      // Check if userSession table exists
      try {
        await this.prisma.userSession.findFirst();
      } catch (tableError) {
        this.logger.error('userSession table does not exist or is not accessible:', tableError);
        throw new Error('Database table userSession not found. Please run database migrations.');
      }

      // Mark all existing sessions as not current
      await this.prisma.userSession.updateMany({
        where: { userId },
        data: { isCurrent: false },
      });

      // Create new session
      await this.prisma.userSession.create({
        data: {
          userId,
          refreshTokenId,
          deviceFingerprint: deviceInfo.deviceFingerprint,
          userAgent: deviceInfo.userAgent,
          ipAddress: deviceInfo.ipAddress,
          location: deviceInfo.location,
          deviceType: deviceInfo.deviceType,
          browser: deviceInfo.browser,
          os: deviceInfo.os,
          isCurrent: true,
        },
      });

      this.logger.log(`Created new session for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to create session for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Update session activity
   */
  async updateSessionActivity(sessionId: string): Promise<void> {
    await this.prisma.userSession.update({
      where: { id: sessionId },
      data: { lastActiveAt: new Date() },
    });
  }

  /**
   * List user sessions with cursor pagination
   */
  async listSessions(
    userId: string,
    query: SessionListDto,
  ): Promise<PaginatedSessions> {
    const { cursor, limit } = query;

    const where = { userId };
    const take = limit + 1; // Take one extra to check if there are more

    const sessions = await this.prisma.userSession.findMany({
      where,
      take,
      cursor: cursor ? { id: cursor } : undefined,
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

    const hasMore = sessions.length > limit;
    const sessionsToReturn = hasMore ? sessions.slice(0, limit) : sessions;
    const nextCursor = hasMore ? sessionsToReturn[sessionsToReturn.length - 1].id : undefined;

    const mappedSessions: SessionInfo[] = sessionsToReturn.map(s => ({
      id: s.id,
      deviceFingerprint: nullToUndefined(s.deviceFingerprint),
      userAgent: nullToUndefined(s.userAgent),
      ipAddress: nullToUndefined(s.ipAddress),
      location: nullToUndefined(s.location),
      deviceType: nullToUndefined(s.deviceType),
      browser: nullToUndefined(s.browser),
      os: nullToUndefined(s.os),
      isCurrent: s.isCurrent,
      lastActiveAt: s.lastActiveAt,
      createdAt: s.createdAt,
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
    const session = await this.prisma.userSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // If deleting current session, don't allow it
    if (session.isCurrent) {
      throw new ForbiddenException('Cannot delete current session');
    }

    // Mark the refresh session as inactive
    await this.prisma.refreshSession.update({
      where: { tokenId: session.refreshTokenId },
      data: { isActive: false },
    });

    // Delete the user session
    await this.prisma.userSession.delete({
      where: { id: sessionId },
    });

    this.logger.log(`Deleted session ${sessionId} for user ${userId}`);
  }

  /**
   * Revoke all sessions except current
   */
  async revokeAllSessions(
    userId: string,
    keepCurrent: boolean = true,
  ): Promise<{ revokedCount: number }> {
    const where: any = { userId };
    
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
    const refreshTokenIds = sessionsToRevoke.map(s => s.refreshTokenId);
    await this.prisma.refreshSession.updateMany({
      where: { tokenId: { in: refreshTokenIds } },
      data: { isActive: false },
    });

    // Delete user sessions
    await this.prisma.userSession.deleteMany({ where });

    this.logger.log(`Revoked ${sessionsToRevoke.length} sessions for user ${userId}`);

    return { revokedCount: sessionsToRevoke.length };
  }

  /**
   * Get session by refresh token ID
   */
  async getSessionByRefreshToken(refreshTokenId: string): Promise<SessionInfo | null> {
    const session = await this.prisma.userSession.findUnique({
      where: { refreshTokenId },
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
    const expiredSessions = await this.prisma.refreshSession.findMany({
      where: {
        expiresAt: { lt: new Date() },
        isActive: true,
      },
      select: { tokenId: true },
    });

    if (expiredSessions.length === 0) {
      return { cleanedCount: 0 };
    }

    const refreshTokenIds = expiredSessions.map(s => s.tokenId);

    // Mark refresh sessions as inactive
    await this.prisma.refreshSession.updateMany({
      where: { tokenId: { in: refreshTokenIds } },
      data: { isActive: false },
    });

    // Delete corresponding user sessions
    await this.prisma.userSession.deleteMany({
      where: { refreshTokenId: { in: refreshTokenIds } },
    });

    this.logger.log(`Cleaned up ${expiredSessions.length} expired sessions`);

    return { cleanedCount: expiredSessions.length };
  }

  /**
   * Revoke all sessions for a specific token family (security incident response)
   */
  async revokeTokenFamily(familyId: string): Promise<{ revokedCount: number }> {
    const result = await this.prisma.$transaction(async (tx) => {
      // Revoke all refresh sessions in the family
      const revokedSessions = await tx.refreshSession.updateMany({
        where: { familyId, isActive: true },
        data: { isActive: false },
      });

      // Update user sessions to mark them as inactive
      const revokedUserSessions = await tx.userSession.updateMany({
        where: {
          refreshTokenId: {
            in: await tx.refreshSession.findMany({
              where: { familyId },
              select: { tokenId: true },
            }).then(sessions => sessions.map(s => s.tokenId)),
          },
        },
        data: { isCurrent: false },
      });

      return {
        revokedCount: revokedSessions.count,
      };
    });

    this.logger.warn(`Revoked token family ${familyId}: ${result.revokedCount} sessions`);
    return result;
  }

  /**
   * Revoke all sessions for a specific user (admin security action)
   */
  async revokeAllUserSessions(userId: string, reason?: string): Promise<{ revokedCount: number }> {
    const result = await this.prisma.$transaction(async (tx) => {
      // Revoke all refresh sessions for the user
      const revokedSessions = await tx.refreshSession.updateMany({
        where: { userId, isActive: true },
        data: { isActive: false },
      });

      // Update user sessions to mark them as inactive
      const revokedUserSessions = await tx.userSession.updateMany({
        where: { userId },
        data: { isCurrent: false },
      });

      // Create security notification for the user
      await tx.notification.create({
        data: {
          userId,
          type: 'security_alert',
          title: 'All Sessions Revoked',
          message: reason || 'All your active sessions have been revoked for security reasons. Please log in again.',
          priority: 'high',
          metadata: {
            reason,
            revokedAt: new Date().toISOString(),
            sessionCount: revokedSessions.count,
          },
        },
      });

      return {
        revokedCount: revokedSessions.count,
      };
    });

    this.logger.warn(`Revoked all sessions for user ${userId}: ${result.revokedCount} sessions. Reason: ${reason || 'No reason provided'}`);
    return result;
  }

  /**
   * Revoke sessions by user ID list (bulk admin action)
   */
  async revokeSessionsByUserIds(userIds: string[], reason?: string): Promise<{ [userId: string]: number }> {
    const results: { [userId: string]: number } = {};

    for (const userId of userIds) {
      try {
        const result = await this.revokeAllUserSessions(userId, reason);
        results[userId] = result.revokedCount;
      } catch (error) {
        this.logger.error(`Failed to revoke sessions for user ${userId}:`, error);
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
    const [activeSessions, totalSessions, lastLogin] = await Promise.all([
      this.prisma.refreshSession.count({
        where: { userId, isActive: true },
      }),
      this.prisma.refreshSession.count({
        where: { userId },
      }),
      this.prisma.userSession.findFirst({
        where: { userId },
        orderBy: { lastActiveAt: 'desc' },
        select: { lastActiveAt: true },
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
