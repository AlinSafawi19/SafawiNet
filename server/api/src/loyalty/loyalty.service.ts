import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';

export interface LoyaltyAccountInfo {
  id: string;
  currentTier: {
    id: string;
    name: string;
    minPoints: number;
    maxPoints: number | null;
    benefits: any;
    color: string | null;
    icon: string | null;
  };
  currentPoints: number;
  lifetimePoints: number;
  tierUpgradedAt: Date | null;
  nextTier?: {
    name: string;
    minPoints: number;
    pointsNeeded: number;
  } | null;
}

export interface LoyaltyTransaction {
  id: string;
  type: string;
  points: number;
  description: string;
  metadata: any;
  orderId: string | null;
  expiresAt: Date | null;
  createdAt: Date;
}

export interface PaginatedTransactions {
  transactions: LoyaltyTransaction[];
  pagination: {
    hasNext: boolean;
    hasPrevious: boolean;
    nextCursor: string | null;
    previousCursor: string | null;
  };
}

@Injectable()
export class LoyaltyService {
  constructor(private prisma: PrismaService) {}

  async getUserLoyaltyAccount(userId: string): Promise<LoyaltyAccountInfo> {
    let loyaltyAccount = await this.prisma.loyaltyAccount.findUnique({
      where: { userId },
      include: {
        currentTier: true,
      },
    });

    // If no loyalty account exists, create one automatically
    if (!loyaltyAccount) {
      loyaltyAccount = await this.createLoyaltyAccountForUser(userId);
    }

    // Find next tier if exists
    const nextTier = await this.prisma.loyaltyTier.findFirst({
      where: {
        minPoints: {
          gt: loyaltyAccount.currentPoints,
        },
      },
      orderBy: {
        minPoints: 'asc',
      },
    });

    const result: LoyaltyAccountInfo = {
      id: loyaltyAccount.id,
      currentTier: loyaltyAccount.currentTier,
      currentPoints: loyaltyAccount.currentPoints,
      lifetimePoints: loyaltyAccount.lifetimePoints,
      tierUpgradedAt: loyaltyAccount.tierUpgradedAt,
      nextTier: nextTier ? {
        name: nextTier.name,
        minPoints: nextTier.minPoints,
        pointsNeeded: nextTier.minPoints - loyaltyAccount.currentPoints,
      } : null,
    };

    return result;
  }

  private async createLoyaltyAccountForUser(userId: string) {
    // Find the Bronze tier (default tier for new customers)
    const bronzeTier = await this.prisma.loyaltyTier.findFirst({
      where: { name: 'Bronze' },
    });

    if (!bronzeTier) {
      throw new NotFoundException('Default loyalty tier not found');
    }

    // Create loyalty account
    const loyaltyAccount = await this.prisma.loyaltyAccount.create({
      data: {
        userId,
        currentTierId: bronzeTier.id,
        currentPoints: 0,
        lifetimePoints: 0,
        tierUpgradedAt: new Date(),
      },
      include: {
        currentTier: true,
      },
    });

    return loyaltyAccount;
  }

  async getUserTransactions(
    userId: string,
    cursor?: string,
    limit: number = 20,
  ): Promise<PaginatedTransactions> {
    const loyaltyAccount = await this.prisma.loyaltyAccount.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!loyaltyAccount) {
      throw new NotFoundException('Loyalty account not found');
    }

    const take = Math.min(limit, 100); // Cap at 100 items per page

    const transactions = await this.prisma.loyaltyTransaction.findMany({
      where: {
        loyaltyAccountId: loyaltyAccount.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: take + 1, // Take one extra to check if there's a next page
      ...(cursor && {
        cursor: {
          id: cursor,
        },
        skip: 1, // Skip the cursor item
      }),
    });

    const hasNext = transactions.length > take;
    const actualTransactions = hasNext ? transactions.slice(0, take) : transactions;

    const result: PaginatedTransactions = {
      transactions: actualTransactions.map(t => ({
        id: t.id,
        type: t.type,
        points: t.points,
        description: t.description,
        metadata: t.metadata,
        orderId: t.orderId,
        expiresAt: t.expiresAt,
        createdAt: t.createdAt,
      })),
      pagination: {
        hasNext,
        hasPrevious: !!cursor,
        nextCursor: hasNext ? actualTransactions[actualTransactions.length - 1]?.id : null,
        previousCursor: cursor || null,
      },
    };

    return result;
  }
}
