import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';
import { SearchFiltersDto } from './dto';

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

  async searchProducts(searchFilters: SearchFiltersDto) {
    const { page, limit, q, categoryId, categorySlug, minPrice, maxPrice, rating, sortBy, sortOrder, filters } = searchFilters;
    const skip = (page - 1) * limit;

    // Build where clause for products
    const where: any = {
      isActive: true,
    };

    // Full-text search using PostgreSQL text search
    if (q) {
      where.OR = [
        { name: { search: q } },
        { description: { search: q } },
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
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

    // Price filtering through variants and prices
    if (minPrice || maxPrice) {
      where.variants = {
        some: {
          isActive: true,
          prices: {
            some: {
              isActive: true,
              ...(minPrice && { amount: { gte: minPrice } }),
              ...(maxPrice && { amount: { lte: maxPrice } }),
            },
          },
        },
      };
    }

    // Rating filtering through reviews
    if (rating) {
      where.reviews = {
        some: {
          isApproved: true,
          isActive: true,
          rating: { gte: rating },
        },
      };
    }

    // Additional filters from JSON string
    if (filters) {
      try {
        const parsedFilters = JSON.parse(filters);
        if (parsedFilters.tags) {
          where.metadata = {
            path: ['tags'],
            array_contains: parsedFilters.tags,
          };
        }
        if (parsedFilters.brand) {
          where.metadata = {
            path: ['brand'],
            equals: parsedFilters.brand,
          };
        }
      } catch (error) {
        // Ignore invalid JSON filters
      }
    }

    // Build sort order
    let orderBy: any = {};
    if (sortBy === 'name') {
      orderBy.name = sortOrder;
    } else if (sortBy === 'createdAt') {
      orderBy.createdAt = sortOrder;
    } else if (sortBy === 'sortOrder') {
      orderBy.sortOrder = sortOrder;
    } else if (sortBy === 'price') {
      // Sort by minimum price
      orderBy.variants = {
        prices: {
          _min: {
            amount: sortOrder,
          },
        },
      };
    } else if (sortBy === 'rating') {
      // Sort by average rating
      orderBy.reviews = {
        _avg: {
          rating: sortOrder,
        },
      };
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
          category: true,
          variants: {
            where: { isActive: true },
            include: {
              prices: {
                where: { isActive: true, type: 'retail' },
                orderBy: { version: 'desc' },
                take: 1,
              },
            },
            orderBy: { sortOrder: 'asc' },
          },
          media: {
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
          },
          _count: {
            select: {
              reviews: {
                where: { isApproved: true, isActive: true },
              },
            },
          },
          reviews: {
            where: { isApproved: true, isActive: true },
            select: {
              rating: true,
            },
            take: 100, // Limit for average calculation
          },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    // Calculate average ratings and enrich product data
    const enrichedProducts = products.map(product => {
      const avgRating = product.reviews.length > 0
        ? product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length
        : 0;

      const minPrice = product.variants.length > 0
        ? Math.min(...product.variants
            .map(variant => variant.prices[0]?.amount || Infinity)
            .filter(price => price !== Infinity)
          )
        : null;

      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        category: product.category,
        variants: product.variants.map(variant => ({
          id: variant.id,
          sku: variant.sku,
          name: variant.name,
          weight: variant.weight,
          dimensions: variant.dimensions,
          price: variant.prices[0]?.amount || null,
          currency: variant.prices[0]?.currency || 'USD',
        })),
        media: product.media,
        avgRating: Math.round(avgRating * 10) / 10, // Round to 1 decimal place
        reviewCount: product._count.reviews,
        minPrice,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      };
    });

    return {
      data: enrichedProducts,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
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
    // Convert old params to new search format
    const searchFilters: SearchFiltersDto = {
      page: params.page,
      limit: params.limit,
      q: params.search,
      categoryId: params.categoryId,
      categorySlug: params.categorySlug,
      sortBy: params.sortBy as any,
      sortOrder: params.sortOrder,
    };

    return this.searchProducts(searchFilters);
  }

  async getProductBySlug(slug: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        slug,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        createdAt: true,
        updatedAt: true,
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
            prices: {
              where: { isActive: true, type: 'retail' },
              select: {
                amount: true,
                currency: true,
              },
              orderBy: { version: 'desc' },
              take: 1,
            },
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
        reviews: {
          where: { isApproved: true, isActive: true },
          select: {
            id: true,
            rating: true,
            title: true,
            content: true,
            createdAt: true,
            user: {
              select: {
                name: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: {
          select: {
            reviews: {
              where: { isApproved: true, isActive: true },
            },
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Calculate average rating
    const avgRating = product.reviews.length > 0
      ? product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length
      : 0;

    const minPrice = product.variants.length > 0
      ? Math.min(...product.variants
          .map(variant => variant.prices[0]?.amount || Infinity)
          .filter(price => price !== Infinity)
        )
      : null;

    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      category: product.category,
      variants: product.variants.map(variant => ({
        id: variant.id,
        sku: variant.sku,
        name: variant.name,
        description: variant.description,
        weight: variant.weight,
        dimensions: variant.dimensions,
        sortOrder: variant.sortOrder,
        price: variant.prices[0]?.amount || null,
        currency: variant.prices[0]?.currency || 'USD',
      })),
      media: product.media,
      reviews: product.reviews,
      avgRating: Math.round(avgRating * 10) / 10,
      reviewCount: product._count.reviews,
      minPrice,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  async getSearchFacets(searchFilters: SearchFiltersDto) {
    const { q, categoryId, categorySlug, minPrice, maxPrice, rating } = searchFilters;

    // Build base where clause (same as search)
    const where: any = {
      isActive: true,
    };

    if (q) {
      where.OR = [
        { name: { search: q } },
        { description: { search: q } },
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
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

    if (minPrice || maxPrice) {
      where.variants = {
        some: {
          isActive: true,
          prices: {
            some: {
              isActive: true,
              ...(minPrice && { amount: { gte: minPrice } }),
              ...(maxPrice && { amount: { lte: maxPrice } }),
            },
          },
        },
      };
    }

    if (rating) {
      where.reviews = {
        some: {
          isApproved: true,
          isActive: true,
          rating: { gte: rating },
        },
      };
    }

    // Get facet data
    const [categories, priceRange, ratingDistribution] = await Promise.all([
      // Category facets
      this.prisma.category.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          slug: true,
          _count: {
            select: {
              products: {
                where,
              },
            },
          },
        },
        orderBy: { name: 'asc' },
      }),
      // Price range facets
      this.prisma.price.aggregate({
        where: {
          isActive: true,
          type: 'retail',
          variant: {
            isActive: true,
            product: where,
          },
        },
        _min: {
          amount: true,
        },
        _max: {
          amount: true,
        },
      }),
      // Rating distribution
      this.prisma.productReview.groupBy({
        by: ['rating'],
        where: {
          isApproved: true,
          isActive: true,
          product: where,
        },
        _count: {
          rating: true,
        },
        orderBy: {
          rating: 'asc',
        },
      }),
    ]);

    return {
      categories: categories
        .filter(cat => cat._count.products > 0)
        .map(cat => ({
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          count: cat._count.products,
        })),
      priceRange: {
        min: priceRange._min.amount || 0,
        max: priceRange._max.amount || 0,
      },
      ratingDistribution: ratingDistribution.map(rating => ({
        rating: rating.rating,
        count: rating._count.rating,
      })),
    };
  }
}
