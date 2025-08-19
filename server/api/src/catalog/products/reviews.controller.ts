import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto, UpdateReviewDto, ReviewResponseDto } from './dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Product Reviews')
@Controller('storefront/products/:productId/reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  @ApiOperation({ summary: 'Get product reviews (public)' })
  @ApiResponse({ status: 200, description: 'Reviews retrieved successfully' })
  async getProductReviews(
    @Param('productId') productId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.reviewsService.getProductReviews(
      productId,
      parseInt(page),
      parseInt(limit),
    );
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a product review (authenticated users)' })
  @ApiResponse({ status: 201, description: 'Review created successfully' })
  @ApiResponse({ status: 403, description: 'Already reviewed this product' })
  async createReview(
    @Param('productId') productId: string,
    @Body() createReviewDto: CreateReviewDto,
    @Request() req: any,
  ) {
    return this.reviewsService.createReview(productId, req.user.id, createReviewDto);
  }

  @Delete(':reviewId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a review (own reviews only)' })
  @ApiResponse({ status: 200, description: 'Review deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - not your review' })
  async deleteReview(
    @Param('productId') productId: string,
    @Param('reviewId') reviewId: string,
    @Request() req: any,
  ) {
    await this.reviewsService.deleteReview(reviewId, req.user.id);
    return { message: 'Review deleted successfully' };
  }
}

@ApiTags('Admin Reviews')
@Controller('admin/reviews')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AdminReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get('pending')
  @Roles(Role.ADMIN, Role.MODERATOR)
  @ApiOperation({ summary: 'Get pending reviews for moderation (admin/moderator only)' })
  @ApiResponse({ status: 200, description: 'Pending reviews retrieved successfully' })
  async getPendingReviews(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    return this.reviewsService.getPendingReviews(parseInt(page), parseInt(limit));
  }

  @Put(':reviewId')
  @Roles(Role.ADMIN, Role.MODERATOR)
  @ApiOperation({ summary: 'Update review status (admin/moderator only)' })
  @ApiResponse({ status: 200, description: 'Review updated successfully' })
  async updateReview(
    @Param('reviewId') reviewId: string,
    @Body() updateReviewDto: UpdateReviewDto,
    @Request() req: any,
  ) {
    return this.reviewsService.updateReview(reviewId, updateReviewDto, req.user.id);
  }
}
