import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';

export interface PricingContext {
  currency?: string;
  priceBook?: string;
  customerGroup?: string;
  effectiveDate?: Date;
}

export interface ResolvedPrice {
  variantId: string;
  amount: number;
  currency: string;
  type: string;
  effectiveFrom: Date;
  effectiveTo?: Date | null;
}

@Injectable()
export class PricingEngineService {
  private readonly logger = new Logger(PricingEngineService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolve the active price for a variant
   */
  async resolvePrice(
    variantId: string,
    context: PricingContext = {}
  ): Promise<ResolvedPrice | null> {
    try {
      const { currency = 'USD', effectiveDate = new Date() } = context;

      const price = await this.prisma.price.findFirst({
        where: {
          variantId,
          currency,
          isActive: true,
          effectiveFrom: { lte: effectiveDate },
          OR: [
            { effectiveTo: null },
            { effectiveTo: { gt: effectiveDate } },
          ],
        },
        orderBy: [
          { effectiveFrom: 'desc' },
          { version: 'desc' },
        ],
      });

      if (!price) {
        this.logger.warn(`No active price found for variant ${variantId} in ${currency}`);
        return null;
      }

      return {
        variantId: price.variantId,
        amount: price.amount,
        currency: price.currency,
        type: price.type,
        effectiveFrom: price.effectiveFrom,
        effectiveTo: price.effectiveTo,
      };
    } catch (error) {
      this.logger.error(`Error resolving price for variant ${variantId}:`, error);
      throw error;
    }
  }

  /**
   * Resolve prices for multiple variants
   */
  async resolvePrices(
    variantIds: string[],
    context: PricingContext = {}
  ): Promise<Map<string, ResolvedPrice>> {
    try {
      const { currency = 'USD', effectiveDate = new Date() } = context;

      const prices = await this.prisma.price.findMany({
        where: {
          variantId: { in: variantIds },
          currency,
          isActive: true,
          effectiveFrom: { lte: effectiveDate },
          OR: [
            { effectiveTo: null },
            { effectiveTo: { gt: effectiveDate } },
          ],
        },
        orderBy: [
          { variantId: 'asc' },
          { effectiveFrom: 'desc' },
          { version: 'desc' },
        ],
      });

      const priceMap = new Map<string, ResolvedPrice>();
      const processedVariants = new Set<string>();

      for (const price of prices) {
        if (!processedVariants.has(price.variantId)) {
          priceMap.set(price.variantId, {
            variantId: price.variantId,
            amount: price.amount,
            currency: price.currency,
            type: price.type,
            effectiveFrom: price.effectiveFrom,
            effectiveTo: price.effectiveTo,
          });
          processedVariants.add(price.variantId);
        }
      }

      return priceMap;
    } catch (error) {
      this.logger.error(`Error resolving prices for variants:`, error);
      throw error;
    }
  }

  /**
   * Get pricing summary for cart items
   */
  async getPricingSummary(
    items: Array<{ variantId: string; quantity: number }>,
    context: PricingContext = {}
  ): Promise<{
    subtotal: number;
    currency: string;
    itemPrices: Map<string, { price: number; total: number }>;
  }> {
    const variantIds = items.map(item => item.variantId);
    const prices = await this.resolvePrices(variantIds, context);

    let subtotal = 0;
    const itemPrices = new Map<string, { price: number; total: number }>();

    for (const item of items) {
      const price = prices.get(item.variantId);
      if (price) {
        const total = price.amount * item.quantity;
        subtotal += total;
        itemPrices.set(item.variantId, {
          price: price.amount,
          total,
        });
      }
    }

    return {
      subtotal,
      currency: context.currency || 'USD',
      itemPrices,
    };
  }
}
