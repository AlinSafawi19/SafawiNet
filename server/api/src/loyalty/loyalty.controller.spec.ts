import { Test, TestingModule } from '@nestjs/testing';
import { LoyaltyController } from './loyalty.controller';
import { LoyaltyService } from './loyalty.service';

describe('LoyaltyController', () => {
  let controller: LoyaltyController;
  let service: LoyaltyService;

  const mockLoyaltyService = {
    getUserLoyaltyAccount: jest.fn(),
    getUserTransactions: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LoyaltyController],
      providers: [
        {
          provide: LoyaltyService,
          useValue: mockLoyaltyService,
        },
      ],
    }).compile();

    controller = module.get<LoyaltyController>(LoyaltyController);
    service = module.get<LoyaltyService>(LoyaltyService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMyLoyaltyAccount', () => {
    const mockRequest = {
      user: { id: 'user-123' },
    };

    const mockLoyaltyAccount = {
      id: 'loyalty-123',
      currentTier: {
        id: 'tier-1',
        name: 'Silver',
        minPoints: 1000,
        maxPoints: 4999,
        benefits: { discount: 0.10, freeShipping: true },
        color: '#C0C0C0',
        icon: '🥈',
      },
      currentPoints: 2500,
      lifetimePoints: 3500,
      tierUpgradedAt: new Date('2024-01-01'),
      nextTier: null,
    };

    it('should return user loyalty account information', async () => {
      mockLoyaltyService.getUserLoyaltyAccount.mockResolvedValue(mockLoyaltyAccount);

      const result = await controller.getMyLoyaltyAccount(mockRequest);

      expect(result).toEqual(mockLoyaltyAccount);
      expect(service.getUserLoyaltyAccount).toHaveBeenCalledWith('user-123');
    });

    it('should handle service errors', async () => {
      const error = new Error('Service error');
      mockLoyaltyService.getUserLoyaltyAccount.mockRejectedValue(error);

      await expect(controller.getMyLoyaltyAccount(mockRequest)).rejects.toThrow(error);
    });
  });

  describe('getMyTransactions', () => {
    const mockRequest = {
      user: { id: 'user-123' },
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

    const mockPaginatedResult = {
      transactions: mockTransactions,
      pagination: {
        hasNext: false,
        hasPrevious: false,
        nextCursor: null,
        previousCursor: null,
      },
    };

    it('should return transactions with default parameters', async () => {
      mockLoyaltyService.getUserTransactions.mockResolvedValue(mockPaginatedResult);

      const result = await controller.getMyTransactions(mockRequest);

      expect(result).toEqual(mockPaginatedResult);
      expect(service.getUserTransactions).toHaveBeenCalledWith('user-123', undefined, 20);
    });

    it('should handle custom limit parameter', async () => {
      mockLoyaltyService.getUserTransactions.mockResolvedValue(mockPaginatedResult);

      const result = await controller.getMyTransactions(mockRequest, undefined, 10);

      expect(result).toEqual(mockPaginatedResult);
      expect(service.getUserTransactions).toHaveBeenCalledWith('user-123', undefined, 10);
    });

    it('should handle cursor parameter', async () => {
      const cursor = 'txn-1';
      mockLoyaltyService.getUserTransactions.mockResolvedValue(mockPaginatedResult);

      const result = await controller.getMyTransactions(mockRequest, cursor, 20);

      expect(result).toEqual(mockPaginatedResult);
      expect(service.getUserTransactions).toHaveBeenCalledWith('user-123', cursor, 20);
    });

    it('should handle both cursor and limit parameters', async () => {
      const cursor = 'txn-1';
      mockLoyaltyService.getUserTransactions.mockResolvedValue(mockPaginatedResult);

      const result = await controller.getMyTransactions(mockRequest, cursor, 15);

      expect(result).toEqual(mockPaginatedResult);
      expect(service.getUserTransactions).toHaveBeenCalledWith('user-123', cursor, 15);
    });

    it('should handle service errors', async () => {
      const error = new Error('Service error');
      mockLoyaltyService.getUserTransactions.mockRejectedValue(error);

      await expect(controller.getMyTransactions(mockRequest)).rejects.toThrow(error);
    });
  });
});
