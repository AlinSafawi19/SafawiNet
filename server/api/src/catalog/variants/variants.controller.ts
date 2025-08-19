import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../../auth/guards/roles.guard';
import { Role } from '@prisma/client';
import { VariantsService } from './variants.service';
import { CreateVariantDto, UpdateVariantDto, VariantResponseDto } from './dto';

@ApiTags('Product Variants')
@Controller('admin/catalog/variants')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class VariantsController {
  constructor(private readonly variantsService: VariantsService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a new product variant' })
  @ApiResponse({ status: 201, description: 'Variant created successfully', type: VariantResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 409, description: 'Variant with this SKU already exists' })
  async createVariant(@Body() createVariantDto: CreateVariantDto): Promise<VariantResponseDto> {
    return this.variantsService.create(createVariantDto);
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all variants with pagination' })
  @ApiResponse({ status: 200, description: 'Variants retrieved successfully' })
  async getAllVariants(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search?: string,
    @Query('productId') productId?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.variantsService.findAll({
      page: parseInt(page),
      limit: parseInt(limit),
      search,
      productId,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    });
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get variant by ID' })
  @ApiResponse({ status: 200, description: 'Variant retrieved successfully', type: VariantResponseDto })
  @ApiResponse({ status: 404, description: 'Variant not found' })
  async getVariantById(@Param('id') id: string): Promise<VariantResponseDto> {
    return this.variantsService.findById(id);
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update variant' })
  @ApiResponse({ status: 200, description: 'Variant updated successfully', type: VariantResponseDto })
  @ApiResponse({ status: 404, description: 'Variant not found' })
  @ApiResponse({ status: 409, description: 'Variant with this SKU already exists' })
  async updateVariant(
    @Param('id') id: string,
    @Body() updateVariantDto: UpdateVariantDto,
  ): Promise<VariantResponseDto> {
    return this.variantsService.update(id, updateVariantDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete variant' })
  @ApiResponse({ status: 204, description: 'Variant deleted successfully' })
  @ApiResponse({ status: 404, description: 'Variant not found' })
  async deleteVariant(@Param('id') id: string): Promise<void> {
    return this.variantsService.delete(id);
  }
}
