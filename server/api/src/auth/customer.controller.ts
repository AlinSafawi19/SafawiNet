import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard, Roles } from './guards/roles.guard';
import { Role } from '@prisma/client';
import { PrismaService } from '../common/services/prisma.service';
import { PinoLoggerService } from '../common/services/logger.service';
import { NotificationsService } from './notifications.service';

@Controller('customer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CUSTOMER)
export class CustomerController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: PinoLoggerService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // Profile Management
  @Get('profile')
  async getProfile(@Request() req: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.sub },
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
        loyaltyAccounts: {
          include: {
            currentTier: true,
          },
        },
      },
    });

    return user;
  }

  @Put('profile')
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @Request() req: any,
    @Body() body: {
      name?: string;
      preferences?: any;
      notificationPreferences?: any;
    },
  ) {
    const { name, preferences, notificationPreferences } = body;

    const updatedUser = await this.prisma.user.update({
      where: { id: req.user.sub },
      data: {
        ...(name && { name }),
        ...(preferences && { preferences }),
        ...(notificationPreferences && { notificationPreferences }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        preferences: true,
        notificationPreferences: true,
        updatedAt: true,
      },
    });

    this.logger.log(`Customer ${req.user.email} updated their profile`);

    return updatedUser;
  }

  // Loyalty Account
  @Get('loyalty')
  async getLoyaltyAccount(@Request() req: any) {
    const loyaltyAccount = await this.prisma.loyaltyAccount.findUnique({
      where: { userId: req.user.sub },
      include: {
        currentTier: true,
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!loyaltyAccount) {
      return { error: 'Loyalty account not found' };
    }

    return loyaltyAccount;
  }

  @Get('loyalty/transactions')
  async getLoyaltyTransactions(
    @Request() req: any,
    @Body() body: { page?: number; limit?: number },
  ) {
    const { page = 1, limit = 20 } = body;
    const skip = (page - 1) * limit;

    const loyaltyAccount = await this.prisma.loyaltyAccount.findUnique({
      where: { userId: req.user.sub },
      select: { id: true },
    });

    if (!loyaltyAccount) {
      return { error: 'Loyalty account not found' };
    }

    const [transactions, total] = await Promise.all([
      this.prisma.loyaltyTransaction.findMany({
        where: { loyaltyAccountId: loyaltyAccount.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.loyaltyTransaction.count({
        where: { loyaltyAccountId: loyaltyAccount.id },
      }),
    ]);

    return {
      transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // Support Tickets (placeholder for future implementation)
  @Post('support/ticket')
  async createSupportTicket(
    @Request() req: any,
    @Body() body: {
      subject: string;
      message: string;
      priority: 'low' | 'normal' | 'high' | 'urgent';
      category: string;
    },
  ) {
    // This is a placeholder for future support ticket implementation
    // For now, we'll create a notification for the customer
    
    await this.notificationsService.createNotification({
      userId: req.user.sub,
      type: 'support_ticket_created',
      title: 'Support Ticket Created',
      message: `Your support ticket "${body.subject}" has been created and is being reviewed.`,
      metadata: {
        priority: body.priority,
        category: body.category,
        ticketId: `TICKET-${Date.now()}`,
      },
    });

    this.logger.log(`Customer ${req.user.email} created support ticket: ${body.subject}`);

    return {
      message: 'Support ticket created successfully',
      ticketId: `TICKET-${Date.now()}`,
    };
  }

  // Account Security
  @Get('security/status')
  async getSecurityStatus(@Request() req: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.sub },
      select: {
        isVerified: true,
        twoFactorEnabled: true,
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
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const activeSessions = user.userSessions.filter(session => session.isCurrent);
    const otherSessions = user.userSessions.filter(session => !session.isCurrent);

    return {
      emailVerified: user.isVerified,
      twoFactorEnabled: user.twoFactorEnabled,
      currentSession: activeSessions[0] || null,
      otherSessions,
      securityScore: this.calculateSecurityScore(user),
    };
  }

  private calculateSecurityScore(user: any): number {
    let score = 0;
    
    if (user.isVerified) score += 25;
    if (user.twoFactorEnabled) score += 50;
    if (user.userSessions.length <= 3) score += 25; // Fewer sessions = better security
    
    return Math.min(score, 100);
  }

  // Account Activity
  @Get('activity')
  async getAccountActivity(
    @Request() req: any,
    @Body() body: { page?: number; limit?: number },
  ) {
    const { page = 1, limit = 20 } = body;
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId: req.user.sub },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({
        where: { userId: req.user.sub },
      }),
    ]);

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  @Put('notifications/:id/read')
  @HttpCode(HttpStatus.OK)
  async markNotificationAsRead(
    @Request() req: any,
    @Body() body: { id: string },
  ) {
    const notification = await this.prisma.notification.update({
      where: {
        id: body.id,
        userId: req.user.sub,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return notification;
  }
}
