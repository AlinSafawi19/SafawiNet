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
import {
  Role,
  LoyaltyAccount,
  LoyaltyTransaction,
  Notification,
  LoyaltyTier,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../common/services/prisma.service';
import { NotificationsService } from './notifications.service';
import { AuthenticatedRequest } from './types/auth.types';

// Type definitions for user preferences and notification preferences
interface UserPreferences {
  theme: 'light' | 'dark';
  language: string;
  timezone: string;
  dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
  timeFormat: '12h' | '24h';
  notifications: {
    sound: boolean;
    desktop: boolean;
  };
  [key: string]: unknown; // Index signature for Prisma JSON compatibility
}

interface UserNotificationPreferences {
  email: {
    marketing: boolean;
    security: boolean;
    updates: boolean;
    weeklyDigest: boolean;
  };
  push: {
    enabled: boolean;
    marketing: boolean;
    security: boolean;
    updates: boolean;
  };
  sms: {
    enabled: boolean;
    security: boolean;
    twoFactor: boolean;
  };
  [key: string]: unknown; // Index signature for Prisma JSON compatibility
}

// Type definitions for customer controller
interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  roles: Role[];
  isVerified: boolean;
  twoFactorEnabled: boolean;
  preferences: UserPreferences | null;
  notificationPreferences: UserNotificationPreferences | null;
  createdAt: Date;
  updatedAt: Date;
  loyaltyAccounts:
    | (LoyaltyAccount & {
        currentTier: LoyaltyTier;
      })
    | null;
}

interface UpdateProfileRequest {
  name?: string;
  preferences?: Partial<UserPreferences>;
  notificationPreferences?: Partial<UserNotificationPreferences>;
}

interface UpdateProfileResponse {
  id: string;
  email: string;
  name: string | null;
  preferences: UserPreferences | null;
  notificationPreferences: UserNotificationPreferences | null;
  updatedAt: Date;
}

interface LoyaltyAccountWithTier extends LoyaltyAccount {
  currentTier: LoyaltyTier;
  transactions: LoyaltyTransaction[];
}

interface LoyaltyTransactionsRequest {
  page?: number;
  limit?: number;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface LoyaltyTransactionsResponse {
  transactions: LoyaltyTransaction[];
  pagination: PaginationInfo;
}

interface SupportTicketRequest {
  subject: string;
  message: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  category: string;
}

interface SupportTicketResponse {
  message: string;
  ticketId: string;
}

interface SecurityStatusResponse {
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  currentSession: SelectedUserSession | null;
  otherSessions: SelectedUserSession[];
  securityScore: number;
}

interface AccountActivityRequest {
  page?: number;
  limit?: number;
}

interface AccountActivityResponse {
  notifications: Notification[];
  pagination: PaginationInfo;
}

interface MarkNotificationReadRequest {
  id: string;
}

interface SelectedUserSession {
  id: string;
  deviceType: string | null;
  browser: string | null;
  os: string | null;
  ipAddress: string | null;
  location: string | null;
  isCurrent: boolean;
  lastActiveAt: Date;
  createdAt: Date;
}

interface SecurityUser {
  isVerified: boolean;
  twoFactorEnabled: boolean;
  userSessions: SelectedUserSession[];
}

@Controller('customer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CUSTOMER)
export class CustomerController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // Profile Management
  @Get('profile')
  async getProfile(
    @Request() req: AuthenticatedRequest,
  ): Promise<UserProfile | null> {
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

    if (!user) {
      return null;
    }

    return {
      ...user,
      preferences: user.preferences as UserPreferences | null,
      notificationPreferences:
        user.notificationPreferences as UserNotificationPreferences | null,
    };
  }

  @Put('profile')
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @Request() req: AuthenticatedRequest,
    @Body() body: UpdateProfileRequest,
  ): Promise<UpdateProfileResponse> {
    const { name, preferences, notificationPreferences } = body;

    const updatedUser = await this.prisma.user.update({
      where: { id: req.user.sub },
      data: {
        ...(name && { name }),
        ...(preferences && {
          preferences: preferences as Prisma.InputJsonValue,
        }),
        ...(notificationPreferences && {
          notificationPreferences:
            notificationPreferences as Prisma.InputJsonValue,
        }),
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

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      preferences: updatedUser.preferences as UserPreferences | null,
      notificationPreferences:
        updatedUser.notificationPreferences as UserNotificationPreferences | null,
      updatedAt: updatedUser.updatedAt,
    };
  }

  // Loyalty Account
  @Get('loyalty')
  async getLoyaltyAccount(
    @Request() req: AuthenticatedRequest,
  ): Promise<LoyaltyAccountWithTier | { error: string }> {
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
    @Request() req: AuthenticatedRequest,
    @Body() body: LoyaltyTransactionsRequest,
  ): Promise<LoyaltyTransactionsResponse | { error: string }> {
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
    @Request() req: AuthenticatedRequest,
    @Body() body: SupportTicketRequest,
  ): Promise<SupportTicketResponse> {
    // This is a placeholder for future support ticket implementation
    // For now, we'll create a notification for the customer

    await this.notificationsService.createNotification({
      userId: req.user.sub,
      type: 'system_message',
      title: 'Support Ticket Created',
      message: `Your support ticket "${body.subject}" has been created and is being reviewed.`,
      metadata: {
        priority: body.priority,
        category: body.category,
        ticketId: `TICKET-${Date.now()}`,
      },
    });

    return {
      message: 'Support ticket created successfully',
      ticketId: `TICKET-${Date.now()}`,
    };
  }

  // Account Security
  @Get('security/status')
  async getSecurityStatus(
    @Request() req: AuthenticatedRequest,
  ): Promise<SecurityStatusResponse> {
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

    const activeSessions = user.userSessions.filter(
      (session) => session.isCurrent,
    );
    const otherSessions = user.userSessions.filter(
      (session) => !session.isCurrent,
    );

    return {
      emailVerified: user.isVerified,
      twoFactorEnabled: user.twoFactorEnabled,
      currentSession: activeSessions[0] || null,
      otherSessions,
      securityScore: this.calculateSecurityScore(user),
    };
  }

  private calculateSecurityScore(user: SecurityUser): number {
    let score = 0;

    if (user.isVerified) score += 25;
    if (user.twoFactorEnabled) score += 50;
    if (user.userSessions.length <= 3) score += 25; // Fewer sessions = better security

    return Math.min(score, 100);
  }

  // Account Activity
  @Get('activity')
  async getAccountActivity(
    @Request() req: AuthenticatedRequest,
    @Body() body: AccountActivityRequest,
  ): Promise<AccountActivityResponse> {
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
    @Request() req: AuthenticatedRequest,
    @Body() body: MarkNotificationReadRequest,
  ): Promise<Notification> {
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
