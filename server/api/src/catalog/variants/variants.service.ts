import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';
import { CreateVariantDto, UpdateVariantDto, VariantResponseDto } from './dto';

@Injectable()
export class VariantsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createVariantDto: CreateVariantDto): Promise<VariantResponseDto> {
    // Check if SKU already exists
    const existingVariant = await this.prisma.productVariant.findUnique({
      where: { sku: createVariantDto.sku },
    });

    if (existingVariant) {
      throw new ConflictException('Variant with this SKU already exists');
    }

    // Verify product exists
    const product = await this.prisma.product.findUnique({
      where: { id: createVariantDto.productId },
    });

    if (!product) {
      throw new BadRequestException('Product not found');
    }

    const variant = await this.prisma.productVariant.create({
      data: createVariantDto,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        media: {
          select: {
            id: true,
            url: true,
            altText: true,
            type: true,
            sortOrder: true,
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    return this.mapToResponseDto(variant);
  }

  async findAll(params: {
    page: number;
    limit: number;
    search?: string;
    productId?: string;
    isActive?: boolean;
  }): Promise<{
    data: VariantResponseDto[];
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const { page, limit, search, productId, isActive } = params;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (productId) {
      where.productId = productId;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [variants, total] = await Promise.all([
      this.prisma.productVariant.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          media: {
            select: {
              id: true,
              url: true,
              altText: true,
              type: true,
              sortOrder: true,
            },
            orderBy: { sortOrder: 'asc' },
          },
        },
      }),
      this.prisma.productVariant.count({ where }),
    ]);

    return {
      data: variants.map(variant => this.mapToResponseDto(variant)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string): Promise<VariantResponseDto> {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        media: {
          select: {
            id: true,
            url: true,
            altText: true,
            type: true,
            sortOrder: true,
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!variant) {
      throw new NotFoundException('Variant not found');
    }

    return this.mapToResponseDto(variant);
  }

  async update(id: string, updateVariantDto: UpdateVariantDto): Promise<VariantResponseDto> {
    // Check if variant exists
    const existingVariant = await this.prisma.productVariant.findUnique({
      where: { id },
    });

    if (!existingVariant) {
      throw new NotFoundException('Variant not found');
    }

    // If SKU is being updated, check for conflicts
    if (updateVariantDto.sku && updateVariantDto.sku !== existingVariant.sku) {
      const skuConflict = await this.prisma.productVariant.findUnique({
        where: { sku: updateVariantDto.sku },
      });

      if (skuConflict) {
        throw new ConflictException('Variant with this SKU already exists');
      }
    }

    const variant = await this.prisma.productVariant.update({
      where: { id },
      data: updateVariantDto,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        media: {
          select: {
            id: true,
            url: true,
            altText: true,
            type: true,
            sortOrder: true,
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    return this.mapToResponseDto(variant);
  }

  async delete(id: string): Promise<void> {
    // Check if variant exists
    const variant = await this.prisma.productVariant.findUnique({
      where: { id },
    });

    if (!variant) {
      throw new NotFoundException('Variant not found');
    }

    await this.prisma.productVariant.delete({
      where: { id },
    });
  }

  private mapToResponseDto(variant: any): VariantResponseDto {
    return {
      id: variant.id,
      productId: variant.productId,
      sku: variant.sku,
      name: variant.name,
      description: variant.description,
      weight: variant.weight,
      dimensions: variant.dimensions,
      isActive: variant.isActive,
      sortOrder: variant.sortOrder,
      metadata: variant.metadata,
      createdAt: variant.createdAt,
      updatedAt: variant.updatedAt,
      product: variant.product,
      media: variant.media,
    };
  }
}
