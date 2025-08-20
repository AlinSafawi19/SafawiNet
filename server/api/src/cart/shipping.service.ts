import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { ShippingZoneDto, ShippingMethodDto } from './dto';

export interface ShippingDestination {
  country: string;
  postalCode?: string;
}

@Injectable()
export class ShippingService {
  private readonly logger = new Logger(ShippingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get available shipping methods for a destination
   */
  async getShippingMethods(
    destination: ShippingDestination,
    subtotal: number = 0,
    currency: string = 'USD'
  ): Promise<ShippingMethodDto[]> {
    try {
      const { country, postalCode } = destination;

      // Find shipping zones that match the destination
      const zones = await this.prisma.shippingZone.findMany({
        where: {
          isActive: true,
          countries: { has: country },
        },
        include: {
          methods: {
            where: {
              isActive: true,
              currency,
            },
            orderBy: { sortOrder: 'asc' },
          },
        },
      });

      const availableMethods: ShippingMethodDto[] = [];

      for (const zone of zones) {
        // Check if postal code matches any pattern in the zone
        if (postalCode && zone.postalCodes.length > 0) {
          const postalCodeMatches = zone.postalCodes.some(pattern => {
            try {
              const regex = new RegExp(pattern);
              return regex.test(postalCode);
            } catch (error) {
              this.logger.warn(`Invalid postal code pattern: ${pattern}`);
              return false;
            }
          });

          if (!postalCodeMatches) {
            continue;
          }
        }

        // Filter methods based on order value constraints
        for (const method of zone.methods) {
          if (this.isMethodAvailable(method, subtotal, currency)) {
            availableMethods.push({
              id: method.id,
              name: method.name,
              description: method.description,
              price: method.price,
              currency: method.currency,
              deliveryTime: method.deliveryTime,
              minOrderValue: method.minOrderValue,
              maxOrderValue: method.maxOrderValue,
            });
          }
        }
      }

      // Sort by price and then by sort order
      availableMethods.sort((a, b) => {
        if (a.price !== b.price) {
          return a.price - b.price;
        }
        return 0;
      });

      return availableMethods;
    } catch (error) {
      this.logger.error('Error getting shipping methods:', error);
      throw error;
    }
  }

  /**
   * Check if a shipping method is available for the given order value
   */
  private isMethodAvailable(
    method: any,
    subtotal: number,
    currency: string
  ): boolean {
    // Check minimum order value
    if (method.minOrderValue && subtotal < method.minOrderValue) {
      return false;
    }

    // Check maximum order value
    if (method.maxOrderValue && subtotal > method.maxOrderValue) {
      return false;
    }

    return true;
  }

  /**
   * Get shipping zones
   */
  async getShippingZones(): Promise<ShippingZoneDto[]> {
    try {
      const zones = await this.prisma.shippingZone.findMany({
        where: { isActive: true },
        include: {
          methods: {
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
          },
        },
        orderBy: { name: 'asc' },
      });

      return zones.map(zone => ({
        id: zone.id,
        name: zone.name,
        description: zone.description,
        countries: zone.countries,
        postalCodes: zone.postalCodes,
        methods: zone.methods.map(method => ({
          id: method.id,
          name: method.name,
          description: method.description,
          price: method.price,
          currency: method.currency,
          deliveryTime: method.deliveryTime,
          minOrderValue: method.minOrderValue,
          maxOrderValue: method.maxOrderValue,
        })),
      }));
    } catch (error) {
      this.logger.error('Error getting shipping zones:', error);
      throw error;
    }
  }

  /**
   * Calculate shipping cost for a specific method
   */
  async calculateShippingCost(
    methodId: string,
    destination: ShippingDestination,
    subtotal: number = 0
  ): Promise<{ cost: number; currency: string } | null> {
    try {
      const method = await this.prisma.shippingMethod.findUnique({
        where: { id: methodId },
        include: { zone: true },
      });

      if (!method || !method.isActive) {
        return null;
      }

      // Check if destination matches the zone
      if (!method.zone.countries.includes(destination.country)) {
        return null;
      }

      // Check postal code if specified
      if (destination.postalCode && method.zone.postalCodes.length > 0) {
        const postalCodeMatches = method.zone.postalCodes.some(pattern => {
          try {
            const regex = new RegExp(pattern);
            return regex.test(destination.postalCode!);
          } catch (error) {
            return false;
          }
        });

        if (!postalCodeMatches) {
          return null;
        }
      }

      // Check order value constraints
      if (!this.isMethodAvailable(method, subtotal, method.currency)) {
        return null;
      }

      return {
        cost: method.price,
        currency: method.currency,
      };
    } catch (error) {
      this.logger.error(`Error calculating shipping cost for method ${methodId}:`, error);
      return null;
    }
  }
}
