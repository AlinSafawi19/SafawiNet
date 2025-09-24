import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard, Roles } from './guards/roles.guard';
import { Role, EmailLog, Prisma } from '@prisma/client';
import { PrismaService } from '../common/services/prisma.service';
import {
  EmailMonitoringService,
  EmailMetrics,
} from '../common/services/email-monitoring.service';
import { AuthenticatedRequest } from './types/auth.types';

// Type definitions for admin controller
type UserWithCounts = Prisma.UserGetPayload<{
  select: {
    id: true;
    email: true;
    name: true;
    roles: true;
    isVerified: true;
    twoFactorEnabled: true;
    createdAt: true;
    updatedAt: true;
    _count: {
      select: {
        userSessions: true;
        notifications: true;
      };
    };
  };
}>;

type UserWithDetails = Prisma.UserGetPayload<{
  select: {
    id: true;
    email: true;
    name: true;
    roles: true;
    isVerified: true;
    twoFactorEnabled: true;
    preferences: true;
    notificationPreferences: true;
    createdAt: true;
    updatedAt: true;
    userSessions: {
      select: {
        id: true;
        deviceType: true;
        browser: true;
        os: true;
        ipAddress: true;
        location: true;
        isCurrent: true;
        lastActiveAt: true;
        createdAt: true;
      };
    };
    notifications: {
      select: {
        id: true;
        type: true;
        title: true;
        message: true;
        isRead: true;
        priority: true;
        createdAt: true;
      };
    };
    loyaltyAccounts: {
      include: {
        currentTier: true;
      };
    };
  };
}>;

type SessionWithUser = Prisma.UserSessionGetPayload<{
  include: {
    user: {
      select: {
        id: true;
        email: true;
        name: true;
      };
    };
  };
}>;

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface UsersResponse {
  users: UserWithCounts[];
  pagination: PaginationInfo;
}

interface SessionsResponse {
  sessions: SessionWithUser[];
  pagination: PaginationInfo;
}

interface SystemStatsResponse {
  users: {
    total: number;
    verified: number;
    with2FA: number;
    roleDistribution: Array<{ roles: Role[]; _count: number }>;
  };
  sessions: {
    active: number;
  };
  notifications: {
    total: number;
    unread: number;
  };
  emails: {
    totalLogs: number;
    recentLogs: EmailLog[];
  };
  loyalty: {
    totalAccounts: number;
  };
}

interface UpdateUserRolesBody {
  roles: Role[];
}

interface BroadcastNotificationBody {
  title: string;
  message: string;
  type: string;
  priority: string;
  targetRoles?: Role[];
}

