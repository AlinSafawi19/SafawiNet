import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';
import { CreatePriceDto, UpdatePriceDto, PriceResponseDto } from './dto';

@Injectable()
export class PricesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createPriceDto: CreatePriceDto): Promise<PriceResponseDto> {
    // Verify variant exists
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: createPriceDto.variantId },
    });

    if (!variant) {
      throw new BadRequestException('Variant not found');
    }

    // Get the next version number for this variant and type
    const latestPrice = await this.prisma.price.findFirst({
      where: {
        variantId: createPriceDto.variantId,
        type: createPriceDto.type,
        currency: createPriceDto.currency,
      },
      orderBy: { version: 'desc' },
    });

    const nextVersion = (latestPrice?.version || 0) + 1;

    const price = await this.prisma.price.create({
      data: {
        ...createPriceDto,
        version: nextVersion,
      },
      include: {
        variant: {
          select: {
            id: true,
            sku: true,
            name: true,
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
    });

    return this.mapToResponseDto(price);
  }

  async findAll(params: {
    page: number;
    limit: number;
    variantId?: string;
    type?: string;
    currency?: string;
    isActive?: boolean;
  }): Promise<{
    data: PriceResponseDto[];
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const { page, limit, variantId, type, currency, isActive } = params;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (variantId) {
      where.variantId = variantId;
    }

    if (type) {
      where.type = type;
    }

    if (currency) {
      where.currency = currency;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [prices, total] = await Promise.all([
      this.prisma.price.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ createdAt: 'desc' }],
        include: {
          variant: {
            select: {
              id: true,
              sku: true,
              name: true,
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
      }),
      this.prisma.price.count({ where }),
    ]);

    return {
      data: prices.map(price => this.mapToResponseDto(price)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string): Promise<PriceResponseDto> {
    const price = await this.prisma.price.findUnique({
      where: { id },
      include: {
        variant: {
          select: {
            id: true,
            sku: true,
            name: true,
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
    });

    if (!price) {
      throw new NotFoundException('Price not found');
    }

    return this.mapToResponseDto(price);
  }

  async update(id: string, updatePriceDto: UpdatePriceDto): Promise<PriceResponseDto> {
    // Check if price exists
    const existingPrice = await this.prisma.price.findUnique({
      where: { id },
    });

    if (!existingPrice) {
      throw new NotFoundException('Price not found');
    }

    const price = await this.prisma.price.update({
      where: { id },
      data: updatePriceDto,
      include: {
        variant: {
          select: {
            id: true,
            sku: true,
            name: true,
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
    });

    return this.mapToResponseDto(price);
  }

  async activate(id: string): Promise<PriceResponseDto> {
    // Check if price exists
    const price = await this.prisma.price.findUnique({
      where: { id },
      include: {
        variant: {
          select: {
            id: true,
            sku: true,
            name: true,
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
    });

    if (!price) {
      throw new NotFoundException('Price not found');
    }

    // Deactivate all other prices of the same type and currency for this variant
    await this.prisma.price.updateMany({
      where: {
        variantId: price.variantId,
        type: price.type,
        currency: price.currency,
        id: { not: id },
      },
      data: { isActive: false },
    });

    // Activate this price
    const activatedPrice = await this.prisma.price.update({
      where: { id },
      data: { isActive: true },
      include: {
        variant: {
          select: {
            id: true,
            sku: true,
            name: true,
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
    });

    return this.mapToResponseDto(activatedPrice);
  }

  async delete(id: string): Promise<void> {
    // Check if price exists
    const price = await this.prisma.price.findUnique({
      where: { id },
    });

    if (!price) {
      throw new NotFoundException('Price not found');
    }

    await this.prisma.price.delete({
      where: { id },
    });
  }

  private mapToResponseDto(price: any): PriceResponseDto {
    return {
      id: price.id,
      variantId: price.variantId,
      amount: price.amount,
      currency: price.currency,
      type: price.type,
      effectiveFrom: price.effectiveFrom,
      effectiveTo: price.effectiveTo,
      isActive: price.isActive,
      version: price.version,
      createdBy: price.createdBy,
      metadata: price.metadata,
      createdAt: price.createdAt,
      updatedAt: price.updatedAt,
      variant: price.variant,
    };
  }
}
