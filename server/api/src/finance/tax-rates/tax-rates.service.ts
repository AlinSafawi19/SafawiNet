import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';
import { CreateTaxRateDto, UpdateTaxRateDto } from './dto';

@Injectable()
export class TaxRatesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createTaxRateDto: CreateTaxRateDto) {
    // Verify tax category exists
    const taxCategory = await this.prisma.taxCategory.findUnique({
      where: { id: createTaxRateDto.taxCategoryId },
    });

    if (!taxCategory) {
      throw new NotFoundException(`Tax category with ID ${createTaxRateDto.taxCategoryId} not found`);
    }

    return this.prisma.taxRate.create({
      data: {
        rate: createTaxRateDto.rate,
        taxCategoryId: createTaxRateDto.taxCategoryId,
        effectiveFrom: createTaxRateDto.effectiveFrom,
        effectiveTo: createTaxRateDto.effectiveTo,
        isActive: createTaxRateDto.isActive,
        description: createTaxRateDto.description,
      },
      include: {
        taxCategory: true,
      },
    });
  }

  async findAll(params: {
    page?: number;
    limit?: number;
    taxCategoryId?: string;
    isActive?: boolean;
  }) {
    const { page = 1, limit = 10, taxCategoryId, isActive } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (taxCategoryId) where.taxCategoryId = taxCategoryId;
    if (isActive !== undefined) where.isActive = isActive;

    const [taxRates, total] = await Promise.all([
      this.prisma.taxRate.findMany({
        where,
        skip,
        take: limit,
        include: {
          taxCategory: true,
        },
        orderBy: [
          { effectiveFrom: 'desc' },
          { rate: 'asc' },
        ],
      }),
      this.prisma.taxRate.count({ where }),
    ]);

    return {
      data: taxRates,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const taxRate = await this.prisma.taxRate.findUnique({
      where: { id },
      include: {
        taxCategory: true,
      },
    });

    if (!taxRate) {
      throw new NotFoundException(`Tax rate with ID ${id} not found`);
    }

    return taxRate;
  }

  async update(id: string, updateTaxRateDto: UpdateTaxRateDto) {
    // Check if tax rate exists
    const existingTaxRate = await this.prisma.taxRate.findUnique({
      where: { id },
    });

    if (!existingTaxRate) {
      throw new NotFoundException(`Tax rate with ID ${id} not found`);
    }

    // If taxCategoryId is being updated, verify it exists
    if (updateTaxRateDto.taxCategoryId) {
      const taxCategory = await this.prisma.taxCategory.findUnique({
        where: { id: updateTaxRateDto.taxCategoryId },
      });

      if (!taxCategory) {
        throw new NotFoundException(`Tax category with ID ${updateTaxRateDto.taxCategoryId} not found`);
      }
    }

    return this.prisma.taxRate.update({
      where: { id },
      data: updateTaxRateDto,
      include: {
        taxCategory: true,
      },
    });
  }

  async remove(id: string) {
    // Check if tax rate exists
    const taxRate = await this.prisma.taxRate.findUnique({
      where: { id },
    });

    if (!taxRate) {
      throw new NotFoundException(`Tax rate with ID ${id} not found`);
    }

    return this.prisma.taxRate.delete({
      where: { id },
    });
  }
}
