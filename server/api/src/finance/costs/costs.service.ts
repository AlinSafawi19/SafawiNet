import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';
import { CreateCostDto, UpdateCostDto, CostResponseDto } from './dto';

@Injectable()
export class CostsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createCostDto: CreateCostDto): Promise<CostResponseDto> {
    // Verify variant exists
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: createCostDto.variantId },
    });

    if (!variant) {
      throw new BadRequestException('Variant not found');
    }

    const cost = await this.prisma.cost.create({
      data: createCostDto,
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

    return this.mapToResponseDto(cost);
  }

  async findAll(params: {
    page: number;
    limit: number;
    variantId?: string;
    type?: string;
    currency?: string;
    isActive?: boolean;
  }): Promise<{
    data: CostResponseDto[];
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

    const [costs, total] = await Promise.all([
      this.prisma.cost.findMany({
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
      this.prisma.cost.count({ where }),
    ]);

    return {
      data: costs.map(cost => this.mapToResponseDto(cost)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string): Promise<CostResponseDto> {
    const cost = await this.prisma.cost.findUnique({
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

    if (!cost) {
      throw new NotFoundException('Cost not found');
    }

    return this.mapToResponseDto(cost);
  }

  async update(id: string, updateCostDto: UpdateCostDto): Promise<CostResponseDto> {
    // Check if cost exists
    const existingCost = await this.prisma.cost.findUnique({
      where: { id },
    });

    if (!existingCost) {
      throw new NotFoundException('Cost not found');
    }

    const cost = await this.prisma.cost.update({
      where: { id },
      data: updateCostDto,
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

    return this.mapToResponseDto(cost);
  }

  async delete(id: string): Promise<void> {
    // Check if cost exists
    const cost = await this.prisma.cost.findUnique({
      where: { id },
    });

    if (!cost) {
      throw new NotFoundException('Cost not found');
    }

    await this.prisma.cost.delete({
      where: { id },
    });
  }

  private mapToResponseDto(cost: any): CostResponseDto {
    return {
      id: cost.id,
      variantId: cost.variantId,
      amount: cost.amount,
      currency: cost.currency,
      type: cost.type,
      effectiveFrom: cost.effectiveFrom,
      effectiveTo: cost.effectiveTo,
      isActive: cost.isActive,
      notes: cost.notes,
      createdBy: cost.createdBy,
      metadata: cost.metadata,
      createdAt: cost.createdAt,
      updatedAt: cost.updatedAt,
      variant: cost.variant,
    };
  }
}
