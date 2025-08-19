import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';
import { CreateTaxCategoryDto, UpdateTaxCategoryDto } from './dto';

@Injectable()
export class TaxCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createTaxCategoryDto: CreateTaxCategoryDto) {
    return this.prisma.taxCategory.create({
      data: createTaxCategoryDto,
      include: {
        rates: true,
        mappings: {
          include: {
            glAccount: true,
          },
        },
      },
    });
  }

  async findAll(params: {
    page?: number;
    limit?: number;
    isActive?: boolean;
  }) {
    const { page = 1, limit = 10, isActive } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (isActive !== undefined) where.isActive = isActive;

    const [taxCategories, total] = await Promise.all([
      this.prisma.taxCategory.findMany({
        where,
        skip,
        take: limit,
        include: {
          rates: true,
          mappings: {
            include: {
              glAccount: true,
            },
          },
        },
        orderBy: [
          { name: 'asc' },
        ],
      }),
      this.prisma.taxCategory.count({ where }),
    ]);

    return {
      data: taxCategories,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const taxCategory = await this.prisma.taxCategory.findUnique({
      where: { id },
      include: {
        rates: true,
        mappings: {
          include: {
            glAccount: true,
          },
        },
      },
    });

    if (!taxCategory) {
      throw new NotFoundException(`Tax category with ID ${id} not found`);
    }

    return taxCategory;
  }

  async update(id: string, updateTaxCategoryDto: UpdateTaxCategoryDto) {
    // Check if tax category exists
    const existingTaxCategory = await this.prisma.taxCategory.findUnique({
      where: { id },
    });

    if (!existingTaxCategory) {
      throw new NotFoundException(`Tax category with ID ${id} not found`);
    }

    return this.prisma.taxCategory.update({
      where: { id },
      data: updateTaxCategoryDto,
      include: {
        rates: true,
        mappings: {
          include: {
            glAccount: true,
          },
        },
      },
    });
  }

  async remove(id: string) {
    // Check if tax category exists
    const taxCategory = await this.prisma.taxCategory.findUnique({
      where: { id },
      include: {
        rates: true,
        mappings: true,
      },
    });

    if (!taxCategory) {
      throw new NotFoundException(`Tax category with ID ${id} not found`);
    }

    // Check if tax category has tax rates
    if (taxCategory.rates.length > 0) {
      throw new ConflictException('Cannot delete tax category with tax rates. Please delete tax rates first.');
    }

    // Check if tax category has tax mappings
    if (taxCategory.mappings.length > 0) {
      throw new ConflictException('Cannot delete tax category with tax mappings. Please remove tax mappings first.');
    }

    return this.prisma.taxCategory.delete({
      where: { id },
    });
  }
}
