import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';
import { WishlistItemDto } from './dto/wishlist-item.dto';

@Injectable()
export class WishlistService {
  constructor(private readonly prisma: PrismaService) {}

  async addToWishlist(userId: string, productId: string) {
    try {
      const wishlistItem = await this.prisma.wishlistItem.create({
        data: {
          userId,
          productId,
        },
        include: {
          product: {
            include: {
              media: true,
              variants: {
                include: {
                  prices: true,
                },
              },
            },
          },
        },
      });

      return wishlistItem;
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('Product is already in wishlist');
      }
      throw error;
    }
  }

  async removeFromWishlist(userId: string, productId: string) {
    const wishlistItem = await this.prisma.wishlistItem.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    if (!wishlistItem) {
      throw new NotFoundException('Wishlist item not found');
    }

    await this.prisma.wishlistItem.delete({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    return { message: 'Product removed from wishlist' };
  }

  async getUserWishlist(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    
    const [wishlistItems, total] = await Promise.all([
      this.prisma.wishlistItem.findMany({
        where: { userId },
        skip,
        take: limit,
        include: {
          product: {
            include: {
              media: true,
              variants: {
                include: {
                  prices: true,
                },
              },
              category: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.wishlistItem.count({
        where: { userId },
      }),
    ]);

    return {
      data: wishlistItems,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async isInWishlist(userId: string, productId: string): Promise<boolean> {
    const wishlistItem = await this.prisma.wishlistItem.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    return !!wishlistItem;
  }
}
