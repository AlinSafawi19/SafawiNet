import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { WishlistService } from './wishlist.service';
import { WishlistItemDto } from './dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('Wishlist')
@Controller('me/wishlist')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  @ApiOperation({ summary: 'Get user wishlist (authenticated users)' })
  @ApiResponse({ status: 200, description: 'Wishlist retrieved successfully' })
  async getUserWishlist(
    @Request() req: any,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    return this.wishlistService.getUserWishlist(
      req.user.id,
      parseInt(page),
      parseInt(limit),
    );
  }

  @Post(':productId')
  @ApiOperation({ summary: 'Add product to wishlist (authenticated users)' })
  @ApiResponse({ status: 201, description: 'Product added to wishlist successfully' })
  @ApiResponse({ status: 409, description: 'Product already in wishlist' })
  async addToWishlist(
    @Param('productId') productId: string,
    @Request() req: any,
  ) {
    return this.wishlistService.addToWishlist(req.user.id, productId);
  }

  @Delete(':productId')
  @ApiOperation({ summary: 'Remove product from wishlist (authenticated users)' })
  @ApiResponse({ status: 200, description: 'Product removed from wishlist successfully' })
  async removeFromWishlist(
    @Param('productId') productId: string,
    @Request() req: any,
  ) {
    await this.wishlistService.removeFromWishlist(req.user.id, productId);
    return { message: 'Product removed from wishlist successfully' };
  }

  @Get('check/:productId')
  @ApiOperation({ summary: 'Check if product is in wishlist (authenticated users)' })
  @ApiResponse({ status: 200, description: 'Check completed successfully' })
  async checkWishlistStatus(
    @Param('productId') productId: string,
    @Request() req: any,
  ) {
    const isInWishlist = await this.wishlistService.isInWishlist(req.user.id, productId);
    return { isInWishlist };
  }
}
