import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { PricingEngineService } from './pricing-engine.service';
import { TaxEngineService, TaxDestination } from './tax-engine.service';
import { ShippingService, ShippingDestination } from './shipping.service';
import { 
  AddCartItemDto, 
  UpdateCartItemDto, 
  CartResponseDto, 
  CartTotalsDto,
  CartItemResponseDto 
} from './dto';

@Injectable()
export class CartService {
  private readonly logger = new Logger(CartService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pricingEngine: PricingEngineService,
    private readonly taxEngine: TaxEngineService,
    private readonly shippingService: ShippingService,
  ) {}

  /**
   * Get or create cart for user or session
   */
  async getOrCreateCart(
    userId?: string,
    sessionId?: string,
    currency: string = 'USD'
  ): Promise<CartResponseDto> {
    try {
      let cart = await this.prisma.cart.findFirst({
        where: {
          OR: [
            { userId: userId || null },
            { sessionId: sessionId || null },
          ],
          status: 'ACTIVE',
          currency,
        },
        include: {
          items: {
            include: {
              variant: {
                include: {
                  product: {
                    select: {
                      id: true,
                      name: true,
                      slug: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!cart) {
        cart = await this.prisma.cart.create({
          data: {
            userId: userId || null,
            sessionId: sessionId || null,
            currency,
            status: 'ACTIVE',
          },
          include: {
            items: {
              include: {
                variant: {
                  include: {
                    product: {
                      select: {
                        id: true,
                        name: true,
                        slug: true,
                      },
                    },
                  },
                },
              },
            },
          },
        });
      }

      const totals = await this.calculateCartTotals(cart.id);
      
      return this.mapToCartResponse(cart, totals);
    } catch (error) {
      this.logger.error('Error getting or creating cart:', error);
      throw error;
    }
  }

  /**
   * Add item to cart
   */
  async addItem(
    cartId: string,
    addItemDto: AddCartItemDto
  ): Promise<CartResponseDto> {
    try {
      const cart = await this.prisma.cart.findUnique({
        where: { id: cartId },
        include: { items: true },
      });

      if (!cart) {
        throw new NotFoundException('Cart not found');
      }

      if (cart.status !== 'ACTIVE') {
        throw new BadRequestException('Cart is not active');
      }

      // Check if variant exists and is active
      const variant = await this.prisma.productVariant.findUnique({
        where: { id: addItemDto.variantId },
        include: { product: true },
      });

      if (!variant || !variant.isActive || !variant.product.isActive) {
        throw new BadRequestException('Variant not found or inactive');
      }

      // Check if item already exists in cart
      const existingItem = cart.items.find(item => item.variantId === addItemDto.variantId);

      if (existingItem) {
        // Update quantity
        await this.prisma.cartItem.update({
          where: { id: existingItem.id },
          data: { 
            quantity: existingItem.quantity + addItemDto.quantity,
            metadata: addItemDto.metadata,
          },
        });
      } else {
        // Add new item
        await this.prisma.cartItem.create({
          data: {
            cartId,
            variantId: addItemDto.variantId,
            quantity: addItemDto.quantity,
            metadata: addItemDto.metadata,
          },
        });
      }

      // Return updated cart
      return this.getOrCreateCart(cart.userId || undefined, cart.sessionId || undefined, cart.currency);
    } catch (error) {
      this.logger.error('Error adding item to cart:', error);
      throw error;
    }
  }

  /**
   * Update cart item quantity
   */
  async updateItem(
    cartId: string,
    variantId: string,
    updateItemDto: UpdateCartItemDto
  ): Promise<CartResponseDto> {
    try {
      const cartItem = await this.prisma.cartItem.findFirst({
        where: {
          cartId,
          variantId,
        },
        include: { cart: true },
      });

      if (!cartItem) {
        throw new NotFoundException('Cart item not found');
      }

      if (cartItem.cart.status !== 'ACTIVE') {
        throw new BadRequestException('Cart is not active');
      }

      if (updateItemDto.quantity <= 0) {
        // Remove item if quantity is 0 or negative
        await this.prisma.cartItem.delete({
          where: { id: cartItem.id },
        });
      } else {
        // Update quantity
        await this.prisma.cartItem.update({
          where: { id: cartItem.id },
          data: {
            quantity: updateItemDto.quantity,
            metadata: updateItemDto.metadata,
          },
        });
      }

      // Return updated cart
      return this.getOrCreateCart(cartItem.cart.userId || undefined, cartItem.cart.sessionId || undefined, cartItem.cart.currency);
    } catch (error) {
      this.logger.error('Error updating cart item:', error);
      throw error;
    }
  }

  /**
   * Remove item from cart
   */
  async removeItem(
    cartId: string,
    variantId: string
  ): Promise<CartResponseDto> {
    try {
      const cartItem = await this.prisma.cartItem.findFirst({
        where: {
          cartId,
          variantId,
        },
        include: { cart: true },
      });

      if (!cartItem) {
        throw new NotFoundException('Cart item not found');
      }

      await this.prisma.cartItem.delete({
        where: { id: cartItem.id },
      });

      // Return updated cart
      return this.getOrCreateCart(cartItem.cart.userId || undefined, cartItem.cart.sessionId || undefined, cartItem.cart.currency);
    } catch (error) {
      this.logger.error('Error removing cart item:', error);
      throw error;
    }
  }

  /**
   * Clear cart
   */
  async clearCart(cartId: string): Promise<void> {
    try {
      await this.prisma.cartItem.deleteMany({
        where: { cartId },
      });
    } catch (error) {
      this.logger.error('Error clearing cart:', error);
      throw error;
    }
  }

  /**
   * Calculate cart totals
   */
  async calculateCartTotals(
    cartId: string,
    shippingDestination?: ShippingDestination,
    selectedShippingMethodId?: string
  ): Promise<CartTotalsDto> {
    try {
      const cart = await this.prisma.cart.findUnique({
        where: { id: cartId },
        include: {
          items: {
            include: {
              variant: {
                include: {
                  product: true,
                },
              },
            },
          },
        },
      });

      if (!cart) {
        throw new NotFoundException('Cart not found');
      }

      if (cart.items.length === 0) {
        return {
          subtotal: 0,
          discounts: 0,
          shipping: 0,
          tax: 0,
          total: 0,
          currency: cart.currency,
        };
      }

      // Get pricing summary
      const pricingSummary = await this.pricingEngine.getPricingSummary(
        cart.items.map(item => ({
          variantId: item.variantId,
          quantity: item.quantity,
        })),
        { currency: cart.currency }
      );

      const subtotal = pricingSummary.subtotal;
      const discounts = 0; // No discounts implemented yet
      let shipping = 0;
      let tax = 0;

      // Calculate shipping if destination is provided
      if (shippingDestination && selectedShippingMethodId) {
        const shippingCost = await this.shippingService.calculateShippingCost(
          selectedShippingMethodId,
          shippingDestination,
          subtotal
        );
        shipping = shippingCost?.cost || 0;
      }

      // Calculate tax if destination is provided
      if (shippingDestination) {
        const itemsWithPrices = cart.items.map(item => {
          const price = pricingSummary.itemPrices.get(item.variantId);
          return {
            variantId: item.variantId,
            quantity: item.quantity,
            price: price?.price || 0,
          };
        });

        const taxCalculation = await this.taxEngine.calculateTax(
          itemsWithPrices,
          {
            country: shippingDestination.country,
            postalCode: shippingDestination.postalCode,
          },
          cart.currency
        );

        tax = taxCalculation.orderTax;
      }

      const total = subtotal + shipping + tax - discounts;

      return {
        subtotal,
        discounts,
        shipping,
        tax,
        total,
        currency: cart.currency,
      };
    } catch (error) {
      this.logger.error('Error calculating cart totals:', error);
      throw error;
    }
  }

  /**
   * Map cart to response DTO
   */
  private mapToCartResponse(cart: any, totals: CartTotalsDto): CartResponseDto {
    return {
      id: cart.id,
      userId: cart.userId,
      sessionId: cart.sessionId,
      currency: cart.currency,
      status: cart.status,
      metadata: cart.metadata,
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
      items: cart.items.map((item: any) => ({
        id: item.id,
        variantId: item.variantId,
        quantity: item.quantity,
        metadata: item.metadata,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        variant: {
          id: item.variant.id,
          sku: item.variant.sku,
          name: item.variant.name,
          product: {
            id: item.variant.product.id,
            name: item.variant.product.name,
            slug: item.variant.product.slug,
          },
        },
      })),
      totals,
    };
  }
}
