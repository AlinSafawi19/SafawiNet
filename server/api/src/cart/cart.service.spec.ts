import { Test, TestingModule } from '@nestjs/testing';
import { CartService } from './cart.service';
import { PricingEngineService } from './pricing-engine.service';
import { TaxEngineService } from './tax-engine.service';
import { ShippingService } from './shipping.service';
import { PrismaService } from '../common/services/prisma.service';

describe('CartService', () => {
  let service: CartService;
  let prismaService: PrismaService;
  let pricingEngine: PricingEngineService;
  let taxEngine: TaxEngineService;
  let shippingService: ShippingService;

  const mockPrismaService = {
    cart: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    cartItem: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    productVariant: {
      findUnique: jest.fn(),
    },
  };

  const mockPricingEngine = {
    getPricingSummary: jest.fn(),
  };

  const mockTaxEngine = {
    calculateTax: jest.fn(),
  };

  const mockShippingService = {
    calculateShippingCost: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: PricingEngineService,
          useValue: mockPricingEngine,
        },
        {
          provide: TaxEngineService,
          useValue: mockTaxEngine,
        },
        {
          provide: ShippingService,
          useValue: mockShippingService,
        },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
    prismaService = module.get<PrismaService>(PrismaService);
    pricingEngine = module.get<PricingEngineService>(PricingEngineService);
    taxEngine = module.get<TaxEngineService>(TaxEngineService);
    shippingService = module.get<ShippingService>(ShippingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getOrCreateCart', () => {
    it('should return existing cart if found', async () => {
      const mockCart = {
        id: 'cart-1',
        userId: 'user-1',
        sessionId: null,
        currency: 'USD',
        status: 'ACTIVE',
        items: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.cart.findFirst.mockResolvedValue(mockCart);
      mockPricingEngine.getPricingSummary.mockResolvedValue({
        subtotal: 0,
        currency: 'USD',
        itemPrices: new Map(),
      });

      const result = await service.getOrCreateCart('user-1');

      expect(result.id).toBe('cart-1');
      expect(mockPrismaService.cart.findFirst).toHaveBeenCalled();
    });

    it('should create new cart if none exists', async () => {
      mockPrismaService.cart.findFirst.mockResolvedValue(null);
      mockPrismaService.cart.create.mockResolvedValue({
        id: 'cart-2',
        userId: 'user-1',
        sessionId: null,
        currency: 'USD',
        status: 'ACTIVE',
        items: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPricingEngine.getPricingSummary.mockResolvedValue({
        subtotal: 0,
        currency: 'USD',
        itemPrices: new Map(),
      });

      const result = await service.getOrCreateCart('user-1');

      expect(result.id).toBe('cart-2');
      expect(mockPrismaService.cart.create).toHaveBeenCalled();
    });
  });

  describe('addItem', () => {
    it('should add new item to cart', async () => {
      const mockCart = {
        id: 'cart-1',
        userId: 'user-1',
        items: [],
      };

      const mockVariant = {
        id: 'variant-1',
        isActive: true,
        product: { isActive: true },
      };

      mockPrismaService.cart.findUnique.mockResolvedValue(mockCart);
      mockPrismaService.productVariant.findUnique.mockResolvedValue(mockVariant);
      mockPrismaService.cartItem.create.mockResolvedValue({});
      mockPrismaService.cart.findFirst.mockResolvedValue(mockCart);
      mockPricingEngine.getPricingSummary.mockResolvedValue({
        subtotal: 0,
        currency: 'USD',
        itemPrices: new Map(),
      });

      const result = await service.addItem('cart-1', {
        variantId: 'variant-1',
        quantity: 2,
      });

      expect(mockPrismaService.cartItem.create).toHaveBeenCalledWith({
        data: {
          cartId: 'cart-1',
          variantId: 'variant-1',
          quantity: 2,
          metadata: undefined,
        },
      });
    });

    it('should update existing item quantity', async () => {
      const mockCart = {
        id: 'cart-1',
        userId: 'user-1',
        items: [
          {
            id: 'item-1',
            variantId: 'variant-1',
            quantity: 1,
          },
        ],
      };

      const mockVariant = {
        id: 'variant-1',
        isActive: true,
        product: { isActive: true },
      };

      mockPrismaService.cart.findUnique.mockResolvedValue(mockCart);
      mockPrismaService.productVariant.findUnique.mockResolvedValue(mockVariant);
      mockPrismaService.cartItem.update.mockResolvedValue({});
      mockPrismaService.cart.findFirst.mockResolvedValue(mockCart);
      mockPricingEngine.getPricingSummary.mockResolvedValue({
        subtotal: 0,
        currency: 'USD',
        itemPrices: new Map(),
      });

      const result = await service.addItem('cart-1', {
        variantId: 'variant-1',
        quantity: 2,
      });

      expect(mockPrismaService.cartItem.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: {
          quantity: 3,
          metadata: undefined,
        },
      });
    });
  });

  describe('calculateCartTotals', () => {
    it('should return zero totals for empty cart', async () => {
      const mockCart = {
        id: 'cart-1',
        currency: 'USD',
        items: [],
      };

      mockPrismaService.cart.findUnique.mockResolvedValue(mockCart);

      const result = await service.calculateCartTotals('cart-1');

      expect(result.subtotal).toBe(0);
      expect(result.shipping).toBe(0);
      expect(result.tax).toBe(0);
      expect(result.total).toBe(0);
    });

    it('should calculate totals with items', async () => {
      const mockCart = {
        id: 'cart-1',
        currency: 'USD',
        items: [
          { variantId: 'variant-1', quantity: 2 },
        ],
      };

      mockPrismaService.cart.findUnique.mockResolvedValue(mockCart);
      mockPricingEngine.getPricingSummary.mockResolvedValue({
        subtotal: 199.98,
        currency: 'USD',
        itemPrices: new Map([['variant-1', { price: 99.99, total: 199.98 }]]),
      });

      const result = await service.calculateCartTotals('cart-1');

      expect(result.subtotal).toBe(199.98);
      expect(result.total).toBe(199.98);
    });
  });
});
