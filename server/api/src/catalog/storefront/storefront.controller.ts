import {
  Controller,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { StorefrontService } from './storefront.service';
import { SearchFiltersDto } from './dto';

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

  @Get('search')
  @ApiOperation({ summary: 'Search products with advanced filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Search results retrieved successfully' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 12)' })
  @ApiQuery({ name: 'q', required: false, type: String, description: 'Search query' })
  @ApiQuery({ name: 'categoryId', required: false, type: String, description: 'Category ID filter' })
  @ApiQuery({ name: 'categorySlug', required: false, type: String, description: 'Category slug filter' })
  @ApiQuery({ name: 'minPrice', required: false, type: Number, description: 'Minimum price filter' })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number, description: 'Maximum price filter' })
  @ApiQuery({ name: 'rating', required: false, type: Number, description: 'Minimum rating filter' })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['name', 'createdAt', 'sortOrder', 'price', 'rating'], description: 'Sort field' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], description: 'Sort order' })
  @ApiQuery({ name: 'filters', required: false, type: String, description: 'JSON string of additional filters' })
  async searchProducts(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '12',
    @Query('q') q?: string,
    @Query('categoryId') categoryId?: string,
    @Query('categorySlug') categorySlug?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('rating') rating?: string,
    @Query('sortBy') sortBy: string = 'name',
    @Query('sortOrder') sortOrder: 'asc' | 'desc' = 'asc',
    @Query('filters') filters?: string,
  ) {
    const searchFilters: SearchFiltersDto = {
      page: parseInt(page),
      limit: parseInt(limit),
      q,
      categoryId,
      categorySlug,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      rating: rating ? parseInt(rating) : undefined,
      sortBy: sortBy as any,
      sortOrder,
      filters,
    };
    return this.storefrontService.searchProducts(searchFilters);
  }

  @Get('facets')
  @ApiOperation({ summary: 'Get search facets for filtering' })
  @ApiResponse({ status: 200, description: 'Facets retrieved successfully' })
  @ApiQuery({ name: 'q', required: false, type: String, description: 'Search query' })
  @ApiQuery({ name: 'categoryId', required: false, type: String, description: 'Category ID filter' })
  @ApiQuery({ name: 'categorySlug', required: false, type: String, description: 'Category slug filter' })
  @ApiQuery({ name: 'minPrice', required: false, type: Number, description: 'Minimum price filter' })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number, description: 'Maximum price filter' })
  @ApiQuery({ name: 'rating', required: false, type: Number, description: 'Minimum rating filter' })
  async getSearchFacets(
    @Query('q') q?: string,
    @Query('categoryId') categoryId?: string,
    @Query('categorySlug') categorySlug?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('rating') rating?: string,
  ) {
    const searchFilters: SearchFiltersDto = {
      page: 1,
      limit: 1,
      q,
      categoryId,
      categorySlug,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      rating: rating ? parseInt(rating) : undefined,
      sortBy: 'name',
      sortOrder: 'asc',
    };
    return this.storefrontService.getSearchFacets(searchFilters);
  }
}
