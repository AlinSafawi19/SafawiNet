import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';

@Injectable()
export class StorefrontService {
  constructor(private readonly prisma: PrismaService) {}

  async getCategoryTree() {
    const categories = await this.prisma.category.findMany({
      where: { 
        isActive: true,
        parentId: null, // Get only root categories
      },
      include: {
        children: {
          where: { isActive: true },
          include: {
            children: {
              where: { isActive: true },
            },
            _count: {
              select: {
                products: {
                  where: { isActive: true },
                },
              },
            },
          },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        },
        _count: {
          select: {
            products: {
              where: { isActive: true },
            },
          },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    return categories.map(category => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      imageUrl: category.imageUrl,
      children: category.children.map(child => ({
        id: child.id,
        name: child.name,
        slug: child.slug,
        description: child.description,
        imageUrl: child.imageUrl,
        children: child.children.map(grandchild => ({
          id: grandchild.id,
          name: grandchild.name,
          slug: grandchild.slug,
          description: grandchild.description,
          imageUrl: grandchild.imageUrl,
        })),
        productCount: child._count?.products || 0,
      })),
      productCount: category._count?.products || 0,
    }));
  }

  async getProducts(params: {
    page: number;
    limit: number;
    search?: string;
    categoryId?: string;
    categorySlug?: string;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  }) {
    const { page, limit, search, categoryId, categorySlug, sortBy, sortOrder } = params;
    const skip = (page - 1) * limit;

    const where: any = {
      isActive: true,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (categorySlug) {
      where.category = {
        slug: categorySlug,
        isActive: true,
      };
    }

    // Build sort order
    let orderBy: any = {};
    if (sortBy === 'name') {
      orderBy.name = sortOrder;
    } else if (sortBy === 'createdAt') {
      orderBy.createdAt = sortOrder;
    } else if (sortBy === 'sortOrder') {
      orderBy.sortOrder = sortOrder;
    } else {
      orderBy = [{ sortOrder: 'asc' }, { name: 'asc' }];
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          variants: {
            where: { isActive: true },
            select: {
              id: true,
              sku: true,
              name: true,
              weight: true,
              dimensions: true,
            },
            orderBy: { sortOrder: 'asc' },
          },
          media: {
            where: { isActive: true },
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
      this.prisma.product.count({ where }),
    ]);

    return {
      data: products.map(product => ({
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        category: product.category,
        variants: product.variants,
        media: product.media,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getProductBySlug(slug: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        slug,
        isActive: true,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        variants: {
          where: { isActive: true },
          select: {
            id: true,
            sku: true,
            name: true,
            description: true,
            weight: true,
            dimensions: true,
            sortOrder: true,
          },
          orderBy: { sortOrder: 'asc' },
        },
        media: {
          where: { isActive: true },
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

    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      category: product.category,
      variants: product.variants,
      media: product.media,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }
}
