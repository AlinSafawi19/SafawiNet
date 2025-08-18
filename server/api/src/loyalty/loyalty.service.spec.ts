import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { LoyaltyService } from './loyalty.service';
import { PrismaService } from '../common/services/prisma.service';

describe('LoyaltyService', () => {
  let service: LoyaltyService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    loyaltyAccount: {
      findUnique: jest.fn(),
    },
    loyaltyTier: {
      findFirst: jest.fn(),
    },
    loyaltyTransaction: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoyaltyService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<LoyaltyService>(LoyaltyService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserLoyaltyAccount', () => {
    const mockUserId = 'user-123';
    const mockTier = {
      id: 'tier-1',
      name: 'Silver',
      minPoints: 1000,
      maxPoints: 4999,
      benefits: { discount: 0.10, freeShipping: true },
      color: '#C0C0C0',
      icon: '🥈',
    };

    const mockLoyaltyAccount = {
      id: 'loyalty-123',
      userId: mockUserId,
      currentTierId: 'tier-1',
      currentPoints: 2500,
      lifetimePoints: 3500,
      tierUpgradedAt: new Date('2024-01-01'),
      currentTier: mockTier,
    };

    it('should return loyalty account information with current tier', async () => {
      mockPrismaService.loyaltyAccount.findUnique.mockResolvedValue(mockLoyaltyAccount);
      mockPrismaService.loyaltyTier.findFirst.mockResolvedValue(null); // No next tier

      const result = await service.getUserLoyaltyAccount(mockUserId);

      expect(result).toEqual({
        id: 'loyalty-123',
        currentTier: mockTier,
        currentPoints: 2500,
        lifetimePoints: 3500,
        tierUpgradedAt: new Date('2024-01-01'),
        nextTier: null,
      });

      expect(mockPrismaService.loyaltyAccount.findUnique).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        include: { currentTier: true },
      });
    });

    it('should return next tier information when available', async () => {
      const nextTier = {
        id: 'tier-2',
        name: 'Gold',
        minPoints: 5000,
        maxPoints: 19999,
        benefits: { discount: 0.15, freeShipping: true },
        color: '#FFD700',
        icon: '🥇',
      };

      mockPrismaService.loyaltyAccount.findUnique.mockResolvedValue(mockLoyaltyAccount);
      mockPrismaService.loyaltyTier.findFirst.mockResolvedValue(nextTier);

      const result = await service.getUserLoyaltyAccount(mockUserId);

      expect(result.nextTier).toEqual({
        name: 'Gold',
        minPoints: 5000,
        pointsNeeded: 2500, // 5000 - 2500
      });

      expect(mockPrismaService.loyaltyTier.findFirst).toHaveBeenCalledWith({
        where: {
          minPoints: {
            gt: 2500,
          },
        },
        orderBy: {
          minPoints: 'asc',
        },
      });
    });

    it('should throw NotFoundException when loyalty account not found', async () => {
      mockPrismaService.loyaltyAccount.findUnique.mockResolvedValue(null);

      await expect(service.getUserLoyaltyAccount(mockUserId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getUserLoyaltyAccount(mockUserId)).rejects.toThrow(
        'Loyalty account not found',
      );
    });
  });

  describe('getUserTransactions', () => {
    const mockUserId = 'user-123';
    const mockLoyaltyAccount = {
      id: 'loyalty-123',
    };

    const mockTransactions = [
      {
        id: 'txn-1',
        type: 'earn',
        points: 100,
        description: 'Purchase bonus',
        metadata: { source: 'purchase' },
        orderId: 'order-1',
        expiresAt: new Date('2025-01-01'),
        createdAt: new Date('2024-01-01'),
      },
      {
        id: 'txn-2',
        type: 'spend',
        points: -50,
        description: 'Redemption',
        metadata: { source: 'redemption' },
        orderId: 'order-2',
        expiresAt: null,
        createdAt: new Date('2024-01-02'),
      },
    ];

    beforeEach(() => {
      mockPrismaService.loyaltyAccount.findUnique.mockResolvedValue(mockLoyaltyAccount);
    });

    it('should return paginated transactions with default limit', async () => {
      mockPrismaService.loyaltyTransaction.findMany.mockResolvedValue([
        ...mockTransactions,
        { id: 'txn-3', type: 'earn', points: 25, description: 'Bonus', metadata: {}, orderId: null, expiresAt: null, createdAt: new Date() },
      ]);

      const result = await service.getUserTransactions(mockUserId);

      expect(result.transactions).toHaveLength(3);
      expect(result.pagination.hasNext).toBe(false);
      expect(result.pagination.hasPrevious).toBe(false);
      expect(result.pagination.nextCursor).toBeNull();
      expect(result.pagination.previousCursor).toBeNull();

      expect(mockPrismaService.loyaltyTransaction.findMany).toHaveBeenCalledWith({
        where: { loyaltyAccountId: 'loyalty-123' },
        orderBy: { createdAt: 'desc' },
        take: 21, // Default 20 + 1 for pagination check
      });
    });

    it('should handle custom limit parameter', async () => {
      mockPrismaService.loyaltyTransaction.findMany.mockResolvedValue(mockTransactions);

      const result = await service.getUserTransactions(mockUserId, undefined, 10);

      expect(result.transactions).toHaveLength(2);
      expect(mockPrismaService.loyaltyTransaction.findMany).toHaveBeenCalledWith({
        where: { loyaltyAccountId: 'loyalty-123' },
        orderBy: { createdAt: 'desc' },
        take: 11, // 10 + 1 for pagination check
      });
    });

    it('should enforce maximum limit of 100', async () => {
      mockPrismaService.loyaltyTransaction.findMany.mockResolvedValue(mockTransactions);

      const result = await service.getUserTransactions(mockUserId, undefined, 150);

      expect(mockPrismaService.loyaltyTransaction.findMany).toHaveBeenCalledWith({
        where: { loyaltyAccountId: 'loyalty-123' },
        orderBy: { createdAt: 'desc' },
        take: 101, // 100 + 1 for pagination check
      });
    });

    it('should handle cursor-based pagination', async () => {
      const cursor = 'txn-1';
      mockPrismaService.loyaltyTransaction.findMany.mockResolvedValue(mockTransactions);

      await service.getUserTransactions(mockUserId, cursor, 20);

      expect(mockPrismaService.loyaltyTransaction.findMany).toHaveBeenCalledWith({
        where: { loyaltyAccountId: 'loyalty-123' },
        orderBy: { createdAt: 'desc' },
        take: 21,
        cursor: { id: cursor },
        skip: 1,
      });
    });

    it('should indicate next page when more transactions exist', async () => {
      // Return more transactions than the limit to indicate next page
      const manyTransactions = Array.from({ length: 25 }, (_, i) => ({
        id: `txn-${i}`,
        type: 'earn',
        points: 100,
        description: `Transaction ${i}`,
        metadata: {},
        orderId: null,
        expiresAt: null,
        createdAt: new Date(),
      }));

      mockPrismaService.loyaltyTransaction.findMany.mockResolvedValue(manyTransactions);

      const result = await service.getUserTransactions(mockUserId, undefined, 20);

      expect(result.transactions).toHaveLength(20);
      expect(result.pagination.hasNext).toBe(true);
      expect(result.pagination.nextCursor).toBe('txn-19'); // Last transaction in the page
    });

    it('should throw NotFoundException when loyalty account not found', async () => {
      mockPrismaService.loyaltyAccount.findUnique.mockResolvedValue(null);

      await expect(service.getUserTransactions(mockUserId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getUserTransactions(mockUserId)).rejects.toThrow(
        'Loyalty account not found',
      );
    });
  });
});