interface BroadcastNotificationResponse {
  message: string;
  count: number;
}

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Throttle({ users: { limit: 100, ttl: 60000 } }) // 100 requests per minute for admin endpoints
export class AdminController {

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailMonitoring: EmailMonitoringService,
  ) {}

  // User Management
  @Get('users')
  async getAllUsers(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('search') search?: string,
    @Query('role') role?: Role,
  ): Promise<UsersResponse> {
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: Prisma.UserWhereInput = {};

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role) {
      where.roles = { has: role };
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          roles: true,
          isVerified: true,
          twoFactorEnabled: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              userSessions: true,
              notifications: true,
            },
          },
        },
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    };
  }

  @Get('users/:id')
  async getUserById(
    @Param('id') id: string,
  ): Promise<UserWithDetails | { error: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        roles: true,
        isVerified: true,
        twoFactorEnabled: true,
        preferences: true,
        notificationPreferences: true,
        createdAt: true,
        updatedAt: true,
        userSessions: {
          select: {
            id: true,
            deviceType: true,
            browser: true,
            os: true,
            ipAddress: true,
            location: true,
            isCurrent: true,
            lastActiveAt: true,
            createdAt: true,
          },
          orderBy: { lastActiveAt: 'desc' },
        },
        notifications: {
          select: {
            id: true,
            type: true,
            title: true,
            message: true,
            isRead: true,
            priority: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        loyaltyAccounts: {
          include: {
            currentTier: true,
          },
        },
      },
    });

    if (!user) {
      return { error: 'User not found' };
    }

    return user;
  }

  @Put('users/:id/roles')
  @HttpCode(HttpStatus.OK)
  async updateUserRoles(
    @Param('id') id: string,
    @Body() body: UpdateUserRolesBody,
    @Request() req: AuthenticatedRequest,
  ): Promise<{ id: string; email: string; roles: Role[]; updatedAt: Date }> {
    const { roles } = body;

    // Prevent admin from removing their own admin role
    if (req.user.sub === id && !roles.includes(Role.ADMIN)) {
      throw new Error('Cannot remove admin role from yourself');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { roles },
      select: {
        id: true,
        email: true,
        roles: true,
        updatedAt: true,
      },
    });

    return updatedUser;
  }

  @Delete('users/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteUser(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<void> {
    // Prevent admin from deleting themselves
    if (req.user.sub === id) {
      throw new Error('Cannot delete your own account');
    }

    await this.prisma.user.delete({ where: { id } });
  }

  // System Monitoring
  @Get('system/stats')
  async getSystemStats(): Promise<SystemStatsResponse> {
    const [
      totalUsers,
      verifiedUsers,
      usersWith2FA,
      activeSessions,
      totalNotifications,
      unreadNotifications,
      emailLogs,
      loyaltyAccounts,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isVerified: true } }),
      this.prisma.user.count({ where: { twoFactorEnabled: true } }),
      this.prisma.userSession.count({ where: { isCurrent: true } }),
      this.prisma.notification.count(),
      this.prisma.notification.count({ where: { isRead: false } }),
      this.prisma.emailLog.count(),
      this.prisma.loyaltyAccount.count(),
    ]);

    const roleDistribution = await this.prisma.user.groupBy({
      by: ['roles'],
      _count: true,
    });

    const recentEmailLogs = await this.prisma.emailLog.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return {
      users: {
        total: totalUsers,
        verified: verifiedUsers,
        with2FA: usersWith2FA,
        roleDistribution,
      },
      sessions: {
        active: activeSessions,
      },
      notifications: {
        total: totalNotifications,
        unread: unreadNotifications,
      },
      emails: {
        totalLogs: emailLogs,
        recentLogs: recentEmailLogs,
      },
      loyalty: {
        totalAccounts: loyaltyAccounts,
      },
    };
  }

  @Get('system/email-monitoring')
  async getEmailMonitoringStats(): Promise<EmailMetrics> {
    return this.emailMonitoring.getEmailMetrics();
  }

  // Session Management
  @Get('sessions')
  async getAllSessions(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('userId') userId?: string,
  ): Promise<SessionsResponse> {
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: Prisma.UserSessionWhereInput = {};
    if (userId) {
      where.userId = userId;
    }

    const [sessions, total] = await Promise.all([
      this.prisma.userSession.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
        skip,
        take: limitNum,
        orderBy: { lastActiveAt: 'desc' },
      }),
      this.prisma.userSession.count({ where }),
    ]);

    return {
      sessions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    };
  }

  @Delete('sessions/:sessionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeSession(@Param('sessionId') sessionId: string): Promise<void> {
    await this.prisma.userSession.delete({ where: { id: sessionId } });
  }

  // Batch session management endpoints
  @Put('sessions/batch/update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Admin batch update sessions',
    description: 'Update multiple sessions across users (admin only)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        sessionIds: {
          type: 'array',
          items: { type: 'string' },
          minItems: 1,
          maxItems: 100,
        },
        updates: {
          type: 'object',
          properties: {
            isCurrent: { type: 'boolean' },
            lastActiveAt: { type: 'string', format: 'date-time' },
          },
        },
        reason: { type: 'string' },
      },
      required: ['sessionIds', 'updates'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Sessions updated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        processedCount: { type: 'number' },
        failedCount: { type: 'number' },
        updatedSessions: { type: 'array', items: { type: 'string' } },
        errors: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              sessionId: { type: 'string' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
  })
  async batchUpdateSessions(
    @Body()
    body: {
      sessionIds: string[];
      updates: {
        isCurrent?: boolean;
        lastActiveAt?: string;
      };
      reason?: string;
    },
  ): Promise<{
    success: boolean;
    processedCount: number;
    failedCount: number;
    updatedSessions: string[];
    errors: Array<{ sessionId: string; error: string }>;
  }> {
    const errors: Array<{ sessionId: string; error: string }> = [];
    const updatedSessions: string[] = [];
    let processedCount = 0;
    let failedCount = 0;

    try {
      // Get sessions to update with validation
      const sessionsToUpdate = await this.prisma.userSession.findMany({
        where: { id: { in: body.sessionIds } },
        select: { id: true, userId: true, isCurrent: true },
      });

      const existingSessionIds = new Set(sessionsToUpdate.map((s) => s.id));
      const invalidSessionIds = body.sessionIds.filter(
        (id) => !existingSessionIds.has(id),
      );

      // Add errors for invalid session IDs
      for (const sessionId of invalidSessionIds) {
        errors.push({
          sessionId,
          error: 'Session not found',
        });
        failedCount++;
      }

      // Filter out invalid sessions
      const validSessions = sessionsToUpdate;

      if (validSessions.length === 0) {
        return {
          success: false,
          processedCount: 0,
          failedCount,
          updatedSessions: [],
          errors,
        };
      }

      // Group sessions by user for proper isCurrent handling
      const sessionsByUser = new Map<string, string[]>();
      for (const session of validSessions) {
        if (!sessionsByUser.has(session.userId)) {
          sessionsByUser.set(session.userId, []);
        }
        sessionsByUser.get(session.userId)!.push(session.id);
      }

      // Prepare update data
      const updateData: any = {};

      if (body.updates.isCurrent !== undefined) {
        updateData.isCurrent = body.updates.isCurrent;

        // If setting sessions as current, first mark all other sessions as not current for each user
        if (body.updates.isCurrent) {
          for (const [userId] of sessionsByUser) {
            await this.prisma.userSession.updateMany({
              where: { userId, isCurrent: true },
              data: { isCurrent: false },
            });
          }
        }
      }

      if (body.updates.lastActiveAt !== undefined) {
        updateData.lastActiveAt = new Date(body.updates.lastActiveAt);
      }

      // Perform batch update
      const result = await this.prisma.userSession.updateMany({
        where: { id: { in: validSessions.map((s) => s.id) } },
        data: updateData,
      });

      processedCount = result.count;
      updatedSessions.push(...validSessions.map((s) => s.id));

      return {
        success: true,
        processedCount,
        failedCount,
        updatedSessions,
        errors,
      };
    } catch (error) {
      console.error('Failed to batch update sessions (admin)', error, {
        sessionIds: body.sessionIds,
        reason: body.reason,
        source: 'admin-sessions',
      });

      // Mark all sessions as failed
      for (const sessionId of body.sessionIds) {
        errors.push({
          sessionId,
          error: 'Internal server error during batch update',
        });
        failedCount++;
      }

      return {
        success: false,
        processedCount: 0,
        failedCount,
        updatedSessions: [],
        errors,
      };
    }
  }

  @Post('sessions/batch/delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Admin batch delete sessions',
    description: 'Delete multiple sessions across users (admin only)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        sessionIds: {
          type: 'array',
          items: { type: 'string' },
          minItems: 1,
          maxItems: 100,
        },
        reason: { type: 'string' },
      },
      required: ['sessionIds'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Sessions deleted successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        processedCount: { type: 'number' },
        failedCount: { type: 'number' },
        deletedSessions: { type: 'array', items: { type: 'string' } },
        errors: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              sessionId: { type: 'string' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
  })
  async batchDeleteSessions(
    @Body() body: { sessionIds: string[]; reason?: string },
  ): Promise<{
    success: boolean;
    processedCount: number;
    failedCount: number;
    deletedSessions: string[];
    errors: Array<{ sessionId: string; error: string }>;
  }> {
    const errors: Array<{ sessionId: string; error: string }> = [];
    const deletedSessions: string[] = [];
    let processedCount = 0;
    let failedCount = 0;

    try {
      // Get sessions to delete with validation
      const sessionsToDelete = await this.prisma.userSession.findMany({
        where: { id: { in: body.sessionIds } },
        select: { id: true, refreshTokenId: true },
      });

      const existingSessionIds = new Set(sessionsToDelete.map((s) => s.id));
      const invalidSessionIds = body.sessionIds.filter(
        (id) => !existingSessionIds.has(id),
      );

      // Add errors for invalid session IDs
      for (const sessionId of invalidSessionIds) {
        errors.push({
          sessionId,
          error: 'Session not found',
        });
        failedCount++;
      }

      // Filter out invalid sessions
      const validSessions = sessionsToDelete;

      if (validSessions.length === 0) {
        return {
          success: false,
          processedCount: 0,
          failedCount,
          deletedSessions: [],
          errors,
        };
      }

      const validSessionIds = validSessions.map((s) => s.id);
      const refreshTokenIds = validSessions.map((s) => s.refreshTokenId);

      // Mark refresh sessions as inactive
      await this.prisma.refreshSession.updateMany({
        where: { tokenId: { in: refreshTokenIds } },
        data: { isActive: false },
      });

      // Delete user sessions
      const result = await this.prisma.userSession.deleteMany({
        where: { id: { in: validSessionIds } },
      });

      processedCount = result.count;
      deletedSessions.push(...validSessionIds);

      return {
        success: true,
        processedCount,
        failedCount,
        deletedSessions,
        errors,
      };
    } catch (error) {
      console.error('Failed to batch delete sessions (admin)', error, {
        sessionIds: body.sessionIds,
        reason: body.reason,
        source: 'admin-sessions',
      });

      // Mark all sessions as failed
      for (const sessionId of body.sessionIds) {
        errors.push({
          sessionId,
          error: 'Internal server error during batch delete',
        });
        failedCount++;
      }

      return {
        success: false,
        processedCount: 0,
        failedCount,
        deletedSessions: [],
        errors,
      };
    }
  }

  @Post('sessions/batch/revoke')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Admin batch revoke sessions',
    description: 'Revoke multiple sessions across users (admin only)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        sessionIds: {
          type: 'array',
          items: { type: 'string' },
          minItems: 1,
          maxItems: 100,
        },
        reason: { type: 'string' },
      },
      required: ['sessionIds'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Sessions revoked successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        processedCount: { type: 'number' },
        failedCount: { type: 'number' },
        revokedSessions: { type: 'array', items: { type: 'string' } },
        errors: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              sessionId: { type: 'string' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
  })
  async batchRevokeSessions(
    @Body() body: { sessionIds: string[]; reason?: string },
  ): Promise<{
    success: boolean;
    processedCount: number;
    failedCount: number;
    revokedSessions: string[];
    errors: Array<{ sessionId: string; error: string }>;
  }> {
    const errors: Array<{ sessionId: string; error: string }> = [];
    const revokedSessions: string[] = [];
    let processedCount = 0;
    let failedCount = 0;

    try {
      // Get sessions to revoke with validation
      const sessionsToRevoke = await this.prisma.userSession.findMany({
        where: { id: { in: body.sessionIds } },
        select: { id: true, refreshTokenId: true },
      });

      const existingSessionIds = new Set(sessionsToRevoke.map((s) => s.id));
      const invalidSessionIds = body.sessionIds.filter(
        (id) => !existingSessionIds.has(id),
      );

      // Add errors for invalid session IDs
      for (const sessionId of invalidSessionIds) {
        errors.push({
          sessionId,
          error: 'Session not found',
        });
        failedCount++;
      }

      // Filter out invalid sessions
      const validSessions = sessionsToRevoke;

      if (validSessions.length === 0) {
        return {
          success: false,
          processedCount: 0,
          failedCount,
          revokedSessions: [],
          errors,
        };
      }

      const validSessionIds = validSessions.map((s) => s.id);
      const refreshTokenIds = validSessions.map((s) => s.refreshTokenId);

      // Mark refresh sessions as inactive
      await this.prisma.refreshSession.updateMany({
        where: { tokenId: { in: refreshTokenIds } },
        data: { isActive: false },
      });

      // Delete user sessions
      const result = await this.prisma.userSession.deleteMany({
        where: { id: { in: validSessionIds } },
      });

      processedCount = result.count;
      revokedSessions.push(...validSessionIds);

      return {
        success: true,
        processedCount,
        failedCount,
        revokedSessions,
        errors,
      };
    } catch (error) {
      console.error('Failed to batch revoke sessions (admin)', error, {
        sessionIds: body.sessionIds,
        reason: body.reason,
        source: 'admin-sessions',
      });

      // Mark all sessions as failed
      for (const sessionId of body.sessionIds) {
        errors.push({
          sessionId,
          error: 'Internal server error during batch revoke',
        });
        failedCount++;
      }

      return {
        success: false,
        processedCount: 0,
        failedCount,
        revokedSessions: [],
        errors,
      };
    }
  }

  // Notification Management
  @Post('notifications/broadcast')
  async broadcastNotification(
    @Body() body: BroadcastNotificationBody,
  ): Promise<BroadcastNotificationResponse> {
    const { title, message, type, priority, targetRoles } = body;

    const where: Prisma.UserWhereInput = {};
    if (targetRoles && targetRoles.length > 0) {
      where.roles = { hasSome: targetRoles };
    }

    const users = await this.prisma.user.findMany({
      where,
      select: { id: true },
    });

    const notifications = users.map((user) => ({
      userId: user.id,
      type,
      title,
      message,
      priority,
    }));

    await this.prisma.notification.createMany({
      data: notifications,
    });

    return {
      message: `Notification broadcasted to ${users.length} users`,
      count: users.length,
    };
  }
}
