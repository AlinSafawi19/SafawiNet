import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';
import { CreateReviewDto, UpdateReviewDto, ReviewResponseDto } from './dto';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async createReview(productId: string, userId: string, createReviewDto: CreateReviewDto): Promise<ReviewResponseDto> {
    // Check if product exists
    const product = await this.prisma.product.findUnique({
      where: { id: productId, isActive: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Check if user already reviewed this product (optional - remove if users can review multiple times)
    const existingReview = await this.prisma.productReview.findFirst({
      where: { 
        userId,
        productId,
        isActive: true
      },
    });

    if (existingReview) {
      throw new ForbiddenException('You have already reviewed this product');
    }

    const review = await this.prisma.productReview.create({
      data: {
        productId,
        userId,
        rating: createReviewDto.rating,
        title: createReviewDto.title,
        content: createReviewDto.content,
      },
      include: {
        user: {
          select: {
            name: true,
          },
        },
      },
    });

    return this.mapToReviewResponse(review);
  }

  async getProductReviews(productId: string, page: number = 1, limit: number = 10): Promise<{
    data: ReviewResponseDto[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      this.prisma.productReview.findMany({
        where: {
          productId,
          isApproved: true,
          isActive: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              name: true,
            },
          },
        },
      }),
      this.prisma.productReview.count({
        where: {
          productId,
          isApproved: true,
          isActive: true,
        },
      }),
    ]);

    return {
      data: reviews.map(review => this.mapToReviewResponse(review)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getPendingReviews(page: number = 1, limit: number = 20): Promise<{
    data: ReviewResponseDto[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      this.prisma.productReview.findMany({
        where: {
          isApproved: false,
          isActive: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              name: true,
            },
          },
          product: {
            select: {
              name: true,
              slug: true,
            },
          },
        },
      }),
      this.prisma.productReview.count({
        where: {
          isApproved: false,
          isActive: true,
        },
      }),
    ]);

    return {
      data: reviews.map(review => this.mapToReviewResponse(review)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateReview(reviewId: string, updateReviewDto: UpdateReviewDto, moderatorId: string): Promise<ReviewResponseDto> {
    const review = await this.prisma.productReview.findUnique({
      where: { id: reviewId },
      include: {
        user: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    const updatedReview = await this.prisma.productReview.update({
      where: { id: reviewId },
      data: {
        ...updateReviewDto,
        ...(updateReviewDto.isApproved && {
          approvedBy: moderatorId,
          approvedAt: new Date(),
        }),
      },
      include: {
        user: {
          select: {
            name: true,
          },
        },
      },
    });

    return this.mapToReviewResponse(updatedReview);
  }

  async deleteReview(reviewId: string, userId: string): Promise<void> {
    const review = await this.prisma.productReview.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    // Only allow users to delete their own reviews
    if (review.userId !== userId) {
      throw new ForbiddenException('You can only delete your own reviews');
    }

    await this.prisma.productReview.delete({
      where: { id: reviewId },
    });
  }

  private mapToReviewResponse(review: any): ReviewResponseDto {
    const response = new ReviewResponseDto();
    response.id = review.id;
    response.productId = review.productId;
    response.userId = review.userId;
    response.userName = review.user?.name || 'Anonymous';
    response.rating = review.rating;
    response.title = review.title;
    response.content = review.content;
    response.isApproved = review.isApproved;
    response.isActive = review.isActive;
    response.createdAt = review.createdAt;
    response.updatedAt = review.updatedAt;
    return response;
  }
}
