import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';
import { CreateProductDto, UpdateProductDto, ProductResponseDto } from './dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createProductDto: CreateProductDto): Promise<ProductResponseDto> {
    // Check if slug already exists
    const existingProduct = await this.prisma.product.findUnique({
      where: { slug: createProductDto.slug },
    });

    if (existingProduct) {
      throw new ConflictException('Product with this slug already exists');
    }

    // Verify category exists
    const category = await this.prisma.category.findUnique({
      where: { id: createProductDto.categoryId },
    });

    if (!category) {
      throw new BadRequestException('Category not found');
    }

    const product = await this.prisma.product.create({
      data: createProductDto,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        variants: {
          select: {
            id: true,
            sku: true,
            name: true,
            isActive: true,
          },
          orderBy: { sortOrder: 'asc' },
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

    return this.mapToResponseDto(product);
  }

  async findAll(params: {
    page: number;
    limit: number;
    search?: string;
    categoryId?: string;
    isActive?: boolean;
  }): Promise<{
    data: ProductResponseDto[];
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const { page, limit, search, categoryId, isActive } = params;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          variants: {
            select: {
              id: true,
              sku: true,
              name: true,
              isActive: true,
            },
            orderBy: { sortOrder: 'asc' },
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
          _count: {
            select: {
              variants: true,
              media: true,
            },
          },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: products.map(product => this.mapToResponseDto(product)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string): Promise<ProductResponseDto> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        variants: {
          select: {
            id: true,
            sku: true,
            name: true,
            isActive: true,
          },
          orderBy: { sortOrder: 'asc' },
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

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return this.mapToResponseDto(product);
  }

  async update(id: string, updateProductDto: UpdateProductDto): Promise<ProductResponseDto> {
    // Check if product exists
    const existingProduct = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      throw new NotFoundException('Product not found');
    }

    // If slug is being updated, check for conflicts
    if (updateProductDto.slug && updateProductDto.slug !== existingProduct.slug) {
      const slugConflict = await this.prisma.product.findUnique({
        where: { slug: updateProductDto.slug },
      });

      if (slugConflict) {
        throw new ConflictException('Product with this slug already exists');
      }
    }

    // If categoryId is being updated, verify it exists
    if (updateProductDto.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: updateProductDto.categoryId },
      });

      if (!category) {
        throw new BadRequestException('Category not found');
      }
    }

    const product = await this.prisma.product.update({
      where: { id },
      data: updateProductDto,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        variants: {
          select: {
            id: true,
            sku: true,
            name: true,
            isActive: true,
          },
          orderBy: { sortOrder: 'asc' },
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

    return this.mapToResponseDto(product);
  }

  async delete(id: string): Promise<void> {
    // Check if product exists and has variants
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            variants: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product._count.variants > 0) {
      throw new BadRequestException('Cannot delete product with variants');
    }

    await this.prisma.product.delete({
      where: { id },
    });
  }

  private mapToResponseDto(product: any): ProductResponseDto {
    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      categoryId: product.categoryId,
      isActive: product.isActive,
      sortOrder: product.sortOrder,
      metadata: product.metadata,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      category: product.category,
      variants: product.variants,
      media: product.media,
    };
  }
}
