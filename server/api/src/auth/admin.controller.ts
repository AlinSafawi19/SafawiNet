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
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard, Roles } from './guards/roles.guard';
import { Role } from '@prisma/client';
import { PrismaService } from '../common/services/prisma.service';
import { EmailMonitoringService } from '../common/services/email-monitoring.service';
import { PinoLoggerService } from '../common/services/logger.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailMonitoring: EmailMonitoringService,
    private readonly logger: PinoLoggerService,
  ) {}

  // User Management
  @Get('users')
  async getAllUsers(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('search') search?: string,
    @Query('role') role?: Role,
  ) {
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    
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
  async getUserById(@Param('id') id: string) {
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
    @Body() body: { roles: Role[] },
    @Request() req: any,
  ) {
    const { roles } = body;
    
    // Prevent admin from removing their own admin role
    if (req.user.id === id && !roles.includes(Role.ADMIN)) {
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

    this.logger.log(`Admin ${req.user.email} updated roles for user ${updatedUser.email} to: ${roles.join(', ')}`);

    return updatedUser;
  }

  @Delete('users/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteUser(@Param('id') id: string, @Request() req: any) {
    // Prevent admin from deleting themselves
    if (req.user.id === id) {
      throw new Error('Cannot delete your own account');
    }

    await this.prisma.user.delete({ where: { id } });
    
    this.logger.log(`Admin ${req.user.email} deleted user ${id}`);
  }

  // System Monitoring
  @Get('system/stats')
  async getSystemStats() {
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
  async getEmailMonitoringStats() {
    return this.emailMonitoring.getEmailMetrics();
  }

  // Session Management
  @Get('sessions')
  async getAllSessions(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('userId') userId?: string,
  ) {
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
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
  async revokeSession(@Param('sessionId') sessionId: string, @Request() req: any) {
    await this.prisma.userSession.delete({ where: { id: sessionId } });
    
    this.logger.log(`Admin ${req.user.email} revoked session ${sessionId}`);
  }

  // Notification Management
  @Post('notifications/broadcast')
  async broadcastNotification(
    @Body() body: {
      title: string;
      message: string;
      type: string;
      priority: string;
      targetRoles?: Role[];
    },
    @Request() req: any,
  ) {
    const { title, message, type, priority, targetRoles } = body;

    const where: any = {};
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

    this.logger.log(`Admin ${req.user.email} broadcasted notification to ${users.length} users`);

    return {
      message: `Notification broadcasted to ${users.length} users`,
      count: users.length,
    };
  }
}
