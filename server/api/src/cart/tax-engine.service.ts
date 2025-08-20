import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';

export interface TaxDestination {
  country: string;
  state?: string | null;
  postalCode?: string | null;
}

export interface TaxCalculationResult {
  lineTaxes: Map<string, number>; // variantId -> tax amount
  orderTax: number;
  taxBreakdown: Array<{
    variantId: string;
    taxCategory: string;
    rate: number;
    amount: number;
  }>;
}

@Injectable()
export class TaxEngineService {
  private readonly logger = new Logger(TaxEngineService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculate tax for cart items based on destination
   */
  async calculateTax(
    items: Array<{ variantId: string; quantity: number; price: number }>,
    destination: TaxDestination,
    currency: string = 'USD'
  ): Promise<TaxCalculationResult> {
    try {
      const variantIds = items.map(item => item.variantId);
      
      // Get tax category mappings for all variants
      const taxMappings = await this.prisma.taxCategoryMapping.findMany({
        where: {
          variantId: { in: variantIds },
          isActive: true,
        },
        include: {
          taxCategory: {
            include: {
              rates: {
                where: {
                  isActive: true,
                  effectiveFrom: { lte: new Date() },
                  OR: [
                    { effectiveTo: null },
                    { effectiveTo: { gt: new Date() } },
                  ],
                },
                orderBy: { effectiveFrom: 'desc' },
              },
            },
          },
        },
      });

      const lineTaxes = new Map<string, number>();
      const taxBreakdown: Array<{
        variantId: string;
        taxCategory: string;
        rate: number;
        amount: number;
      }> = [];

      let orderTax = 0;

      for (const item of items) {
        const mapping = taxMappings.find(m => m.variantId === item.variantId);
        
        if (mapping && mapping.taxCategory.rates.length > 0) {
          const taxRate = mapping.taxCategory.rates[0];
          const lineTotal = item.price * item.quantity;
          const taxAmount = lineTotal * taxRate.rate;
          
          lineTaxes.set(item.variantId, taxAmount);
          orderTax += taxAmount;
          
          taxBreakdown.push({
            variantId: item.variantId,
            taxCategory: mapping.taxCategory.name,
            rate: taxRate.rate,
            amount: taxAmount,
          });
        } else {
          // No tax mapping or rate found
          lineTaxes.set(item.variantId, 0);
          this.logger.warn(`No tax mapping found for variant ${item.variantId}`);
        }
      }

      return {
        lineTaxes,
        orderTax,
        taxBreakdown,
      };
    } catch (error) {
      this.logger.error('Error calculating tax:', error);
      throw error;
    }
  }

  /**
   * Get effective tax rate for a specific variant and destination
   */
  async getEffectiveTaxRate(
    variantId: string,
    destination: TaxDestination
  ): Promise<number> {
    try {
      const mapping = await this.prisma.taxCategoryMapping.findFirst({
        where: {
          variantId,
          isActive: true,
        },
        include: {
          taxCategory: {
            include: {
              rates: {
                where: {
                  isActive: true,
                  effectiveFrom: { lte: new Date() },
                  OR: [
                    { effectiveTo: null },
                    { effectiveTo: { gt: new Date() } },
                  ],
                },
                orderBy: { effectiveFrom: 'desc' },
              },
            },
          },
        },
      });

      if (mapping && mapping.taxCategory.rates.length > 0) {
        return mapping.taxCategory.rates[0].rate;
      }

      return 0;
    } catch (error) {
      this.logger.error(`Error getting tax rate for variant ${variantId}:`, error);
      return 0;
    }
  }

  /**
   * Get tax summary for display purposes
   */
  async getTaxSummary(
    items: Array<{ variantId: string; quantity: number; price: number }>,
    destination: TaxDestination
  ): Promise<{
    totalTax: number;
    taxByCategory: Map<string, { rate: number; amount: number }>;
  }> {
    const calculation = await this.calculateTax(items, destination);
    
    const taxByCategory = new Map<string, { rate: number; amount: number }>();
    
    for (const breakdown of calculation.taxBreakdown) {
      const existing = taxByCategory.get(breakdown.taxCategory);
      if (existing) {
        existing.amount += breakdown.amount;
      } else {
        taxByCategory.set(breakdown.taxCategory, {
          rate: breakdown.rate,
          amount: breakdown.amount,
        });
      }
    }

    return {
      totalTax: calculation.orderTax,
      taxByCategory,
    };
  }
}
