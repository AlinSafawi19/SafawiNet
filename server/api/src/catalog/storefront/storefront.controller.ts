import {
  Controller,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { StorefrontService } from './storefront.service';

@ApiTags('Storefront')
@Controller('storefront')
export class StorefrontController {
  constructor(private readonly storefrontService: StorefrontService) {}

  @Get('categories/tree')
  @ApiOperation({ summary: 'Get category tree for storefront' })
  @ApiResponse({ status: 200, description: 'Category tree retrieved successfully' })
  async getCategoryTree() {
    return this.storefrontService.getCategoryTree();
  }

  @Get('products')
  @ApiOperation({ summary: 'Get products for storefront with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Products retrieved successfully' })
  async getProducts(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '12',
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('categorySlug') categorySlug?: string,
    @Query('sortBy') sortBy: string = 'name',
    @Query('sortOrder') sortOrder: 'asc' | 'desc' = 'asc',
  ) {
    return this.storefrontService.getProducts({
      page: parseInt(page),
      limit: parseInt(limit),
      search,
      categoryId,
      categorySlug,
      sortBy,
      sortOrder,
    });
  }

  @Get('products/:slug')
  @ApiOperation({ summary: 'Get product by slug for storefront' })
  @ApiResponse({ status: 200, description: 'Product retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async getProductBySlug(@Param('slug') slug: string) {
    return this.storefrontService.getProductBySlug(slug);
  }
}
